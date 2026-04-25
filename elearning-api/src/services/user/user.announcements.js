const prisma = require('../../utils/prisma');
const {
    buildAnnouncementVisibilityWhere,
    canAccessAnnouncement,
    getVisibleCourseQuery
} = require('./user.visibility');
const {
    serializeAnnouncementDetail,
    serializeAnnouncementSummary
} = require('./user.serializers');

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

module.exports = {
    getAnnouncements,
    getAnnouncementDetails,
    getAnnouncementQuestions,
    submitAnnouncementQuiz
};
