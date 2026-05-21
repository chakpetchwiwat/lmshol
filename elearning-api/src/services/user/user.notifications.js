const prisma = require('../../utils/prisma');

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
            assessmentSubmissionId: notification.assessmentSubmissionId,
            actionUrl: notification.actionUrl || (notification.goalId ? `/user/goals/${notification.goalId}` : null),
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
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications
};
