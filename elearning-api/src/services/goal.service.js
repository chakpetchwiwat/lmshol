const prisma = require('../utils/prisma');
const authHelpers = require('../utils/auth.helpers');
const ErrorResponse = require('../utils/errorResponse');
const { GOAL_STATUS, ENROLLMENT_STATUS, USER_STATUS } = require('../utils/constants/statuses');
const { GOAL_SCOPES } = require('../utils/constants/scopes');

const GOAL_REPORT_CACHE_TTL_MS = Math.max(
    10000,
    Number.parseInt(process.env.GOAL_REPORT_CACHE_TTL_MS || '30000', 10) || 30000
);

const goalReportCache = new Map();

const getGoalReportCacheKey = (goalId, actor, goal) => {
    const actorScope = actor.isAdmin ? 'admin' : (actor.departmentId || 'global');
    const updatedAt = goal.updatedAt instanceof Date ? goal.updatedAt.toISOString() : String(goal.updatedAt || 'none');
    const expiryDate = goal.expiryDate instanceof Date ? goal.expiryDate.toISOString() : String(goal.expiryDate || 'none');

    return `goal-report:${goalId}:${actorScope}:${goal.status}:${updatedAt}:${expiryDate}`;
};

const resolveGoalReportCache = async (cacheKey, loader) => {
    const cachedEntry = goalReportCache.get(cacheKey);

    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
        return cachedEntry.value;
    }

    if (cachedEntry?.promise) {
        return cachedEntry.promise;
    }

    const pending = Promise.resolve(loader())
        .then((value) => {
            goalReportCache.set(cacheKey, {
                value,
                expiresAt: Date.now() + GOAL_REPORT_CACHE_TTL_MS
            });
            return value;
        })
        .catch((error) => {
            goalReportCache.delete(cacheKey);
            throw error;
        });

    goalReportCache.set(cacheKey, {
        promise: pending,
        expiresAt: Date.now() + GOAL_REPORT_CACHE_TTL_MS
    });

    return pending;
};

const clearGoalReportCache = (goalId) => {
    const cachePrefix = `goal-report:${goalId}:`;

    for (const cacheKey of goalReportCache.keys()) {
        if (cacheKey.startsWith(cachePrefix)) {
            goalReportCache.delete(cacheKey);
        }
    }
};

const createGoal = async (data, authUser) => {
    const { title, type, targetCount, expiryDate, scope, departmentId, courseIds } = data;
    
    // Validate scope
    let finalScope = scope || GOAL_SCOPES.GLOBAL;
    let finalDeptId = departmentId || null;

    const actor = await authHelpers.getActorContext(prisma, authUser);

    if (actor.isAdmin) {
        finalScope = scope || (actor?.departmentId ? GOAL_SCOPES.DEPARTMENT : GOAL_SCOPES.GLOBAL);
        finalDeptId = finalScope === GOAL_SCOPES.GLOBAL ? null : (departmentId || actor?.departmentId);
    } else {
        // Manager or other fallback
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

    if (!authHelpers.canAccessGoal(actor, goal, { referenceDate })) {
        throw new ErrorResponse('Goal not found', 404);
    }

    return goal;
};

const archiveGoal = async (id, authUser) => {
    const actor = await authHelpers.getActorContext(prisma, authUser);
    const goal = await prisma.learningGoal.findUnique({ where: { id } });
    if (!goal) throw new Error('Goal not found');

    if (goal.departmentId !== null && goal.departmentId !== actor.departmentId) {
        throw new Error('Not authorized to archive this goal');
    }

    const updatedGoal = await prisma.learningGoal.update({
        where: { id },
        data: { status: GOAL_STATUS.ARCHIVED }
    });

    clearGoalReportCache(id);
    return updatedGoal;
};

const republishGoal = async (id, authUser) => {
    const actor = await authHelpers.getActorContext(prisma, authUser);
    const goal = await prisma.learningGoal.findUnique({ where: { id } });
    if (!goal) throw new Error('Goal not found');

    if (goal.departmentId !== null && goal.departmentId !== actor.departmentId) {
        throw new Error('Not authorized to recover this goal');
    }

    const updatedGoal = await prisma.learningGoal.update({
        where: { id },
        data: { 
            status: GOAL_STATUS.ACTIVE,
            expiryDate: null // Bringing it back to active usually means clearing the past expiry
        }
    });

    clearGoalReportCache(id);
    return updatedGoal;
};

const updateGoal = async (id, data, authUser) => {
    const { title, type, targetCount, expiryDate, scope, departmentId, courseIds } = data;
    const actor = await authHelpers.getActorContext(prisma, authUser);
    
    const goal = await prisma.learningGoal.findUnique({ where: { id } });
    if (!goal) throw new Error('Goal not found');

    if (!actor.isAdmin && goal.departmentId !== actor.departmentId) {
        throw new Error('Not authorized to update this goal');
    }

    let finalScope = goal.scope;
    let finalDeptId = goal.departmentId;

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

        clearGoalReportCache(id);
        return updatedGoal;
    });
};


const deleteGoal = async (id, authUser) => {
    const actor = await authHelpers.getActorContext(prisma, authUser);
    const goal = await prisma.learningGoal.findUnique({ where: { id } });
    if (!goal) throw new Error('Goal not found');

    if (goal.departmentId !== null && goal.departmentId !== actor.departmentId) {
        throw new Error('Not authorized to delete this goal');
    }

    const deletedGoal = await prisma.learningGoal.delete({
        where: { id }
    });

    clearGoalReportCache(id);
    return deletedGoal;
};

const getGoalReport = async (goalId, authUser) => {
    const actor = await authHelpers.getActorContext(prisma, authUser);
    const goal = await prisma.learningGoal.findUnique({
        where: { id: goalId },
        include: {
            courses: {
                include: {
                    course: {
                        select: {
                            id: true,
                            title: true
                        }
                    }
                }
            }
        }
    });

    if (!goal) throw new ErrorResponse('Goal not found', 404);

    if (!actor.isAdmin && goal.scope === GOAL_SCOPES.DEPARTMENT && goal.departmentId !== actor.departmentId) {
        throw new ErrorResponse('Goal not found', 404);
    }

    const cacheKey = getGoalReportCacheKey(goalId, actor, goal);

    return resolveGoalReportCache(cacheKey, async () => {
        let userWhere = { status: USER_STATUS.ACTIVE };
        if (goal.scope === GOAL_SCOPES.DEPARTMENT) {
            userWhere.departmentId = goal.departmentId;
        }

        const users = await prisma.user.findMany({
            where: userWhere,
            select: {
                id: true,
                name: true,
                email: true,
                departmentRef: { select: { name: true } }
            }
        });

        const windowStart = goal.createdAt;
        const windowEnd = goal.expiryDate || new Date();
        const userIds = users.map((user) => user.id);
        const courseIds = goal.courses.map((goalCourse) => goalCourse.courseId);

        let allEnrollments = [];

        if (userIds.length > 0 && (goal.type === 'ANY' || courseIds.length > 0)) {
            allEnrollments = await prisma.userCourse.findMany({
                where: {
                    userId: { in: userIds },
                    ...(goal.type === 'ANY'
                        ? {
                            OR: [
                                {
                                    status: ENROLLMENT_STATUS.COMPLETED,
                                    completedAt: { gte: windowStart, lte: windowEnd }
                                },
                                { status: ENROLLMENT_STATUS.IN_PROGRESS }
                            ]
                        }
                        : { courseId: { in: courseIds } })
                },
                select: {
                    userId: true,
                    courseId: true,
                    status: true,
                    progressPercent: true,
                    completedAt: true,
                    course: {
                        select: {
                            id: true,
                            title: true
                        }
                    }
                }
            });
        }

        const enrollmentsByUserId = allEnrollments.reduce((acc, curr) => {
            if (!acc[curr.userId]) {
                acc[curr.userId] = [];
            }
            acc[curr.userId].push(curr);
            return acc;
        }, {});

        const report = users.map((user) => {
            const userEnrollments = enrollmentsByUserId[user.id] || [];

            const completions = userEnrollments.filter((enrollment) =>
                enrollment.status === ENROLLMENT_STATUS.COMPLETED &&
                (goal.type === 'SPECIFIC' || (
                    enrollment.completedAt &&
                    enrollment.completedAt >= windowStart &&
                    enrollment.completedAt <= windowEnd
                ))
            );

            const inProgress = userEnrollments.filter((enrollment) => enrollment.status === ENROLLMENT_STATUS.IN_PROGRESS);
            const completionCount = completions.length;
            const isSuccess = completionCount >= goal.targetCount;

            let userStatus = ENROLLMENT_STATUS.NOT_STARTED;
            if (isSuccess) {
                userStatus = ENROLLMENT_STATUS.COMPLETED;
            } else if (completionCount > 0 || inProgress.length > 0) {
                userStatus = ENROLLMENT_STATUS.IN_PROGRESS;
            }

            const courseProgress = goal.type === 'SPECIFIC'
                ? goal.courses.map((goalCourse) => {
                    const enrollment = userEnrollments.find((item) => item.courseId === goalCourse.courseId);
                    return {
                        courseId: goalCourse.courseId,
                        title: goalCourse.course.title,
                        status: enrollment?.status || ENROLLMENT_STATUS.NOT_STARTED,
                        progressPercent: enrollment?.progressPercent || 0,
                        completedAt: enrollment?.completedAt || null
                    };
                })
                : completions.map((completion) => ({
                    courseId: completion.courseId,
                    title: completion.course.title,
                    status: ENROLLMENT_STATUS.COMPLETED,
                    progressPercent: 100,
                    completedAt: completion.completedAt
                }));

            return {
                userId: user.id,
                name: user.name,
                email: user.email,
                department: user.departmentRef?.name || '-',
                completionCount,
                targetCount: goal.targetCount,
                isSuccess,
                userStatus,
                courseProgress
            };
        });

        return {
            goal,
            report
        };
    });
};

module.exports = {
    createGoal,
    getGoals,
    getGoalDetails,
    archiveGoal,
    republishGoal,
    updateGoal,
    deleteGoal,
    getGoalReport
};
