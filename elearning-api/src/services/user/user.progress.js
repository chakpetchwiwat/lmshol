const prisma = require('../../utils/prisma');
const {
    ENROLLMENT_STATUS,
    QUIZ_ATTEMPT_STATUS
} = require('../../utils/constants/statuses');
const { POINT_SOURCE_TYPES } = require('../../utils/constants/ledger');
const {
    buildCourseVisibilityWhere,
    canAccessCourse,
    getVisibleCourseQuery
} = require('./user.visibility');
const certificateService = require('../admin/certificate.service');

const enrollCourse = async (userId, courseId) => {
    const userContext = await getVisibleCourseQuery(userId);
    const referenceDate = new Date();
    const course = await prisma.course.findFirst({
        where: {
            id: courseId,
            ...buildCourseVisibilityWhere(userContext, referenceDate)
        },
        include: {
            category: {
                include: {
                    departmentAccess: true,
                    tierAccess: {
                        include: {
                            tier: true
                        }
                    }
                }
            },
            departmentAccess: true,
            tierAccess: {
                include: {
                    tier: true
                }
            }
        }
    });

    if (!course || !canAccessCourse(course, userContext, referenceDate)) {
        throw new Error('Course not found');
    }

    const existing = await prisma.userCourse.findUnique({
        where: {
            userId_courseId: { userId, courseId }
        }
    });

    if (existing) {
        throw new Error('Already enrolled in this course');
    }

    return prisma.userCourse.create({
        data: {
            userId,
            courseId,
            status: ENROLLMENT_STATUS.IN_PROGRESS,
            progressPercent: 0
        }
    });
};

const updateLessonProgress = async (userId, lessonId, progress) => {
    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { course: true }
    });

    if (!lesson) {
        throw new Error('Lesson not found');
    }

    const enrollment = await prisma.userCourse.findUnique({
        where: {
            userId_courseId: {
                userId,
                courseId: lesson.courseId
            }
        }
    });

    if (!enrollment) {
        throw new Error('Not enrolled in this course');
    }

    if (progress === 100 && ['quiz', 'assessment'].includes(lesson.type)) {
        throw new Error('This lesson type must be completed by passing its required activity');
    }

    const isCompleted = progress === 100;
    const lessonProgress = await prisma.userLessonProgress.upsert({
        where: {
            userId_lessonId: {
                userId,
                lessonId
            }
        },
        update: {
            progress,
            lastSeenAt: new Date(),
            completedAt: isCompleted ? new Date() : null
        },
        create: {
            userId,
            lessonId,
            progress,
            completedAt: isCompleted ? new Date() : null
        }
    });

    if (isCompleted && enrollment.status !== ENROLLMENT_STATUS.COMPLETED) {
        const allLessons = await prisma.lesson.findMany({
            where: { courseId: lesson.courseId }
        });
        const completedLessons = await prisma.userLessonProgress.findMany({
            where: {
                userId,
                lessonId: { in: allLessons.map((item) => item.id) },
                progress: 100
            }
        });

        const newProgressPercent = Math.round((completedLessons.length / allLessons.length) * 100);
        const updateData = { progressPercent: newProgressPercent };

        if (newProgressPercent === 100) {
            updateData.status = ENROLLMENT_STATUS.COMPLETED;
            updateData.completedAt = new Date();

            if (lesson.course.points > 0) {
                const existingPoints = await prisma.pointsLedger.findFirst({
                    where: {
                        userId,
                        sourceType: POINT_SOURCE_TYPES.COURSE,
                        sourceId: lesson.courseId
                    }
                });

                if (!existingPoints) {
                    await prisma.pointsLedger.create({
                        data: {
                            userId,
                            sourceType: POINT_SOURCE_TYPES.COURSE,
                            sourceId: lesson.courseId,
                            points: lesson.course.points,
                            note: `Completed course: ${lesson.course.title}`
                        }
                    });
                }
            }
        }

        await prisma.userCourse.update({
            where: { id: enrollment.id },
            data: updateData
        });

        // Auto-issue certificate if 100%
        if (newProgressPercent === 100) {
            handleAutoCertificateIssuance(userId, lesson.courseId);
        }
    }

    return lessonProgress;
};

const completeLessonAndRefreshCourse = async (userId, lesson) => {
    const enrollment = await prisma.userCourse.findUnique({
        where: {
            userId_courseId: {
                userId,
                courseId: lesson.courseId
            }
        }
    });

    if (!enrollment) {
        throw new Error('Not enrolled in this course');
    }

    const previousProgress = prisma.userLessonProgress.findUnique
        ? await prisma.userLessonProgress.findUnique({
            where: {
                userId_lessonId: {
                    userId,
                    lessonId: lesson.id
                }
            }
        })
        : null;

    const wasAlreadyCompleted = previousProgress?.progress === 100;

    await prisma.userLessonProgress.upsert({
        where: {
            userId_lessonId: {
                userId,
                lessonId: lesson.id
            }
        },
        update: {
            progress: 100,
            lastSeenAt: new Date(),
            completedAt: previousProgress?.completedAt || new Date()
        },
        create: {
            userId,
            lessonId: lesson.id,
            progress: 100,
            completedAt: new Date()
        }
    });

    let earnedCoursePoints = 0;

    if (!wasAlreadyCompleted && enrollment.status !== ENROLLMENT_STATUS.COMPLETED) {
        const allLessons = await prisma.lesson.findMany({
            where: { courseId: lesson.courseId }
        });
        const completedLessons = await prisma.userLessonProgress.findMany({
            where: {
                userId,
                lessonId: { in: allLessons.map((item) => item.id) },
                progress: 100
            }
        });

        const newProgressPercent = Math.round((completedLessons.length / allLessons.length) * 100);
        const updateData = { progressPercent: newProgressPercent };

        if (newProgressPercent === 100) {
            updateData.status = ENROLLMENT_STATUS.COMPLETED;
            updateData.completedAt = new Date();

            if (lesson.course.points > 0) {
                const existingPoints = await prisma.pointsLedger.findFirst({
                    where: {
                        userId,
                        sourceType: POINT_SOURCE_TYPES.COURSE,
                        sourceId: lesson.courseId
                    }
                });

                if (!existingPoints) {
                    await prisma.pointsLedger.create({
                        data: {
                            userId,
                            sourceType: POINT_SOURCE_TYPES.COURSE,
                            sourceId: lesson.courseId,
                            points: lesson.course.points,
                            note: `Completed course: ${lesson.course.title}`
                        }
                    });
                    earnedCoursePoints = lesson.course.points;
                }
            }
        }

        await prisma.userCourse.update({
            where: { id: enrollment.id },
            data: updateData
        });

        if (newProgressPercent === 100) {
            handleAutoCertificateIssuance(userId, lesson.courseId);
        }
    }

    return {
        isCompleted: !wasAlreadyCompleted,
        earnedCoursePoints
    };
};

const submitQuiz = async (userId, lessonId, answers) => {
    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
            course: true,
            questions: {
                include: {
                    choices: true
                }
            }
        }
    });

    if (!lesson || lesson.type !== 'quiz') {
        throw new Error('Quiz not found');
    }

    let score = 0;
    let totalPoints = 0;
    const correctAnswers = {};

    lesson.questions.forEach((question) => {
        totalPoints += question.points;
        const userChoiceId = answers[question.id];
        const correctChoice = question.choices.find((choice) => choice.isCorrect);

        if (correctChoice) {
            correctAnswers[question.id] = correctChoice.id;

            if (correctChoice.id === userChoiceId) {
                score += question.points;
            }
        }
    });

    const passScore = lesson.passScore || 60;
    const scorePercent = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 100;
    const passed = scorePercent >= passScore;

    const previousPass = await prisma.quizAttempt.findFirst({
        where: {
            userId,
            lessonId,
            status: QUIZ_ATTEMPT_STATUS.PASSED
        }
    });

    const attempt = await prisma.quizAttempt.create({
        data: {
            userId,
            lessonId,
            score: scorePercent,
            status: passed ? QUIZ_ATTEMPT_STATUS.PASSED : QUIZ_ATTEMPT_STATUS.FAILED
        }
    });

    const isCompleted = passed && !previousPass;
    let earnedQuizPoints = 0;
    let earnedCoursePoints = 0;

    if (passed && lesson.points > 0) {
        const existingQuizPoints = await prisma.pointsLedger.findFirst({
            where: {
                userId,
                sourceType: POINT_SOURCE_TYPES.QUIZ,
                sourceId: lessonId
            }
        });

        if (!existingQuizPoints) {
            await prisma.pointsLedger.create({
                data: {
                    userId,
                    sourceType: POINT_SOURCE_TYPES.QUIZ,
                    sourceId: lessonId,
                    points: lesson.points,
                    note: `Passed quiz: ${lesson.title}`
                }
            });

            earnedQuizPoints = lesson.points;
        }
    }

    if (isCompleted) {
        const completion = await completeLessonAndRefreshCourse(userId, lesson);
        earnedCoursePoints = completion.earnedCoursePoints;
    }

    return {
        attempt,
        score,
        scorePercent,
        passed,
        isCompleted,
        passScore,
        correctAnswers,
        earnedQuizPoints,
        earnedCoursePoints,
        earnedPoints: earnedQuizPoints + earnedCoursePoints
    };
};

/**
 * Background helper to issue certificate on completion
 */
async function handleAutoCertificateIssuance(userId, courseId) {
    try {
        const cert = await certificateService.issueCertificate({
            courseId,
            userId,
            manual: false
        });

        console.log(`[Auto-Certificate] Issued ${cert.certificateNo} for user ${userId}`);

        // Trigger PDF generation in background
        certificateService.generateCertificatePdfAsync(cert.id).catch(err => {
            console.error(`[Auto-Certificate] PDF Generation failed for ${cert.id}:`, err);
        });
    } catch (error) {
        // Safe ignore for expected service blocks (manual mode, disabled, duplicate)
        const expectedErrors = ['requires manual', 'disabled', 'already has'];
        if (expectedErrors.some(msg => error.message.includes(msg))) {
            return;
        }

        console.error(`[Auto-Certificate] Failed for user ${userId} / course ${courseId}:`, error.message);
    }
}

module.exports = {
    enrollCourse,
    updateLessonProgress,
    submitQuiz,
    completeLessonAndRefreshCourse
};
