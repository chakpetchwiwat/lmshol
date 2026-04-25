const prisma = require('../../../utils/prisma');
const { ENROLLMENT_STATUS, GOAL_STATUS } = require('../../../utils/constants/statuses');
const { GOAL_SCOPES } = require('../../../utils/constants/scopes');

const buildAtRiskLearners = async ({ learnerWhere, scopeFilters, now, warningWindow }) => {
    const activeGoals = await prisma.learningGoal.findMany({
        where: {
            status: GOAL_STATUS.ACTIVE,
            expiryDate: {
                gte: now,
                lte: warningWindow
            },
            ...(scopeFilters.departmentId ? {
                OR: [
                    { scope: GOAL_SCOPES.GLOBAL },
                    { scope: GOAL_SCOPES.DEPARTMENT, departmentId: scopeFilters.departmentId }
                ]
            } : {})
        },
        select: {
            id: true,
            title: true,
            type: true,
            targetCount: true,
            expiryDate: true,
            createdAt: true,
            scope: true,
            departmentId: true,
            courses: {
                select: {
                    courseId: true
                }
            }
        },
        orderBy: [
            { expiryDate: 'asc' },
            { createdAt: 'desc' }
        ]
    });

    if (activeGoals.length === 0) {
        return [];
    }

    const targetUsers = await prisma.user.findMany({
        where: learnerWhere,
        select: {
            id: true,
            name: true,
            email: true,
            departmentId: true,
            department: true,
            departmentRef: {
                select: {
                    name: true
                }
            }
        }
    });

    if (targetUsers.length === 0) {
        return [];
    }

    const userIds = targetUsers.map((user) => user.id);
    const anyGoals = activeGoals.filter((goal) => goal.type === 'ANY');
    const specificGoals = activeGoals.filter((goal) => goal.type === 'SPECIFIC');
    const specificGoalCourseIds = [...new Set(
        specificGoals.flatMap((goal) => goal.courses.map((goalCourse) => goalCourse.courseId))
    )];

    const anyGoalDateRange = anyGoals.length > 0
        ? {
            start: anyGoals.reduce(
                (earliestDate, goal) => (goal.createdAt < earliestDate ? goal.createdAt : earliestDate),
                anyGoals[0].createdAt
            ),
            end: anyGoals.reduce((latestDate, goal) => {
                const goalEnd = goal.expiryDate || now;
                return goalEnd > latestDate ? goalEnd : latestDate;
            }, anyGoals[0].expiryDate || now)
        }
        : null;

    const completionFilters = [];

    if (anyGoalDateRange) {
        completionFilters.push({
            completedAt: {
                gte: anyGoalDateRange.start,
                lte: anyGoalDateRange.end
            }
        });
    }

    if (specificGoalCourseIds.length > 0) {
        completionFilters.push({
            courseId: {
                in: specificGoalCourseIds
            }
        });
    }

    if (completionFilters.length === 0) {
        return [];
    }

    const completions = await prisma.userCourse.findMany({
        where: {
            userId: { in: userIds },
            status: ENROLLMENT_STATUS.COMPLETED,
            OR: completionFilters
        },
        select: {
            userId: true,
            courseId: true,
            completedAt: true
        }
    });

    const userCompletionsMap = completions.reduce((collection, completion) => {
        if (!collection[completion.userId]) {
            collection[completion.userId] = [];
        }

        collection[completion.userId].push(completion);
        return collection;
    }, {});

    const usersByDepartmentId = targetUsers.reduce((collection, user) => {
        const departmentKey = user.departmentId || '__NO_DEPARTMENT__';
        if (!collection[departmentKey]) {
            collection[departmentKey] = [];
        }

        collection[departmentKey].push(user);
        return collection;
    }, {});

    const atRisk = [];

    activeGoals.forEach((goal) => {
        const goalCourses = new Set(goal.courses.map((goalCourse) => goalCourse.courseId));
        const eligibleUsers = goal.scope === GOAL_SCOPES.DEPARTMENT
            ? (usersByDepartmentId[goal.departmentId || '__NO_DEPARTMENT__'] || [])
            : targetUsers;

        eligibleUsers.forEach((user) => {
            const userCompletions = userCompletionsMap[user.id] || [];
            const validCompletions = userCompletions.filter((completion) => {
                if (goal.type === 'SPECIFIC') {
                    return goalCourses.has(completion.courseId);
                }

                return completion.completedAt >= goal.createdAt &&
                    (!goal.expiryDate || completion.completedAt <= goal.expiryDate);
            });

            if (validCompletions.length >= goal.targetCount) {
                return;
            }

            atRisk.push({
                userId: user.id,
                userName: user.name,
                email: user.email,
                department: user.departmentRef?.name || user.department || null,
                courseId: goal.id,
                goalId: goal.id,
                courseTitle: goal.title,
                deadline: goal.expiryDate,
                isOverdue: goal.expiryDate ? goal.expiryDate < now : false,
                score: null,
                gapCount: goal.targetCount - validCompletions.length
            });
        });
    });

    return atRisk
        .sort((left, right) => (left.deadline || 0) - (right.deadline || 0))
        .slice(0, 500);
};

module.exports = {
    buildAtRiskLearners
};
