const prisma = require('../utils/prisma');
const supabase = require('../config/supabase');
const { POINT_SOURCE_TYPES } = require('../utils/constants/ledger');
const { ASSESSMENT_SUBMISSION_STATUS } = require('../utils/constants/statuses');
const { completeLessonAndRefreshCourse } = require('./user/user.progress');
const { canManageCourse, COURSE_MANAGEMENT_ACCESS } = require('../utils/coursePermissions');

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

  const { data, error } = await supabase.storage
    .from('secure-documents')
    .createSignedUrl(submission.fileKey, 3600);

  if (error || !data?.signedUrl) {
    throw new Error(`Unable to create assessment download URL: ${error?.message || 'unknown error'}`);
  }

  return { url: data.signedUrl };
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
          points: true
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
  const status = result.passed
    ? ASSESSMENT_SUBMISSION_STATUS.PASSED
    : (data.needsRevision ? ASSESSMENT_SUBMISSION_STATUS.NEEDS_REVISION : ASSESSMENT_SUBMISSION_STATUS.FAILED);

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
          points: true
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
  gradeAssessmentSubmission,
  getAssessmentPassResult
};
