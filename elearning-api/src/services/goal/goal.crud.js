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

const createGoal = async (data, authUser) => {
    const {
        title,
        type,
        targetCount,
        expiryDate,
        scope,
        departmentId,
        courseIds,
        postAssignmentReminderDays,
        preDeadlineReminderDays,
        postAssignmentReminderTime,
        preDeadlineReminderTime
    } = data;

    let finalScope = scope || GOAL_SCOPES.GLOBAL;
    let finalDeptId = departmentId || null;
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

    if (actor.isAdmin) {
        finalScope = scope || (actor?.departmentId ? GOAL_SCOPES.DEPARTMENT : GOAL_SCOPES.GLOBAL);
        finalDeptId = finalScope === GOAL_SCOPES.GLOBAL ? null : (departmentId || actor?.departmentId);
    } else {
        if (actor.departmentId) {
            finalScope = GOAL_SCOPES.DEPARTMENT;
            finalDeptId = actor.departmentId;
        } else {
            finalScope = GOAL_SCOPES.GLOBAL;
            finalDeptId = null;
        }
    }

    return await prisma.$transaction(async (tx) => {
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
                scope: finalScope,
                departmentId: finalDeptId,
                status: GOAL_STATUS.ACTIVE
            }
        });

        if (type === 'SPECIFIC' && courseIds && courseIds.length > 0) {
            await tx.goalCourse.createMany({
                data: courseIds.map(courseId => ({
                    goalId: goal.id,
                    courseId
                }))
            });
        }

        await createGoalReminderNotifications(tx, goal, goal.createdAt);

        return goal;
    });
};

const getGoals = async (authUser, options = {}) => {
    const actor = await authHelpers.getActorContext(prisma, authUser);
    const referenceDate = new Date();
    const includeExpired = Boolean(options.includeExpired && actor.canAccessAdminPanel);
    const includeAllScopes = Boolean(options.includeExpired && actor.isAdmin);
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

    let finalScope = goal.scope;
    let finalDeptId = goal.departmentId;
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

    if (actor.isAdmin) {
        if (scope) {
            finalScope = scope;
            finalDeptId = scope === GOAL_SCOPES.GLOBAL ? null : (departmentId || goal.departmentId);
        }
    }

    return await prisma.$transaction(async (tx) => {
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
                scope: finalScope,
                departmentId: finalDeptId
            }
        });

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

        await createGoalReminderNotifications(tx, updatedGoal, updatedGoal.updatedAt);

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
