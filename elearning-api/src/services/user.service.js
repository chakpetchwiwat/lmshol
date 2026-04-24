const prisma = require('../utils/prisma');
const ErrorResponse = require('../utils/errorResponse');
const authHelpers = require('../utils/auth.helpers');
const {
    REWARD_STATUS,
    REDEEM_STATUS
} = require('../utils/constants/statuses');
const {
    DOCUMENT_ACCESS_TOKEN_TTL_SECONDS,
    getDocumentPreviewMeta,
    getDocumentUpstreamResponse,
    isProtectedAnnouncementDocument,
    isProtectedDocumentLesson,
    createDocumentAccessToken,
    verifyDocumentAccessToken
} = require('./user/user.documents');
const {
    buildAnnouncementVisibilityWhere,
    buildCategoryVisibilityWhere,
    buildCourseVisibilityWhere,
    canAccessAnnouncement,
    canAccessCourse,
    getVisibleCourseQuery
} = require('./user/user.visibility');
const {
    serializeAnnouncementDetail,
    serializeAnnouncementSummary,
    serializeCourseDetail,
    serializeCourseSummary
} = require('./user/user.serializers');
const { updateProfile } = require('./user/user.profile');
const {
    enrollCourse,
    updateLessonProgress,
    submitQuiz
} = require('./user/user.progress');
const { requestRedeem } = require('./user/user.rewards');

const getCourses = async (userId) => {
    const userContext = await getVisibleCourseQuery(userId);
    const referenceDate = new Date();
    const courses = await prisma.course.findMany({
        where: buildCourseVisibilityWhere(userContext, referenceDate),
        orderBy: [
            { isTemporary: 'desc' },
            { createdAt: 'desc' }
        ],
        include: {
            category: {
                include: {
                    departmentAccess: {
                        include: {
                            department: true
                        }
                    },
                    tierAccess: {
                        include: {
                            tier: true
                        }
                    }
                }
            },
            departmentAccess: {
                include: {
                    department: true
                }
            },
            tierAccess: {
                include: {
                    tier: true
                }
            },
            lessons: {
                select: {
                    type: true,
                    points: true
                }
            },
            enrollments: {
                where: { userId }
            }
        }
    });

    return courses
        .filter((course) => canAccessCourse(course, userContext, referenceDate))
        .map(serializeCourseSummary);
};

const getAnnouncements = async (userId) => {
    const userContext = await getVisibleCourseQuery(userId);
    const referenceDate = new Date();
    const announcements = await prisma.announcement.findMany({
        where: buildAnnouncementVisibilityWhere(userContext, referenceDate),
        include: {
            department: true,
            creator: {
                select: {
                    id: true,
                    name: true
                }
            },
            _count: {
                select: {
                    questions: true
                }
            }
        },
        orderBy: [
            { createdAt: 'desc' }
        ]
    });

    return announcements
        .filter((announcement) => canAccessAnnouncement(announcement, userContext, referenceDate))
        .map(serializeAnnouncementSummary);
};

const getCourseDetails = async (courseId, userId) => {
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
                    departmentAccess: {
                        include: {
                            department: true
                        }
                    },
                    tierAccess: {
                        include: {
                            tier: true
                        }
                    }
                }
            },
            departmentAccess: {
                include: {
                    department: true
                }
            },
            tierAccess: {
                include: {
                    tier: true
                }
            },
            lessons: {
                orderBy: { order: 'asc' },
                include: {
                    progress: {
                        where: { userId }
                    },
                    // Only send quiz metadata count, NOT full questions/choices
                    // Full questions are loaded separately in submitQuiz
                    _count: {
                        select: { questions: true }
                    },
                    quizAttempts: {
                        where: { userId },
                        orderBy: { score: 'desc' },
                        take: 1
                    }
                }
            },
            enrollments: {
                where: { userId }
            }
        }
    });

    if (!course || !canAccessCourse(course, userContext, referenceDate)) {
        return null;
    }

    return serializeCourseDetail(course);
};

const getAnnouncementDetails = async (announcementId, userId) => {
    const userContext = await getVisibleCourseQuery(userId);
    const referenceDate = new Date();
    const announcement = await prisma.announcement.findFirst({
        where: {
            id: announcementId,
            ...buildAnnouncementVisibilityWhere(userContext, referenceDate)
        },
        include: {
            department: true,
            creator: {
                select: {
                    id: true,
                    name: true
                }
            },
            _count: {
                select: {
                    questions: true
                }
            }
        }
    });

    if (!announcement || !canAccessAnnouncement(announcement, userContext, referenceDate)) {
        return null;
    }

    // Record attendance / view
    await prisma.announcementView.upsert({
        where: {
            userId_announcementId: {
                userId,
                announcementId
            }
        },
        update: {
            viewedAt: new Date()
        },
        create: {
            userId,
            announcementId,
            viewedAt: new Date()
        }
    });

    return serializeAnnouncementDetail(announcement);
};

const getLessonDocumentAccess = async (userId, lessonId) => {
    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: {
            id: true,
            courseId: true,
            type: true,
            contentUrl: true
        }
    });

    if (!lesson) {
        throw new ErrorResponse('Lesson not found', 404);
    }

    if (!isProtectedDocumentLesson(lesson)) {
        throw new ErrorResponse('Document not found for this lesson', 404);
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
        throw new ErrorResponse('You must enroll before opening this document', 403);
    }

    const token = createDocumentAccessToken({
        userId,
        resourceType: 'lesson',
        resourceId: lesson.id,
        contentUrl: lesson.contentUrl
    });
    const previewMeta = getDocumentPreviewMeta(lesson.contentUrl);

    return {
        lessonId: lesson.id,
        accessUrl: `/api/user/lessons/${lesson.id}/document-stream?token=${encodeURIComponent(token)}`,
        expiresIn: DOCUMENT_ACCESS_TOKEN_TTL_SECONDS,
        ...previewMeta
    };
};

const getLessonDocumentStream = async (lessonId, token) => {
    const documentAccessPayload = verifyDocumentAccessToken(token, {
        resourceType: 'lesson',
        resourceId: lessonId
    });
    return getDocumentUpstreamResponse(documentAccessPayload);
};

const getAnnouncementDocumentAccess = async (userId, announcementId) => {
    const userContext = await getVisibleCourseQuery(userId);
    const referenceDate = new Date();
    const announcement = await prisma.announcement.findFirst({
        where: {
            id: announcementId,
            ...buildAnnouncementVisibilityWhere(userContext, referenceDate)
        },
        select: {
            id: true,
            type: true,
            contentUrl: true,
            departmentId: true,
            status: true,
            expiredAt: true
        }
    });

    if (!announcement || !canAccessAnnouncement(announcement, userContext, referenceDate)) {
        throw new ErrorResponse('Announcement not found', 404);
    }

    if (!isProtectedAnnouncementDocument(announcement)) {
        throw new ErrorResponse('Document not found for this announcement', 404);
    }

    const token = createDocumentAccessToken({
        userId,
        resourceType: 'announcement',
        resourceId: announcement.id,
        contentUrl: announcement.contentUrl
    });
    const previewMeta = getDocumentPreviewMeta(announcement.contentUrl);

    return {
        announcementId: announcement.id,
        accessUrl: `/api/user/announcements/${announcement.id}/document-stream?token=${encodeURIComponent(token)}`,
        expiresIn: DOCUMENT_ACCESS_TOKEN_TTL_SECONDS,
        ...previewMeta
    };
};

const getAnnouncementDocumentStream = async (announcementId, token) => {
    const documentAccessPayload = verifyDocumentAccessToken(token, {
        resourceType: 'announcement',
        resourceId: announcementId
    });
    return getDocumentUpstreamResponse(documentAccessPayload);
};

const getPointsHistory = async (userId) => {
    const [ledger, aggregation] = await Promise.all([
        prisma.pointsLedger.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.pointsLedger.aggregate({
            where: { userId },
            _sum: { points: true }
        })
    ]);

    return {
        balance: aggregation._sum.points || 0,
        history: ledger
    };
};

const getRewardsData = async (userId) => {
    const rewards = await prisma.reward.findMany({
        where: { status: REWARD_STATUS.ACTIVE },
        orderBy: { pointsCost: 'asc' }
    });

    const userRequests = await prisma.redeemRequest.groupBy({
        by: ['rewardId'],
        where: {
            userId,
            status: {
                not: REDEEM_STATUS.REJECTED
            }
        },
        _count: {
            id: true
        }
    });

    const countMap = {};
    userRequests.forEach((request) => {
        countMap[request.rewardId] = request._count.id;
    });

    return rewards.map((reward) => ({
        ...reward,
        userRedeemedCount: countMap[reward.id] || 0
    }));
};

const getCategories = async (userId) => {
    const userContext = await getVisibleCourseQuery(userId);
    const referenceDate = new Date();
    const categories = await prisma.category.findMany({
        where: {
            AND: [
                buildCategoryVisibilityWhere(userContext, referenceDate),
                // Force-hide expired/archived categories even for admins in interest selection
                authHelpers.buildTimedVisibilityWhere({ referenceDate })
            ]
        },
        include: {
            departmentAccess: {
                include: {
                    department: true
                }
            },
            tierAccess: {
                include: {
                    tier: true
                }
            }
        },
        orderBy: [
            { isTemporary: 'desc' },
            { order: 'asc' }
        ]
    });

    return categories
        .filter((category) => authHelpers.canAccessEntity(userContext, category, referenceDate))
        .map((category) => ({
            ...category,
            departmentAccess: undefined,
            tierAccess: undefined
        }));
};

// Fetch quiz questions for a specific lesson (called only from LessonPlayer)
const getLessonQuestions = async (lessonId) => {
    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
            questions: {
                include: {
                    choices: {
                        select: {
                            id: true,
                            questionId: true,
                            text: true
                        }
                    }
                },
                orderBy: { order: 'asc' }
            }
        }
    });
    return lesson?.questions || [];
};

const getAnnouncementQuestions = async (announcementId, userId) => {
    const userContext = await getVisibleCourseQuery(userId);
    const referenceDate = new Date();
    const announcement = await prisma.announcement.findFirst({
        where: {
            id: announcementId,
            ...buildAnnouncementVisibilityWhere(userContext, referenceDate)
        },
        include: {
            questions: {
                include: {
                    choices: {
                        select: {
                            id: true,
                            questionId: true,
                            text: true
                        }
                    }
                },
                orderBy: { order: 'asc' }
            }
        }
    });

    if (!announcement || !canAccessAnnouncement(announcement, userContext, referenceDate)) {
        throw new Error('Announcement not found');
    }

    return announcement.questions || [];
};

const submitAnnouncementQuiz = async (userId, announcementId, answers) => {
    const userContext = await getVisibleCourseQuery(userId);
    const referenceDate = new Date();
    const announcement = await prisma.announcement.findFirst({
        where: {
            id: announcementId,
            ...buildAnnouncementVisibilityWhere(userContext, referenceDate)
        },
        include: {
            questions: {
                include: {
                    choices: true
                }
            }
        }
    });

    if (!announcement || !canAccessAnnouncement(announcement, userContext, referenceDate) || announcement.type !== 'quiz') {
        throw new Error('Announcement quiz not found');
    }

    let score = 0;
    let totalPoints = 0;
    const correctAnswers = {};

    announcement.questions.forEach((question) => {
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

    const passScore = announcement.passScore || 60;
    const scorePercent = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 100;
    const passed = scorePercent >= passScore;

    // Record quiz result in attendance
    await prisma.announcementView.upsert({
        where: {
            userId_announcementId: {
                userId,
                announcementId
            }
        },
        update: {
            score: scorePercent,
            passed: passed,
            updatedAt: new Date()
        },
        create: {
            userId,
            announcementId,
            score: scorePercent,
            passed: passed,
            viewedAt: new Date()
        }
    });

    return {
        score,
        scorePercent,
        passed,
        passScore,
        correctAnswers,
        earnedQuizPoints: 0,
        earnedCoursePoints: 0,
        earnedPoints: 0
    };
};

const getNotifications = async (userId) => {
    const now = new Date();
    const [notifications, unreadCount] = await Promise.all([
        prisma.userNotification.findMany({
            where: {
                userId,
                scheduledFor: {
                    lte: now
                }
            },
            include: {
                goal: {
                    select: {
                        id: true,
                        title: true,
                        status: true
                    }
                }
            },
            orderBy: [
                { readAt: 'asc' },
                { scheduledFor: 'desc' }
            ],
            take: 20
        }),
        prisma.userNotification.count({
            where: {
                userId,
                readAt: null,
                scheduledFor: {
                    lte: now
                }
            }
        })
    ]);

    return {
        unreadCount,
        items: notifications.map((notification) => ({
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            scheduledFor: notification.scheduledFor,
            readAt: notification.readAt,
            goalId: notification.goalId,
            actionUrl: notification.goalId ? `/user/goals/${notification.goalId}` : null,
            goal: notification.goal
        }))
    };
};

const markNotificationAsRead = async (userId, notificationId) => {
    await prisma.userNotification.updateMany({
        where: {
            id: notificationId,
            userId
        },
        data: {
            readAt: new Date()
        }
    });

    return getNotifications(userId);
};

const markAllNotificationsAsRead = async (userId) => {
    await prisma.userNotification.updateMany({
        where: {
            userId,
            readAt: null,
            scheduledFor: {
                lte: new Date()
            }
        },
        data: {
            readAt: new Date()
        }
    });

    return getNotifications(userId);
};

const clearAllNotifications = async (userId) => {
    await prisma.userNotification.deleteMany({
        where: {
            userId,
            scheduledFor: {
                lte: new Date()
            }
        }
    });

    return {
        unreadCount: 0,
        items: []
    };
};

module.exports = {
    getCourses,
    getAnnouncements,
    updateProfile,
    getCourseDetails,
    getAnnouncementDetails,
    enrollCourse,
    updateLessonProgress,
    submitQuiz,
    submitAnnouncementQuiz,
    getPointsHistory,
    getRewardsData,
    requestRedeem,
    getCategories,
    getLessonQuestions,
    getAnnouncementQuestions,
    getLessonDocumentAccess,
    getLessonDocumentStream,
    getAnnouncementDocumentAccess,
    getAnnouncementDocumentStream,
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications
};
