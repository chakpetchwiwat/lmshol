const authHelpers = require('../../utils/auth.helpers');
const { ENROLLMENT_STATUS, ENTITY_STATUS, USER_STATUS } = require('../../utils/constants/statuses');
const { ANNOUNCEMENT_SCOPES } = require('../../utils/constants/scopes');

const courseInclude = {
    category: true,
    instructorPreset: true,
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
    cohortRoleAccess: {
        include: {
            cohortRole: true
        }
    },
    certificateSetting: true,
    _count: {
        select: {
            enrollments: true,
            lessons: true
        }
    }
};

const announcementInclude = {
    department: true,
    creator: {
        select: {
            id: true,
            name: true,
            email: true
        }
    },
    questions: {
        include: {
            choices: true
        },
        orderBy: {
            order: 'asc'
        }
    }
};

const userInclude = {
    departmentRef: true,
    tier: true,
    _count: {
        select: {
            enrollments: {
                where: {
                    status: ENROLLMENT_STATUS.COMPLETED
                }
            }
        }
    }
};

const categoryInclude = {
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
};

const buildDepartmentVisibleCourseWhere = (departmentId) => authHelpers.buildVisibilityWhere(
    { departmentId, isManager: true },
    { status: ENTITY_STATUS.PUBLISHED }
);

const buildScopedUserWhere = async (actor, targetUserId) => {
    const where = authHelpers.buildUserManagementWhere(actor);
    return {
        ...where,
        id: targetUserId
    };
};

const buildLearnerWhere = (departmentId = null) => ({
    status: USER_STATUS.ACTIVE,
    ...(departmentId ? { departmentId } : {})
});

const buildVisibleCourseWhereForDashboard = (departmentId = null) => (
    departmentId
        ? buildDepartmentVisibleCourseWhere(departmentId)
        : { status: ENTITY_STATUS.PUBLISHED }
);

const buildDateOverlapWhere = (start, end) => ({
    OR: [
        { startedAt: { gte: start, lte: end } },
        { completedAt: { gte: start, lte: end } }
    ]
});

const buildAnnouncementWhereForActor = (actor, extraWhere = {}) => (
    actor.isManager
        ? {
            OR: [
                { scope: ANNOUNCEMENT_SCOPES.GLOBAL },
                { departmentId: actor.departmentId }
            ],
            ...extraWhere
        }
        : extraWhere
);

module.exports = {
    courseInclude,
    announcementInclude,
    userInclude,
    categoryInclude,
    buildDepartmentVisibleCourseWhere,
    buildScopedUserWhere,
    buildLearnerWhere,
    buildVisibleCourseWhereForDashboard,
    buildDateOverlapWhere,
    buildAnnouncementWhereForActor
};
