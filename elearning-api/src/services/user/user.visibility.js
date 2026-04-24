const prisma = require('../../utils/prisma');
const authHelpers = require('../../utils/auth.helpers');
const { ENTITY_STATUS } = require('../../utils/constants/statuses');
const { ANNOUNCEMENT_SCOPES } = require('../../utils/constants/scopes');

const getUserVisibilityContext = (userId) => authHelpers.getActorContext(prisma, { userId });

const buildCategoryVisibilityWhere = (userContext, referenceDate = new Date()) => authHelpers.buildVisibilityWhere(userContext, { status: null, referenceDate });

const buildCourseVisibilityWhere = (userContext, referenceDate = new Date()) => authHelpers.buildVisibilityWhere(
    userContext,
    { status: ENTITY_STATUS.PUBLISHED, referenceDate }
);

const getVisibleCourseQuery = async (userId) => {
    return getUserVisibilityContext(userId);
};

const canAccessCourse = (course, userContext, referenceDate = new Date()) => {
    const category = course?.category;
    return authHelpers.canAccessEntity(userContext, category, referenceDate)
        && authHelpers.canAccessEntity(userContext, course, referenceDate);
};

const buildAnnouncementVisibilityWhere = (userContext, referenceDate = new Date()) => {
    if (userContext.isAdmin) {
        return {};
    }

    return {
        AND: [
            { status: ENTITY_STATUS.PUBLISHED },
            authHelpers.buildTimedVisibilityWhere({
                referenceDate,
                expiresAtField: 'expiredAt',
                temporaryFlagField: null
            }),
            {
                OR: [
                    { scope: ANNOUNCEMENT_SCOPES.GLOBAL },
                    userContext.departmentId
                        ? { departmentId: userContext.departmentId }
                        : { id: '__no_visible_specific_announcements__' }
                ]
            }
        ]
    };
};

const canAccessAnnouncement = (announcement, userContext, referenceDate = new Date()) => {
    if (!announcement) {
        return false;
    }

    if (userContext.isAdmin) {
        return true;
    }

    if (announcement.status !== ENTITY_STATUS.PUBLISHED) {
        return false;
    }

    if (authHelpers.isExpiredAt(announcement.expiredAt, referenceDate)) {
        return false;
    }

    if (announcement.scope === ANNOUNCEMENT_SCOPES.GLOBAL) {
        return true;
    }

    return !!userContext.departmentId && announcement.departmentId === userContext.departmentId;
};

module.exports = {
    buildAnnouncementVisibilityWhere,
    buildCategoryVisibilityWhere,
    buildCourseVisibilityWhere,
    canAccessAnnouncement,
    canAccessCourse,
    getUserVisibilityContext,
    getVisibleCourseQuery
};
