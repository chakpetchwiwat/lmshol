const prisma = require('../utils/prisma');
const authHelpers = require('../utils/auth.helpers');
const ErrorResponse = require('../utils/errorResponse');
const { GOAL_STATUS, ENROLLMENT_STATUS, USER_STATUS } = require('../utils/constants/statuses');
const { GOAL_SCOPES } = require('../utils/constants/scopes');

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

    return await prisma.learningGoal.update({
        where: { id },
        data: { status: GOAL_STATUS.ARCHIVED }
    });
};

const republishGoal = async (id, authUser) => {
    const actor = await authHelpers.getActorContext(prisma, authUser);
    const goal = await prisma.learningGoal.findUnique({ where: { id } });
    if (!goal) throw new Error('Goal not found');

    if (goal.departmentId !== null && goal.departmentId !== actor.departmentId) {
        throw new Error('Not authorized to recover this goal');
    }

    return await prisma.learningGoal.update({
        where: { id },
        data: { 
            status: GOAL_STATUS.ACTIVE,
            expiryDate: null // Bringing it back to active usually means clearing the past expiry
        }
    });
};

const deleteGoal = async (id, authUser) => {
    const actor = await authHelpers.getActorContext(prisma, authUser);
    const goal = await prisma.learningGoal.findUnique({ where: { id } });
    if (!goal) throw new Error('Goal not found');

    if (goal.departmentId !== null && goal.departmentId !== actor.departmentId) {
        throw new Error('Not authorized to delete this goal');
    }

    return await prisma.learningGoal.delete({
        where: { id }
    });
};

const getGoalReport = async (goalId, authUser) => {
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

    if (!goal) throw new Error('Goal not found');

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
    const userIds = users.map(u => u.id);
    const courseIds = goal.courses.map(gc => gc.courseId);

    // 1. Batch fetch all relevant enrollments for all users in one query
    const allEnrollments = await prisma.userCourse.findMany({
        where: {
            userId: { in: userIds },
            ...(goal.type === 'ANY' 
                ? {
                    OR: [
                        { status: ENROLLMENT_STATUS.COMPLETED, completedAt: { gte: windowStart, lte: windowEnd } },
                        { status: ENROLLMENT_STATUS.IN_PROGRESS }
                    ]
                  }
                : { courseId: { in: courseIds } }
            )
        },
        include: {
            course: { select: { id: true, title: true } }
        }
    });

    // 2. Map enrollments by userId for O(1) lookup
    const enrollmentsByUserId = allEnrollments.reduce((acc, curr) => {
        if (!acc[curr.userId]) acc[curr.userId] = [];
        acc[curr.userId].push(curr);
        return acc;
    }, {});

    // 3. Build report using the pre-fetched data
    const report = users.map(user => {
        const userEnrollments = enrollmentsByUserId[user.id] || [];
        
        const completions = userEnrollments.filter(e => 
            e.status === ENROLLMENT_STATUS.COMPLETED && 
            (goal.type === 'SPECIFIC' || (e.completedAt >= windowStart && e.completedAt <= windowEnd))
        );

        const inProgress = userEnrollments.filter(e => e.status === ENROLLMENT_STATUS.IN_PROGRESS);
        
        const completionCount = completions.length;
        const isSuccess = completionCount >= goal.targetCount;
        
        // Status logic
        let userStatus = 'NOT_STARTED';
        if (isSuccess) {
            userStatus = 'COMPLETED';
        } else if (completionCount > 0 || inProgress.length > 0) {
            userStatus = 'IN_PROGRESS';
        }

        // Map detailed course progress
        const courseProgress = goal.type === 'SPECIFIC' 
            ? goal.courses.map(gc => {
                const enrollment = userEnrollments.find(e => e.courseId === gc.courseId);
                return {
                    courseId: gc.courseId,
                    title: gc.course.title,
                    status: enrollment?.status || 'NOT_STARTED',
                    progressPercent: enrollment?.progressPercent || 0,
                    completedAt: enrollment?.completedAt || null
                };
            })
            : completions.map(c => ({
                courseId: c.courseId,
                title: c.course.title,
                status: 'COMPLETED',
                progressPercent: 100,
                completedAt: c.completedAt
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
};

module.exports = {
    createGoal,
    getGoals,
    getGoalDetails,
    archiveGoal,
    republishGoal,
    deleteGoal,
    getGoalReport
};
