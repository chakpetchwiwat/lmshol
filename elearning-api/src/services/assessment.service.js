const prisma = require('../utils/prisma');
const jwt = require('jsonwebtoken');
const EmailService = require('./email.service');
const { POINT_SOURCE_TYPES } = require('../utils/constants/ledger');
const { ASSESSMENT_SUBMISSION_STATUS } = require('../utils/constants/statuses');
const { completeLessonAndRefreshCourse } = require('./user/user.progress');
const { canManageCourse, COURSE_MANAGEMENT_ACCESS, isAdmin, isManager } = require('../utils/coursePermissions');

const clampNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

const normalizeOptionalText = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const ensureAssessmentLesson = async (lessonId) => {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: true }
  });

  if (!lesson || lesson.type !== 'assessment') {
    throw new Error('Assessment lesson not found');
  }

  return lesson;
};

const ensureEnrolled = async (userId, courseId) => {
  const enrollment = await prisma.userCourse.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId
      }
    }
  });

  if (!enrollment) {
    throw new Error('Not enrolled in this course');
  }

  return enrollment;
};

const getAssessmentPassResult = (lesson, score, maxScore) => {
  const normalizedMax = Math.max(clampNumber(maxScore, lesson.points || 10), 1);
  const normalizedScore = Math.max(0, Math.min(clampNumber(score, 0), normalizedMax));
  const scorePercent = Math.round((normalizedScore / normalizedMax) * 100);
  const passScore = lesson.passScore || 60;

  return {
    maxScore: normalizedMax,
    score: normalizedScore,
    scorePercent,
    passScore,
    passed: scorePercent >= passScore
  };
};

const getAssessmentNotificationCopy = ({ status, lessonTitle, courseTitle, score, maxScore }) => {
  const scoreText = score !== null && score !== undefined ? ` (${score}/${maxScore})` : '';

  if (status === ASSESSMENT_SUBMISSION_STATUS.PASSED) {
    return {
      title: 'ผลตรวจ Assessment ผ่านแล้ว',
      message: `งาน ${lessonTitle} ในคอร์ส ${courseTitle} ผ่านการตรวจแล้ว${scoreText}`
    };
  }

  if (status === ASSESSMENT_SUBMISSION_STATUS.NEEDS_REVISION) {
    return {
      title: 'Assessment ต้องแก้ไขเพิ่มเติม',
      message: `งาน ${lessonTitle} ในคอร์ส ${courseTitle} มีข้อเสนอแนะให้ปรับแก้${scoreText}`
    };
  }

  return {
    title: 'ผลตรวจ Assessment พร้อมแล้ว',
    message: `งาน ${lessonTitle} ในคอร์ส ${courseTitle} ได้รับการตรวจแล้ว${scoreText}`
  };
};

const serializeSubmission = (submission) => {
  if (!submission) return null;

  return {
    ...submission,
    user: submission.user ? {
      id: submission.user.id,
      name: submission.user.name,
      email: submission.user.email
    } : undefined,
    gradedBy: submission.gradedBy ? {
      id: submission.gradedBy.id,
      name: submission.gradedBy.name,
      email: submission.gradedBy.email
    } : undefined
  };
};

const getLatestSubmission = async (userId, lessonId) => prisma.assessmentSubmission.findFirst({
  where: { userId, lessonId },
  orderBy: { submittedAt: 'desc' },
  include: {
    gradedBy: {
      select: {
        id: true,
        name: true,
        email: true
      }
    }
  }
});

const submitAssessment = async (userId, lessonId, data = {}) => {
  const lesson = await ensureAssessmentLesson(lessonId);
  await ensureEnrolled(userId, lesson.courseId);

  const previousPass = await prisma.assessmentSubmission.findFirst({
    where: {
      userId,
      lessonId,
      status: ASSESSMENT_SUBMISSION_STATUS.PASSED
    }
  });

  if (previousPass) {
    throw new Error('This assessment has already been passed');
  }

  const activeSubmission = await prisma.assessmentSubmission.findFirst({
    where: {
      userId,
      lessonId,
      status: ASSESSMENT_SUBMISSION_STATUS.SUBMITTED
    }
  });

  if (activeSubmission) {
    throw new Error('This assessment is already waiting for review');
  }

  const fileKey = normalizeOptionalText(data.fileKey);
  const fileUrl = normalizeOptionalText(data.fileUrl);

  if (!fileKey && !fileUrl) {
    throw new Error('Assessment file is required');
  }

  const submission = await prisma.assessmentSubmission.create({
    data: {
      userId,
      lessonId,
      fileUrl,
      fileKey,
      fileName: normalizeOptionalText(data.fileName),
      fileMimeType: normalizeOptionalText(data.fileMimeType),
      note: normalizeOptionalText(data.note),
      maxScore: Math.max(clampNumber(data.maxScore, lesson.points || 10), 1),
      status: ASSESSMENT_SUBMISSION_STATUS.SUBMITTED
    },
    include: {
      gradedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  // Query student details for notification messages
  const student = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true }
  });

  // Query assigned course staff (owner, instructor, trainer)
  const staffList = await prisma.courseStaff.findMany({
    where: {
      courseId: lesson.courseId,
      role: { in: ['owner', 'instructor', 'trainer'] }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  if (staffList.length > 0) {
    const title = `มีการส่งงานใหม่ในวิชา ${lesson.course.title}`;
    const message = `คุณ ${student?.name || 'ผู้เรียน'} ได้ส่งงาน ${lesson.title} รอการตรวจประเมิน`;
    const baseDomain = process.env.FRONTEND_URL || 'http://localhost:3000';
    const actionUrl = `${baseDomain}/admin/assessments?courseId=${lesson.courseId}`;

    // 1. Create in-app notifications
    const notificationsData = staffList.map(staff => ({
      userId: staff.userId,
      assessmentSubmissionId: submission.id,
      type: 'ASSESSMENT_SUBMITTED',
      title,
      message,
      actionUrl: `/admin/assessments?courseId=${lesson.courseId}`, // Relative path for frontend routing
      scheduledFor: new Date()
    }));

    await prisma.userNotification.createMany({
      data: notificationsData
    }).catch(err => console.error('[NotificationService] Failed to create staff notifications:', err));

    // 2. Send email notifications
    const formattedDate = new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Bangkok'
    }).format(new Date());

    staffList.forEach(staff => {
      if (staff.user?.email) {
        EmailService.sendEmail({
          to: staff.user.email,
          subject: title,
          templateName: 'assessment_submitted',
          data: {
            staffName: staff.user.name,
            title,
            studentName: student?.name || 'ผู้เรียน',
            studentEmail: student?.email || '-',
            courseTitle: lesson.course.title,
            lessonTitle: lesson.title,
            submittedAt: formattedDate,
            note: submission.note || '-',
            actionUrl
          }
        }).catch(err => console.error('[EmailService] Async send to staff failed:', err));
      }
    });
  }

  return serializeSubmission(submission);
};

const getMyAssessmentSubmission = async (userId, lessonId) => {
  const lesson = await ensureAssessmentLesson(lessonId);
  await ensureEnrolled(userId, lesson.courseId);
  return serializeSubmission(await getLatestSubmission(userId, lessonId));
};

const getSubmissionDownloadUrl = async (actor, submissionId) => {
  const actorId = actor?.userId || actor?.id;
  const submission = await prisma.assessmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      lesson: {
        select: {
          courseId: true
        }
      }
    }
  });

  if (!submission) {
    throw new Error('Assessment submission not found');
  }

  if (submission.userId !== actorId) {
    const permission = await canManageCourse(actor, submission.lesson.courseId);
    const canReview = permission.access === COURSE_MANAGEMENT_ACCESS.FULL ||
      permission.access === COURSE_MANAGEMENT_ACCESS.LIMITED;

    if (!canReview) {
      throw new Error('Forbidden');
    }
  }

  if (submission.fileUrl) {
    return { url: submission.fileUrl };
  }

  if (!submission.fileKey) {
    throw new Error('No assessment file attached');
  }

  let cleanFileKey = submission.fileKey;
  if (cleanFileKey.startsWith('/uploads/')) {
    cleanFileKey = cleanFileKey.replace(/^\/uploads\//, '');
  } else if (cleanFileKey.startsWith('uploads/')) {
    cleanFileKey = cleanFileKey.replace(/^uploads\//, '');
  }

  if (!cleanFileKey.startsWith('secure/') && !cleanFileKey.startsWith('public/')) {
    cleanFileKey = 'secure/' + cleanFileKey;
  }

  const token = jwt.sign(
    { fileKey: cleanFileKey, originalName: submission.fileName || 'submission.zip' },
    process.env.JWT_SECRET,
    { expiresIn: 3600 }
  );
  const signedUrl = `/api/upload/secure/${token}`;

  return { url: signedUrl };
};

const listCourseAssessmentSubmissions = async (actor, courseId) => {
  const permission = await canManageCourse(actor, courseId);
  const canReview = permission.access === COURSE_MANAGEMENT_ACCESS.FULL ||
    permission.access === COURSE_MANAGEMENT_ACCESS.LIMITED;

  if (!canReview) {
    throw new Error('Forbidden');
  }

  const submissions = await prisma.assessmentSubmission.findMany({
    where: {
      lesson: {
        courseId,
        type: 'assessment'
      }
    },
    orderBy: [
      { status: 'asc' },
      { submittedAt: 'desc' }
    ],
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          passScore: true,
          points: true,
          courseId: true,
          course: {
            select: {
              id: true,
              title: true
            }
          }
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      gradedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  return submissions.map(serializeSubmission);
};

const listAllAssessmentSubmissions = async (actor, filters = {}) => {
  const userId = actor?.userId || actor?.id;
  const isUserFullAdmin = isAdmin(actor);

  const where = {
    lesson: {
      type: 'assessment'
    }
  };

  // If not full admin, restrict to courses they manage
  if (!isUserFullAdmin) {
    const isUserManager = isManager(actor);
    const managedCourses = await prisma.courseStaff.findMany({
      where: {
        userId,
        role: { in: ['owner', 'instructor', 'OWNER', 'INSTRUCTOR'] }
      },
      select: { courseId: true }
    });

    const managedCourseIds = managedCourses.map(c => c.courseId);

    // If user is a manager, also include courses from their department
    if (isUserManager) {
      const orConditions = [
        { visibleToAll: true },
        { departmentAccess: { none: {} } }
      ];

      if (actor?.departmentId) {
        orConditions.push({
          departmentAccess: {
            some: {
              departmentId: actor.departmentId
            }
          }
        });
      }

      const departmentCourses = await prisma.course.findMany({
        where: { OR: orConditions },
        select: { id: true }
      });

      departmentCourses.forEach(c => {
        if (!managedCourseIds.includes(c.id)) {
          managedCourseIds.push(c.id);
        }
      });
    }
    
    // If instructor/manager has no courses, they see nothing
    if (managedCourseIds.length === 0) {
      return [];
    }

    where.lesson.courseId = { in: managedCourseIds };
  }

  // Apply filters
  if (filters.courseId) {
    where.lesson.courseId = filters.courseId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.user = {
      name: { contains: filters.search, mode: 'insensitive' }
    };
  }

  const submissions = await prisma.assessmentSubmission.findMany({
    where,
    orderBy: [
      { status: 'asc' },
      { submittedAt: 'desc' }
    ],
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          passScore: true,
          points: true,
          course: {
            select: {
              id: true,
              title: true
            }
          }
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      gradedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    take: filters.limit ? parseInt(filters.limit) : 50,
    skip: filters.skip ? parseInt(filters.skip) : 0
  });

  return submissions.map(serializeSubmission);
};

const gradeAssessmentSubmission = async (actor, submissionId, data = {}) => {
  const actorId = actor?.userId || actor?.id;
  const existing = await prisma.assessmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      lesson: {
        include: {
          course: true
        }
      }
    }
  });

  if (!existing || existing.lesson.type !== 'assessment') {
    throw new Error('Assessment submission not found');
  }

  const permission = await canManageCourse(actor, existing.lesson.courseId);
  const canReview = permission.access === COURSE_MANAGEMENT_ACCESS.FULL ||
    permission.access === COURSE_MANAGEMENT_ACCESS.LIMITED;

  if (!canReview) {
    throw new Error('Forbidden');
  }

  const result = getAssessmentPassResult(existing.lesson, data.score, data.maxScore || existing.maxScore);
  const status = data.needsRevision
    ? ASSESSMENT_SUBMISSION_STATUS.NEEDS_REVISION
    : (result.passed ? ASSESSMENT_SUBMISSION_STATUS.PASSED : ASSESSMENT_SUBMISSION_STATUS.FAILED);

  const submission = await prisma.assessmentSubmission.update({
    where: { id: submissionId },
    data: {
      score: result.score,
      maxScore: result.maxScore,
      status,
      feedback: normalizeOptionalText(data.feedback),
      gradedById: actorId,
      gradedAt: new Date()
    },
    include: {
      lesson: {
        select: {
          id: true,
          title: true,
          passScore: true,
          points: true,
          courseId: true,
          course: {
            select: {
              id: true,
              title: true
            }
          }
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      gradedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  let completion = { isCompleted: false, earnedCoursePoints: 0 };
  if (result.passed) {
    completion = await completeLessonAndRefreshCourse(existing.userId, existing.lesson);
  }

  const notificationCopy = getAssessmentNotificationCopy({
    status,
    lessonTitle: submission.lesson.title,
    courseTitle: submission.lesson.course?.title || 'คอร์สของคุณ',
    score: submission.score,
    maxScore: submission.maxScore
  });

  await prisma.userNotification.create({
    data: {
      userId: existing.userId,
      assessmentSubmissionId: submission.id,
      type: 'ASSESSMENT_REVIEWED',
      title: notificationCopy.title,
      message: notificationCopy.message,
      actionUrl: `/user/courses/${submission.lesson.courseId}/lesson/${submission.lesson.id}?assessmentResult=${submission.id}`,
      scheduledFor: new Date(),
      emailSentAt: new Date()
    }
  });

  const isPassed = submission.status === ASSESSMENT_SUBMISSION_STATUS.PASSED;
  const isNeedsRevision = submission.status === ASSESSMENT_SUBMISSION_STATUS.NEEDS_REVISION;

  EmailService.sendEmail({
    to: submission.user.email,
    subject: notificationCopy.title,
    templateName: 'assessment_reviewed',
    data: {
      name: submission.user.name,
      title: notificationCopy.title,
      message: notificationCopy.message,
      courseTitle: submission.lesson.course?.title || 'คอร์สของคุณ',
      lessonTitle: submission.lesson.title,
      isPassed,
      isNeedsRevision,
      isFailed: !isPassed && !isNeedsRevision,
      score: submission.score,
      maxScore: submission.maxScore,
      feedback: submission.feedback,
      actionUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/user/courses/${submission.lesson.courseId}/lesson/${submission.lesson.id}?assessmentResult=${submission.id}`
    }
  }).catch(err => console.error('[EmailService] Async send failed:', err));

  return {
    submission: serializeSubmission(submission),
    ...result,
    status,
    isCompleted: completion.isCompleted,
    earnedCoursePoints: completion.earnedCoursePoints,
    earnedPoints: completion.earnedCoursePoints,
    sourceType: POINT_SOURCE_TYPES.COURSE
  };
};

module.exports = {
  submitAssessment,
  getMyAssessmentSubmission,
  getSubmissionDownloadUrl,
  listCourseAssessmentSubmissions,
  listAllAssessmentSubmissions,
  gradeAssessmentSubmission,
  getAssessmentPassResult
};
