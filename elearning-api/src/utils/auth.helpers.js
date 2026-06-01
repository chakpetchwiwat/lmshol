const { USER_PERMISSIONS, ADMIN_PANEL_PERMISSIONS, MANAGED_USER_PERMISSIONS, USER_ROLES, ADMIN_PANEL_ROLES, MANAGED_USER_ROLES } = require('./constants/roles');
const { ENTITY_STATUS, GOAL_STATUS } = require('./constants/statuses');
const { GOAL_SCOPES } = require('./constants/scopes');

const isExpiredAt = (value, referenceDate = new Date()) => {
    if (!value) {
        return false;
    }

    const expiryDate = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(expiryDate.getTime())) {
        return false;
    }

    return expiryDate <= referenceDate;
};

const buildTimedVisibilityWhere = ({
    referenceDate = new Date(),
    expiresAtField = 'expiredAt',
    temporaryFlagField = 'isTemporary'
} = {}) => {
    const visibleTimeClauses = [
        { [expiresAtField]: null },
        { [expiresAtField]: { gt: referenceDate } }
    ];

    if (!temporaryFlagField) {
        return {
            OR: visibleTimeClauses
        };
    }

    return {
        OR: [
            { [temporaryFlagField]: false },
            ...visibleTimeClauses
        ]
    };
};

const isTimedEntityExpired = (
    entity,
    { referenceDate = new Date(), expiresAtField = 'expiredAt', temporaryFlagField = 'isTemporary' } = {}
) => {
    if (!entity) {
        return false;
    }

    if (temporaryFlagField && entity[temporaryFlagField] === false) {
        return false;
    }

    return isExpiredAt(entity[expiresAtField], referenceDate);
};

/**
 * Standardizes the user record into a clean object with consistent field names.
 * Used for mapping Prisma results to the format expected by the frontend/logic.
 */
const mapUserRecord = (user) => {
    if (!user) return null;
    const { departmentRef, tier, ...rest } = user;
    const resolvedPermission = rest.permission || rest.role;
    const isCourseStaff = (rest.courseStaff?.length || 0) > 0;
    const isSupervisor = (rest.cohortSupervisors?.length || 0) > 0 ||
        (rest.cohortRoleSupervisorRoles?.length || 0) > 0 ||
        (rest._count?.cohortSupervisors || 0) > 0 ||
        (rest._count?.cohortRoleSupervisorRoles || 0) > 0;

    return {
        ...rest,
        permission: resolvedPermission,
        role: resolvedPermission, // Compatibility alias
        departmentId: departmentRef?.id || rest.departmentId || null,
        department: departmentRef?.name || rest.department || null,
        tierId: tier?.id || rest.tierId || null,
        tier: tier ? {
            id: tier.id,
            name: tier.name,
            accessAdmin: tier.accessAdmin,
            order: tier.order
        } : null,
        employmentDate: rest.employmentDate || rest.createdAt,
        isCourseStaff,
        isSupervisor
    };
};

/**
 * Resolves the calling user's effective role and scope.
 * Handles tier-based admin access (e.g. Director tier granting panel access).
 */
const getActorContext = async (prisma, authUser) => {
    if (!authUser?.userId) {
        throw new Error('Authentication required');
    }

    const actor = await prisma.user.findUnique({
        where: { id: authUser.userId },
        include: {
            departmentRef: true,
            tier: true,
            cohortSupervisors: {
                take: 1,
                select: { supervisorId: true }
            },
            cohortRoleSupervisorRoles: {
                take: 1,
                select: { supervisorId: true }
            }
        }
    });

    if (!actor) {
        throw new Error('User not found');
    }

    // Permission resolution: Admin is always Admin. 
    // Manager stays Manager. 
    // User can become effective Manager if their Tier has accessAdmin: true.
    const actorPermission = actor.permission || actor.role;
    const isSupervisor = (actor.cohortSupervisors?.length || 0) > 0 ||
        (actor.cohortRoleSupervisorRoles?.length || 0) > 0;
    const effectivePermission = actorPermission === USER_PERMISSIONS.ADMIN
        ? USER_PERMISSIONS.ADMIN
        : (actorPermission === USER_PERMISSIONS.MANAGER || actor.tier?.accessAdmin || isSupervisor)
            ? USER_PERMISSIONS.MANAGER
            : USER_PERMISSIONS.USER;

    const mappedActor = {
        ...mapUserRecord(actor),
        effectivePermission,
        effectiveRole: effectivePermission, // Compatibility alias
        isAdmin: effectivePermission === USER_PERMISSIONS.ADMIN,
        isManager: effectivePermission === USER_PERMISSIONS.MANAGER,
        isSupervisor,
        canAccessAdminPanel: ADMIN_PANEL_PERMISSIONS.includes(effectivePermission)
    };

    // Strict validation for managers
    if (mappedActor.isManager && !mappedActor.departmentId && !mappedActor.isSupervisor) {
        throw new Error('Manager account must belong to a department to determine scope');
    }

    return mappedActor;
};

/**
 * Builds a Prisma 'where' clause for user management.
 * Admins can manage users and managers.
 * Managers can only manage users in their department.
 */
const buildUserManagementWhere = (actor, extraWhere = {}) => {
    if (actor.isAdmin) {
        return {
            permission: { in: MANAGED_USER_PERMISSIONS },
            ...extraWhere
        };
    }

    if (actor.isManager) {
        const scopeConditions = [];
        if (actor.departmentId) {
            scopeConditions.push({ departmentId: actor.departmentId });
        }
        if (actor.id || actor.userId) {
            scopeConditions.push({
                cohortSupervised: {
                    some: {
                        supervisorId: actor.id || actor.userId
                    }
                }
            });
        }

        return {
            permission: USER_PERMISSIONS.USER,
            OR: scopeConditions.length > 0 ? scopeConditions : [{ id: '__no_manager_scope__' }],
            ...extraWhere
        };
    }

    throw new Error('Unauthorized to manage users');
};

/**
 * Builds a Prisma 'where' clause for Course/Category visibility.
 * Admins see everything (all statuses).
 * End users (and managers) see only PUBLISHED and within scope.
 */
const buildVisibilityWhere = (actor, { status = ENTITY_STATUS.PUBLISHED, referenceDate = new Date() } = {}) => {
    // Temporary items visibility logic
    const temporaryWhere = buildTimedVisibilityWhere({ referenceDate });

    // Admin override: Bypass scope and status, but STILL honor timed visibility (archived/expired)
    // to ensure admins see a clean view in user-facing modules.
    if (actor.isAdmin) {
        return temporaryWhere;
    }

    const departmentConditions = [{ departmentAccess: { none: {} } }];
    if (actor.departmentId) {
        departmentConditions.push({
            departmentAccess: {
                some: {
                    departmentId: actor.departmentId
                }
            }
        });
    }

    const cohortConditions = [{ cohortRoleAccess: { none: {} } }];
    if (actor.roles && actor.roles.length > 0) {
        cohortConditions.push({
            cohortRoleAccess: {
                some: {
                    cohortRole: {
                        key: { in: actor.roles }
                    }
                }
            }
        });
    }

    return {
        AND: [
            status ? { status } : {},
            temporaryWhere,
            {
                OR: [
                    { visibleToAll: true },
                    {
                        visibleToAll: false,
                        AND: [
                            { OR: departmentConditions },
                            { OR: cohortConditions }
                        ]
                    }
                ]
            }
        ]
    };
};

/**
 * Granular check for single entity access.
 * Handles Tier hierarchy logic (higher rank users see lower rank required content).
 */
const canAccessEntity = (actor, entity, referenceDate = new Date()) => {
    if (!entity) return true;

    // 1. Temporary status check - Always check this even for admins to keep user views clean
    if (isTimedEntityExpired(entity, { referenceDate })) {
        return false;
    }

    if (actor.isAdmin) return true;

    // 2. Draft check for non-admins
    if (entity.status && entity.status !== ENTITY_STATUS.PUBLISHED) {
        return false;
    }

    if (entity.visibleToAll) {
        return true;
    }

    // 3. Department check
    const departmentAccess = entity.departmentAccess || [];
    const hasDeptAccess = departmentAccess.length === 0 || 
                         (actor.departmentId && departmentAccess.some(d => d.departmentId === actor.departmentId));
    
    if (!hasDeptAccess) return false;

    // 3b. Cohort Role check
    const cohortRoleAccess = entity.cohortRoleAccess || [];
    const hasCohortRoleAccess = cohortRoleAccess.length === 0 ||
                               (actor.roles && actor.roles.length > 0 && cohortRoleAccess.some(cra => {
                                   const roleKey = cra.cohortRole?.key || cra.cohortRoleKey;
                                   return actor.roles.includes(roleKey);
                               }));

    if (!hasCohortRoleAccess) return false;

    // 4. Tier hierarchy check
    const tierAccess = entity.tierAccess || [];
    if (tierAccess.length === 0) return true;

    const actorTierOrder = actor.tier?.order ?? 999;
    const requiredOrders = tierAccess
        .map(t => t.tier?.order)
        .filter(o => o !== undefined && o !== null);

    if (requiredOrders.length === 0) return true;

    // User rank (lower order) must be <= highest required rank (highest order value enabled)
    // Example: Content for Officer (Order 10). Manager (Order 2) can see it because 2 <= 10.
    return actorTierOrder <= Math.max(...requiredOrders);
};

const buildGoalVisibilityWhere = (
    actor,
    { referenceDate = new Date(), includeExpired = false, includeAllScopes = false } = {}
) => {
    const filters = [];

    if (!includeExpired) {
        filters.push({ status: GOAL_STATUS.ACTIVE });
    }

    if (!includeExpired) {
        filters.push(buildTimedVisibilityWhere({
            referenceDate,
            expiresAtField: 'expiryDate',
            temporaryFlagField: null
        }));
    }

    if (!(includeAllScopes && actor.isAdmin)) {
        const scopeClauses = [{ scope: GOAL_SCOPES.GLOBAL }];

        if (actor.departmentId) {
            scopeClauses.push({
                scope: GOAL_SCOPES.DEPARTMENT,
                departmentId: actor.departmentId
            });
            scopeClauses.push({
                targetDepartments: {
                    some: { departmentId: actor.departmentId }
                }
            });
        }

        const actorUserId = actor.id || actor.userId;
        if (actorUserId) {
            scopeClauses.push({
                targetUsers: {
                    some: { userId: actorUserId }
                }
            });
        }

        if (Array.isArray(actor.roles) && actor.roles.length > 0) {
            scopeClauses.push({
                targetCohortRoles: {
                    some: {
                        cohortRole: {
                            key: { in: actor.roles }
                        }
                    }
                }
            });
        }

        filters.push({
            OR: scopeClauses
        });
    }

    return filters.length === 1 ? filters[0] : { AND: filters };
};

const canAccessGoal = (
    actor,
    goal,
    { referenceDate = new Date(), includeExpired = false, includeAllScopes = false } = {}
) => {
    if (!goal) {
        return false;
    }

    if (!includeExpired && goal.status !== GOAL_STATUS.ACTIVE) {
        return false;
    }

    if (!includeExpired && isTimedEntityExpired(goal, {
        referenceDate,
        expiresAtField: 'expiryDate',
        temporaryFlagField: null
    })) {
        return false;
    }

    if (!(includeAllScopes && actor.isAdmin)) {
        const actorUserId = actor.id || actor.userId;
        const targetUsers = goal.targetUsers || [];
        const targetDepartments = goal.targetDepartments || [];
        const targetCohortRoles = goal.targetCohortRoles || [];

        if (targetUsers.length > 0) {
            return targetUsers.some((target) => target.userId === actorUserId);
        }

        if (targetCohortRoles.length > 0) {
            return targetCohortRoles.some((target) => {
                const roleKey = target.cohortRole?.key || target.roleKey || target.key;
                return roleKey && Array.isArray(actor.roles) && actor.roles.includes(roleKey);
            });
        }

        if (targetDepartments.length > 0) {
            return targetDepartments.some((target) => target.departmentId === actor.departmentId);
        }

        if (goal.scope === GOAL_SCOPES.DEPARTMENT && goal.departmentId !== actor.departmentId) {
            return false;
        }
    }

    return true;
};

module.exports = {
    getActorContext,
    mapUserRecord,
    buildUserManagementWhere,
    buildVisibilityWhere,
    canAccessEntity,
    buildGoalVisibilityWhere,
    canAccessGoal,
    buildTimedVisibilityWhere,
    isExpiredAt,
    isTimedEntityExpired,
    ADMIN_PANEL_ROLES,
    MANAGED_USER_ROLES
};
