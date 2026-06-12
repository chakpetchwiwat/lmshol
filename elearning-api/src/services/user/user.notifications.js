const prisma = require('../../utils/prisma');

const EMPTY_NOTIFICATIONS = {
    unreadCount: 0,
    items: []
};

const isOptionalDataUnavailableError = (error) => {
    return ['P2021', 'P2022', 'P1001', 'P1008'].includes(error?.code);
};

const returnEmptyNotificationsIfUnavailable = (error) => {
    if (isOptionalDataUnavailableError(error)) {
        console.warn('Notification data is unavailable; returning empty notifications.', {
            code: error.code,
            message: error.message
        });
        return EMPTY_NOTIFICATIONS;
    }

    throw error;
};

const getNotifications = async (userId) => {
    const now = new Date();
    try {
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
    } catch (error) {
        return returnEmptyNotificationsIfUnavailable(error);
    }
};

const markNotificationAsRead = async (userId, notificationId) => {
    try {
        await prisma.userNotification.updateMany({
            where: {
                id: notificationId,
                userId
            },
            data: {
                readAt: new Date()
            }
        });
    } catch (error) {
        return returnEmptyNotificationsIfUnavailable(error);
    }

    return getNotifications(userId);
};

const markAllNotificationsAsRead = async (userId) => {
    try {
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
    } catch (error) {
        return returnEmptyNotificationsIfUnavailable(error);
    }

    return getNotifications(userId);
};

const clearAllNotifications = async (userId) => {
    try {
        await prisma.userNotification.deleteMany({
            where: {
                userId,
                scheduledFor: {
                    lte: new Date()
                }
            }
        });
    } catch (error) {
        return returnEmptyNotificationsIfUnavailable(error);
    }

    return EMPTY_NOTIFICATIONS;
};

module.exports = {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications
};
