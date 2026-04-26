const prisma = require('../../../utils/prisma');
const { ENROLLMENT_STATUS } = require('../../../utils/constants/statuses');
const { GOAL_SCOPES } = require('../../../utils/constants/scopes');

/**
 * Calculates goal compliance for a set of users and goals.
 * 
 * @param {Array} targetUsers - List of users with departmentId
 * @param {Array} activeGoals - List of learning goals with courses
 * @param {Array} completions - List of user completions
 * @param {Date} now - Current timestamp for overdue checks
 * @returns {Object} { totalAssignments, successfulAssignments, atRisk }
 */
const calculateGoalCompliance = (targetUsers, activeGoals, completions, now = new Date()) => {
    const userCompletionsMap = completions.reduce((acc, completion) => {
        if (!acc[completion.userId]) acc[completion.userId] = [];
        acc[completion.userId].push(completion);
        return acc;
    }, {});

    const usersByDept = targetUsers.reduce((acc, user) => {
        const deptId = user.departmentId || '__NONE__';
        if (!acc[deptId]) acc[deptId] = [];
        acc[deptId].push(user.id);
        return acc;
    }, {});

    const allUserIds = targetUsers.map(u => u.id);
    let totalAssignments = 0;
    let successfulAssignments = 0;
    const atRisk = [];

    activeGoals.forEach(goal => {
        const targetUserIdsForGoal = goal.scope === GOAL_SCOPES.GLOBAL
            ? allUserIds
            : (usersByDept[goal.departmentId] || []);

        if (targetUserIdsForGoal.length === 0) return;

        const goalCourseIds = new Set(goal.courses.map(c => c.courseId));
        
        targetUserIdsForGoal.forEach(userId => {
            totalAssignments++;
            const userCompletions = userCompletionsMap[userId] || [];
            
            const validCompletions = userCompletions.filter((completion) => {
                if (goal.type === 'SPECIFIC') {
                    return goalCourseIds.has(completion.courseId);
                }

                // For 'ANY' goals, completion must be after goal creation
                return completion.completedAt >= goal.createdAt
                    && (!goal.expiryDate || completion.completedAt <= goal.expiryDate);
            });

            const isGoalMet = validCompletions.length >= goal.targetCount;

            if (isGoalMet) {
                successfulAssignments++;
            } else {
                // If goal is not met, and it's near expiry or overdue, it's "at risk"
                const user = targetUsers.find(u => u.id === userId);
                atRisk.push({
                    userId,
                    userName: user?.name || '-',
                    email: user?.email || null,
                    department: user?.departmentRef?.name || user?.department || null,
                    goalId: goal.id,
                    goalTitle: goal.title,
                    deadline: goal.expiryDate,
                    isOverdue: goal.expiryDate ? goal.expiryDate < now : false,
                    gapCount: goal.targetCount - validCompletions.length
                });
            }
        });
    });

    return {
        totalAssignments,
        successfulAssignments,
        atRisk
    };
};

/**
 * Builds the necessary completion filters for a set of goals.
 */
const buildGoalCompletionFilters = (activeGoals, now = new Date()) => {
    const anyGoals = activeGoals.filter((goal) => goal.type === 'ANY');
    const specificGoalCourseIds = [...new Set(
        activeGoals
            .filter((goal) => goal.type === 'SPECIFIC')
            .flatMap((goal) => goal.courses.map((goalCourse) => goalCourse.courseId))
    )];
    
    const filters = [];

    if (anyGoals.length > 0) {
        const earliestCreatedAt = anyGoals.reduce(
            (earliest, goal) => (goal.createdAt < earliest ? goal.createdAt : earliest),
            anyGoals[0].createdAt
        );
        const latestExpiry = anyGoals.reduce((latest, goal) => {
            const goalEnd = goal.expiryDate || now;
            return goalEnd > latest ? goalEnd : latest;
        }, anyGoals[0].expiryDate || now);

        filters.push({
            completedAt: {
                gte: earliestCreatedAt,
                lte: latestExpiry
            }
        });
    }

    if (specificGoalCourseIds.length > 0) {
        filters.push({
            courseId: {
                in: specificGoalCourseIds
            }
        });
    }

    return filters;
};

module.exports = {
    calculateGoalCompliance,
    buildGoalCompletionFilters
};
