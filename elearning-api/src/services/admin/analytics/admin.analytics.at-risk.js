const prisma = require('../../../utils/prisma');
const { ENROLLMENT_STATUS, GOAL_STATUS } = require('../../../utils/constants/statuses');
const { GOAL_SCOPES } = require('../../../utils/constants/scopes');

const { buildGoalCompletionFilters, calculateGoalCompliance } = require('./admin.analytics.goals');

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

    const completionFilters = buildGoalCompletionFilters(activeGoals, now);

    const completions = completionFilters.length > 0
        ? await prisma.userCourse.findMany({
            where: {
                userId: { in: targetUsers.map(u => u.id) },
                status: ENROLLMENT_STATUS.COMPLETED,
                OR: completionFilters
            },
            select: {
                userId: true,
                courseId: true,
                completedAt: true
            }
        })
        : [];

    const { atRisk } = calculateGoalCompliance(targetUsers, activeGoals, completions, now);

    return atRisk
        .sort((left, right) => (left.deadline || 0) - (right.deadline || 0))
        .slice(0, 500);
};

module.exports = {
    buildAtRiskLearners
};
