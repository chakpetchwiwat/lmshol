const prisma = require('../utils/prisma');
const authHelpers = require('../utils/auth.helpers');
const ErrorResponse = require('../utils/errorResponse');
const { GOAL_STATUS, ENROLLMENT_STATUS, USER_STATUS } = require('../utils/constants/statuses');
const { GOAL_SCOPES } = require('../utils/constants/scopes');
const { DEFAULT_REMINDER_TIME, normalizeReminderTime, addThailandDays, subtractThailandDays } = require('../utils/thailandTime');

const GOAL_REPORT_CACHE_TTL_MS = Math.max(
    10000,
    Number.parseInt(process.env.GOAL_REPORT_CACHE_TTL_MS || '30000', 10) || 30000
);
const GOAL_REMINDER_DAY_OPTIONS = new Set([3, 7]);

const goalReportCache = new Map();

const normalizeReminderDays = (value, fieldLabel) => {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const parsedValue = Number.parseInt(value, 10);

    if (!GOAL_REMINDER_DAY_OPTIONS.has(parsedValue)) {
        throw new ErrorResponse(`${fieldLabel} must be 3 or 7 days`, 400);
    }

    return parsedValue;
};

const normalizeGoalReminderTime = (value, fieldLabel) => {
    try {
        return normalizeReminderTime(value);
    } catch (error) {
        throw new ErrorResponse(`${fieldLabel} must be in HH:mm format`, 400);
    }
};

const buildGoalTargetUsersWhere = (goal) => ({
    status: USER_STATUS.ACTIVE,
    ...(goal.scope === GOAL_SCOPES.DEPARTMENT && goal.departmentId
        ? { departmentId: goal.departmentId }
        : {})
});

const createGoalReminderNotifications = async (tx, goal, assignmentBaseDate = new Date()) => {
    const targetUsers = await tx.user.findMany({
        where: buildGoalTargetUsersWhere(goal),
        select: { id: true }
    });

    if (!targetUsers.length) {
        return;
    }

    const notifications = [];
    const now = new Date();

    if (goal.postAssignmentReminderDays) {
        const { date: scheduledFor } = addThailandDays(
            assignmentBaseDate,
            goal.postAssignmentReminderDays,
            goal.postAssignmentReminderTime || DEFAULT_REMINDER_TIME
        );

        notifications.push(...targetUsers.map((user) => ({
            userId: user.id,
            goalId: goal.id,
            type: 'GOAL_POST_ASSIGNMENT_REMINDER',
            title: 'มีการแจ้งเตือนเป้าหมายการเรียน',
            message: `เป้าหมาย "${goal.title}" ถูกมอบหมายให้คุณแล้ว กดเพื่อดูรายละเอียด`,
            scheduledFor
        })));
    }

    if (goal.preDeadlineReminderDays && goal.expiryDate) {
        const { date: preDeadlineDate } = subtractThailandDays(
            goal.expiryDate,
            goal.preDeadlineReminderDays,
            goal.preDeadlineReminderTime || DEFAULT_REMINDER_TIME
        );
        const scheduledFor = preDeadlineDate < now ? now : preDeadlineDate;

        notifications.push(...targetUsers.map((user) => ({
            userId: user.id,
            goalId: goal.id,
            type: 'GOAL_PRE_DEADLINE_REMINDER',
            title: 'เป้าหมายการเรียนใกล้ครบกำหนด',
            message: `เป้าหมาย "${goal.title}" จะครบกำหนดใน ${goal.preDeadlineReminderDays} วัน กดเพื่อดูเป้าหมายนี้`,
            scheduledFor
        })));
    }

    if (notifications.length > 0) {
        await tx.userNotification.createMany({
            data: notifications
        });
    }
};

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
    
    // Validate scope
    let finalScope = scope || GOAL_SCOPES.GLOBAL;
    let finalDeptId = departmentId || null;
    const finalPostAssignmentReminderDays = normalizeReminderDays(postAssignmentReminderDays, 'Post-assignment reminder');
    const normalizedPreDeadlineReminderDays = normalizeReminderDays(preDeadlineReminderDays, 'Pre-deadline reminder');
    const finalPreDeadlineReminderDays = expiryDate ? normalizedPreDeadlineReminderDays : null;
    const finalPostAssignmentReminderTime = finalPostAssignmentReminderDays
        ? normalizeGoalReminderTime(postAssignmentReminderTime, 'Post-assignment reminder time')
        : null;
    const finalPreDeadlineReminderTime = finalPreDeadlineReminderDays
        ? normalizeGoalReminderTime(preDeadlineReminderTime, 'Pre-deadline reminder time')
        : null;

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
    if (!goal) throw new Error('Goal not found');

    if (!actor.isAdmin && goal.departmentId !== actor.departmentId) {
        throw new Error('Not authorized to update this goal');
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
    const finalPostAssignmentReminderTime = postAssignmentReminderTime !== undefined
        ? (finalPostAssignmentReminderDays ? normalizeGoalReminderTime(postAssignmentReminderTime, 'Post-assignment reminder time') : null)
        : goal.postAssignmentReminderTime;
    const finalPreDeadlineReminderTime = preDeadlineReminderTime !== undefined
        ? (finalPreDeadlineReminderDays ? normalizeGoalReminderTime(preDeadlineReminderTime, 'Pre-deadline reminder time') : null)
        : (finalPreDeadlineReminderDays ? (goal.preDeadlineReminderTime || DEFAULT_REMINDER_TIME) : null);

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

        const specificGoalCourses = goal.courses
            .map((goalCourse) => ({
                courseId: goalCourse.courseId,
                title: goalCourse.course?.title || 'คอร์สถูกลบหรือไม่พร้อมใช้งาน'
            }));

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
                ? specificGoalCourses.map((goalCourse) => {
                    const enrollment = userEnrollments.find((item) => item.courseId === goalCourse.courseId);
                    return {
                        courseId: goalCourse.courseId,
                        title: goalCourse.title,
                        status: enrollment?.status || ENROLLMENT_STATUS.NOT_STARTED,
                        progressPercent: enrollment?.progressPercent || 0,
                        completedAt: enrollment?.completedAt || null
                    };
                })
                : completions.map((completion) => ({
                    courseId: completion.courseId,
                    title: completion.course?.title || 'คอร์สถูกลบหรือไม่พร้อมใช้งาน',
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
