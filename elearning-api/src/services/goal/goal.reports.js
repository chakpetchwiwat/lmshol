const prisma = require('../../utils/prisma');
const ErrorResponse = require('../../utils/errorResponse');
const { GOAL_SCOPES } = require('../../utils/constants/scopes');
const { USER_STATUS, ENROLLMENT_STATUS } = require('../../utils/constants/statuses');
const authHelpers = require('../../utils/auth.helpers');

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
            },
            targetDepartments: true,
            targetCohortRoles: {
                include: {
                    cohortRole: {
                        select: { key: true, name: true }
                    }
                }
            },
            targetUsers: true
        }
    });

    if (!goal) throw new ErrorResponse('Goal not found', 404);

    if (!authHelpers.canAccessGoal(actor, goal, { includeExpired: actor.canAccessAdminPanel, includeAllScopes: actor.isAdmin })) {
        throw new ErrorResponse('Goal not found', 404);
    }

    const cacheKey = getGoalReportCacheKey(goalId, actor, goal);

    return resolveGoalReportCache(cacheKey, async () => {
        let userWhere = { status: USER_STATUS.ACTIVE };

        if (goal.targetUsers.length > 0) {
            userWhere.id = { in: goal.targetUsers.map((target) => target.userId) };
        } else if (goal.targetCohortRoles.length > 0) {
            userWhere.roles = {
                hasSome: goal.targetCohortRoles
                    .map((target) => target.cohortRole?.key)
                    .filter(Boolean)
            };
        } else if (goal.targetDepartments.length > 0) {
            userWhere.departmentId = { in: goal.targetDepartments.map((target) => target.departmentId) };
        } else if (goal.scope === GOAL_SCOPES.DEPARTMENT) {
            userWhere.departmentId = goal.departmentId;
        }

        if (!actor.isAdmin && actor.departmentId) {
            userWhere.departmentId = actor.departmentId;
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
    getGoalReport,
    clearGoalReportCache
};
