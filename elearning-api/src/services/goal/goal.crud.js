const prisma = require('../../utils/prisma');
const authHelpers = require('../../utils/auth.helpers');
const ErrorResponse = require('../../utils/errorResponse');
const { GOAL_STATUS } = require('../../utils/constants/statuses');
const { GOAL_SCOPES } = require('../../utils/constants/scopes');
const { DEFAULT_REMINDER_TIME } = require('../../utils/thailandTime');
const { 
    normalizeReminderDays, 
    normalizeGoalReminderTime, 
    createGoalReminderNotifications 
} = require('./goal.notifications');
const { clearGoalReportCache } = require('./goal.reports');

const normalizeIdList = (value) => (
    Array.isArray(value)
        ? [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))]
        : []
);

const resolveGoalAudience = async (tx, data, actor, existingGoal = null) => {
    const requestedScope = data.scope || existingGoal?.scope || GOAL_SCOPES.GLOBAL;
    let departmentIds = normalizeIdList(data.departmentIds);
    let cohortRoleIds = normalizeIdList(data.cohortRoleIds);
    let userIds = normalizeIdList(data.userIds);

    if (data.departmentId && departmentIds.length === 0) {
        departmentIds = [data.departmentId];
    }

    if (!actor.isAdmin) {
        departmentIds = actor.departmentId ? [actor.departmentId] : [];
        cohortRoleIds = [];
        if (userIds.length > 0 && actor.departmentId) {
            const scopedUsers = await tx.user.findMany({
                where: {
                    id: { in: userIds },
                    departmentId: actor.departmentId
                },
                select: { id: true }
            });
            userIds = scopedUsers.map((user) => user.id);
        } else {
            userIds = [];
        }
    }

    if (userIds.length > 0) {
        return {
            scope: GOAL_SCOPES.USER,
            departmentId: departmentIds[0] || actor.departmentId || existingGoal?.departmentId || null,
            departmentIds,
            cohortRoleIds: [],
            userIds
        };
    }

    if (cohortRoleIds.length > 0 && actor.isAdmin) {
        const matchedCount = await tx.cohortRole.count({
            where: {
                id: { in: cohortRoleIds }
            }
        });

        if (matchedCount !== cohortRoleIds.length) {
            throw new ErrorResponse('Invalid cohort role selection', 400);
        }

        return {
            scope: GOAL_SCOPES.COHORT_ROLE,
            departmentId: null,
            departmentIds: [],
            cohortRoleIds,
            userIds: []
        };
    }

    if (requestedScope === GOAL_SCOPES.GLOBAL && actor.isAdmin && departmentIds.length === 0) {
        return {
            scope: GOAL_SCOPES.GLOBAL,
            departmentId: null,
            departmentIds: [],
            cohortRoleIds: [],
            userIds: []
        };
    }

    if (departmentIds.length === 0 && (data.scope === undefined || requestedScope === GOAL_SCOPES.DEPARTMENT)) {
        departmentIds = actor.departmentId ? [actor.departmentId] : [];
    }

    return {
        scope: GOAL_SCOPES.DEPARTMENT,
        departmentId: departmentIds[0] || existingGoal?.departmentId || null,
        departmentIds,
        cohortRoleIds: [],
        userIds: []
    };
};

const saveGoalAudience = async (tx, goalId, audience) => {
    await tx.goalTargetDepartment.deleteMany({ where: { goalId } });
    await tx.goalTargetCohortRole.deleteMany({ where: { goalId } });
    await tx.goalTargetUser.deleteMany({ where: { goalId } });

    if (audience.departmentIds.length > 0) {
        await tx.goalTargetDepartment.createMany({
            data: audience.departmentIds.map((departmentId) => ({ goalId, departmentId })),
            skipDuplicates: true
        });
    }

    if (audience.userIds.length > 0) {
        await tx.goalTargetUser.createMany({
            data: audience.userIds.map((userId) => ({ goalId, userId })),
            skipDuplicates: true
        });
    }

    if (audience.cohortRoleIds.length > 0) {
        await tx.goalTargetCohortRole.createMany({
            data: audience.cohortRoleIds.map((cohortRoleId) => ({ goalId, cohortRoleId })),
            skipDuplicates: true
        });
    }
};

const createGoal = async (data, authUser) => {
    const {
        title,
        type,
        targetCount,
        expiryDate,
        scope,
        departmentId,
        departmentIds,
        cohortRoleIds,
        userIds,
        courseIds,
        postAssignmentReminderDays,
        preDeadlineReminderDays,
        postAssignmentReminderTime,
        preDeadlineReminderTime
    } = data;

    const finalPostAssignmentReminderDays = normalizeReminderDays(postAssignmentReminderDays, 'Post-assignment reminder');
    const normalizedPreDeadlineReminderDays = normalizeReminderDays(preDeadlineReminderDays, 'Pre-deadline reminder');
    const finalPreDeadlineReminderDays = expiryDate ? normalizedPreDeadlineReminderDays : null;
    const finalPostAssignmentReminderTime = finalPostAssignmentReminderDays !== null && finalPostAssignmentReminderDays !== 0
        ? normalizeGoalReminderTime(postAssignmentReminderTime, 'Post-assignment reminder time')
        : null;
    const finalPreDeadlineReminderTime = finalPreDeadlineReminderDays !== null
        ? normalizeGoalReminderTime(preDeadlineReminderTime, 'Pre-deadline reminder time')
        : null;

    const actor = await authHelpers.getActorContext(prisma, authUser);

    return await prisma.$transaction(async (tx) => {
        const audience = await resolveGoalAudience(tx, {
            scope,
            departmentId,
            departmentIds,
            cohortRoleIds,
            userIds
        }, actor);

        const goal = await tx.learningGoal.create({
            data: {
                title,
                type,
                targetCount: type === 'ANY' ? parseInt(targetCount) : (courseIds?.length || 1),
                expiryDate: expiryDate ? new Date(expiryDate) : null,
                postAssignmentReminderDays: finalPostAssignmentReminderDays,
                preDeadlineReminderDays: finalPreDeadlineReminderDays,
                postAssignmentReminderTime: finalPostAssignmentReminderTime,
                preDeadlineReminderTime: finalPreDeadlineReminderTime,
                scope: audience.scope,
                departmentId: audience.departmentId,
                status: GOAL_STATUS.ACTIVE
            }
        });

        await saveGoalAudience(tx, goal.id, audience);

        if (type === 'SPECIFIC' && courseIds && courseIds.length > 0) {
            await tx.goalCourse.createMany({
                data: courseIds.map(courseId => ({
                    goalId: goal.id,
                    courseId
                }))
            });
        }

        const targetCohortRoles = audience.cohortRoleIds.length > 0
            ? await tx.cohortRole.findMany({
                where: { id: { in: audience.cohortRoleIds } },
                select: { id: true, key: true }
            })
            : [];

        await createGoalReminderNotifications(tx, {
            ...goal,
            targetDepartments: audience.departmentIds.map((departmentId) => ({ departmentId })),
            targetCohortRoles: targetCohortRoles.map((cohortRole) => ({ cohortRoleId: cohortRole.id, cohortRole })),
            targetUsers: audience.userIds.map((userId) => ({ userId }))
        }, goal.createdAt);

        return goal;
    });
};

const getGoals = async (authUser, options = {}) => {
    const actor = await authHelpers.getActorContext(prisma, authUser);
    const referenceDate = new Date();
    const includeExpired = Boolean(options.includeExpired && actor.canAccessAdminPanel);
    const includeAllScopes = options.includeAllScopes !== undefined 
        ? Boolean(options.includeAllScopes && actor.isAdmin)
        : Boolean(options.includeExpired && actor.isAdmin);
    const where = authHelpers.buildGoalVisibilityWhere(actor, {
        referenceDate,
        includeExpired,
        includeAllScopes
    });

    return await prisma.learningGoal.findMany({
        where,
        include: {
            courses: {
                include: {
                    course: {
                        select: { id: true, title: true }
                    }
                }
            },
            department: {
                select: { name: true }
            },
            targetDepartments: {
                include: {
                    department: { select: { id: true, name: true } }
                }
            },
            targetCohortRoles: {
                include: {
                    cohortRole: { select: { id: true, key: true, name: true } }
                }
            },
            targetUsers: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            departmentId: true,
                            departmentRef: { select: { id: true, name: true } }
                        }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};

const getGoalDetails = async (id, authUser) => {
    const actor = await authHelpers.getActorContext(prisma, authUser);
    const referenceDate = new Date();

    const goal = await prisma.learningGoal.findUnique({
        where: { id },
        include: {
            courses: {
                include: {
                    course: {
                        include: {
                            category: { select: { name: true } }
                        }
                    }
                }
            },
            department: {
                select: { name: true }
            },
            targetDepartments: {
                include: {
                    department: { select: { id: true, name: true } }
                }
            },
            targetCohortRoles: {
                include: {
                    cohortRole: { select: { id: true, key: true, name: true } }
                }
            },
            targetUsers: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            departmentId: true,
                            departmentRef: { select: { id: true, name: true } }
                        }
                    }
                }
            }
        }
    });

    if (!authHelpers.canAccessGoal(actor, goal, { 
        referenceDate, 
        includeExpired: actor.canAccessAdminPanel,
        includeAllScopes: actor.isAdmin
    })) {
        throw new ErrorResponse('Goal not found', 404);
    }

    return goal;
};

const archiveGoal = async (id, authUser) => {
    const actor = await authHelpers.getActorContext(prisma, authUser);
    const goal = await prisma.learningGoal.findUnique({ where: { id } });
    if (!goal) throw new ErrorResponse('Goal not found', 404);

    if (!actor.isAdmin && goal.departmentId !== actor.departmentId) {
        throw new ErrorResponse('Not authorized to archive this goal', 403);
    }

    const updatedGoal = await prisma.learningGoal.update({
        where: { id },
        data: { status: GOAL_STATUS.ARCHIVED }
    });

    await prisma.userNotification.deleteMany({
        where: {
            goalId: id,
            readAt: null
        }
    });

    clearGoalReportCache(id);
    return updatedGoal;
};

const republishGoal = async (id, authUser) => {
    const actor = await authHelpers.getActorContext(prisma, authUser);
    const goal = await prisma.learningGoal.findUnique({ where: { id } });
    if (!goal) throw new ErrorResponse('Goal not found', 404);

    if (!actor.isAdmin && goal.departmentId !== actor.departmentId) {
        throw new ErrorResponse('Not authorized to recover this goal', 403);
    }

    const updatedGoal = await prisma.learningGoal.update({
        where: { id },
        data: {
            status: GOAL_STATUS.ACTIVE,
            expiryDate: null
        }
    });

    await prisma.userNotification.deleteMany({
        where: {
            goalId: id,
            readAt: null
        }
    });

    clearGoalReportCache(id);
    return updatedGoal;
};

const updateGoal = async (id, data, authUser) => {
    const {
        title,
        type,
        targetCount,
        expiryDate,
        scope,
        departmentId,
        departmentIds,
        cohortRoleIds,
        userIds,
        courseIds,
        postAssignmentReminderDays,
        preDeadlineReminderDays,
        postAssignmentReminderTime,
        preDeadlineReminderTime
    } = data;
    const actor = await authHelpers.getActorContext(prisma, authUser);

    const goal = await prisma.learningGoal.findUnique({ where: { id } });
    if (!goal) throw new ErrorResponse('Goal not found', 404);

    if (!actor.isAdmin && goal.departmentId !== actor.departmentId) {
        throw new ErrorResponse('Not authorized to update this goal', 403);
    }

    const finalPostAssignmentReminderDays = postAssignmentReminderDays !== undefined
        ? normalizeReminderDays(postAssignmentReminderDays, 'Post-assignment reminder')
        : goal.postAssignmentReminderDays;
    const nextExpiryDate = expiryDate !== undefined ? expiryDate : goal.expiryDate;
    const finalPreDeadlineReminderDays = preDeadlineReminderDays !== undefined
        ? (nextExpiryDate ? normalizeReminderDays(preDeadlineReminderDays, 'Pre-deadline reminder') : null)
        : goal.preDeadlineReminderDays;
    const finalPostAssignmentReminderTime = finalPostAssignmentReminderDays === null || finalPostAssignmentReminderDays === 0
        ? null
        : (postAssignmentReminderTime !== undefined
            ? normalizeGoalReminderTime(postAssignmentReminderTime, 'Post-assignment reminder time')
            : (goal.postAssignmentReminderTime || DEFAULT_REMINDER_TIME));
    const finalPreDeadlineReminderTime = preDeadlineReminderTime !== undefined
        ? (finalPreDeadlineReminderDays !== null ? normalizeGoalReminderTime(preDeadlineReminderTime, 'Pre-deadline reminder time') : null)
        : (finalPreDeadlineReminderDays !== null ? (goal.preDeadlineReminderTime || DEFAULT_REMINDER_TIME) : null);

    return await prisma.$transaction(async (tx) => {
        const audience = await resolveGoalAudience(tx, {
            scope,
            departmentId,
            departmentIds,
            cohortRoleIds,
            userIds
        }, actor, goal);

        const updatedGoal = await tx.learningGoal.update({
            where: { id },
            data: {
                title: title !== undefined ? title : goal.title,
                type: type !== undefined ? type : goal.type,
                targetCount: type === 'ANY' ? parseInt(targetCount) : (courseIds?.length || goal.targetCount),
                expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : goal.expiryDate,
                postAssignmentReminderDays: finalPostAssignmentReminderDays,
                preDeadlineReminderDays: finalPreDeadlineReminderDays,
                postAssignmentReminderTime: finalPostAssignmentReminderTime,
                preDeadlineReminderTime: finalPreDeadlineReminderTime,
                scope: audience.scope,
                departmentId: audience.departmentId
            }
        });

        await saveGoalAudience(tx, id, audience);

        if (courseIds && (type === 'SPECIFIC' || (type === undefined && goal.type === 'SPECIFIC'))) {
            await tx.goalCourse.deleteMany({ where: { goalId: id } });
            await tx.goalCourse.createMany({
                data: courseIds.map(courseId => ({
                    goalId: id,
                    courseId
                }))
            });
        }

        await tx.userNotification.deleteMany({
            where: {
                goalId: id,
                readAt: null
            }
        });

        const targetCohortRoles = audience.cohortRoleIds.length > 0
            ? await tx.cohortRole.findMany({
                where: { id: { in: audience.cohortRoleIds } },
                select: { id: true, key: true }
            })
            : [];

        await createGoalReminderNotifications(tx, {
            ...updatedGoal,
            targetDepartments: audience.departmentIds.map((departmentId) => ({ departmentId })),
            targetCohortRoles: targetCohortRoles.map((cohortRole) => ({ cohortRoleId: cohortRole.id, cohortRole })),
            targetUsers: audience.userIds.map((userId) => ({ userId }))
        }, updatedGoal.updatedAt);

        clearGoalReportCache(id);
        return updatedGoal;
    });
};

const deleteGoal = async (id, authUser) => {
    const actor = await authHelpers.getActorContext(prisma, authUser);
    const goal = await prisma.learningGoal.findUnique({ where: { id } });
    if (!goal) throw new ErrorResponse('Goal not found', 404);

    if (!actor.isAdmin && goal.departmentId !== actor.departmentId) {
        throw new ErrorResponse('Not authorized to delete this goal', 403);
    }

    const deletedGoal = await prisma.learningGoal.delete({
        where: { id }
    });

    clearGoalReportCache(id);
    return deletedGoal;
};

module.exports = {
    createGoal,
    getGoals,
    getGoalDetails,
    archiveGoal,
    republishGoal,
    updateGoal,
    deleteGoal
};
