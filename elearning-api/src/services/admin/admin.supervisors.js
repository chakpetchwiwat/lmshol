const prisma = require('../../utils/prisma');
const { USER_PERMISSIONS } = require('../../utils/constants/roles');
const { ENROLLMENT_STATUS, GOAL_STATUS } = require('../../utils/constants/statuses');
const { GOAL_SCOPES } = require('../../utils/constants/scopes');
const { getActorContext } = require('./admin.helpers');

/**
 * Fetch all eligible supervisors (Admin, Superadmin, Manager)
 */
const getEligibleSupervisors = async () => {
    return prisma.user.findMany({
        where: {
            permission: {
                in: [USER_PERMISSIONS.SUPERADMIN, USER_PERMISSIONS.ADMIN, USER_PERMISSIONS.MANAGER]
            },
            status: 'ACTIVE'
        },
        select: {
            id: true,
            name: true,
            email: true,
            permission: true,
            department: true
        },
        orderBy: {
            name: 'asc'
        }
    });
};

/**
 * Fetch supervisor mappings for a user
 */
const getUserCohortSupervisors = async (userId) => {
    return prisma.userCohortSupervisor.findMany({
        where: { userId },
        include: {
            cohortRole: true,
            supervisor: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
    });
};

/**
 * Save cohort supervisor assignments for a user.
 * Expects assignments to be an array of: { cohortRoleId: string, supervisorId: string }
 */
const saveUserCohortSupervisors = async (userId, assignments = []) => {
    if (!Array.isArray(assignments)) {
        throw new Error('Assignments must be an array');
    }

    return prisma.$transaction(async (tx) => {
        // 1. Delete all existing cohort supervisors for this user
        await tx.userCohortSupervisor.deleteMany({
            where: { userId }
        });

        // 2. Filter out duplicates or incomplete assignments
        const seen = new Set();
        const validAssignments = [];

        for (const assign of assignments) {
            const { cohortRoleId, supervisorId } = assign;
            if (!cohortRoleId || !supervisorId) continue;

            const uniqueKey = `${cohortRoleId}-${supervisorId}`;
            if (seen.has(uniqueKey)) continue;
            seen.add(uniqueKey);

            validAssignments.push({
                userId,
                cohortRoleId,
                supervisorId
            });
        }

        // 3. Insert new assignments
        if (validAssignments.length > 0) {
            await tx.userCohortSupervisor.createMany({
                data: validAssignments
            });
        }

        return tx.userCohortSupervisor.findMany({
            where: { userId },
            include: {
                cohortRole: true,
                supervisor: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });
    });
};

const summarizeEnrollments = (enrollments = []) => {
    const completed = enrollments.filter((enrollment) => enrollment.status === ENROLLMENT_STATUS.COMPLETED);
    const inProgress = enrollments.filter((enrollment) => enrollment.status !== ENROLLMENT_STATUS.COMPLETED);
    const latest = [...enrollments].sort((left, right) => {
        const leftDate = new Date(left.completedAt || left.startedAt || left.createdAt || 0).getTime();
        const rightDate = new Date(right.completedAt || right.startedAt || right.createdAt || 0).getTime();
        return rightDate - leftDate;
    })[0];

    return {
        totalCourses: enrollments.length,
        completedCourses: completed.length,
        activeCourses: inProgress.length,
        latestCourseTitle: latest?.course?.title || null,
        latestLearningAt: latest?.completedAt || latest?.startedAt || null,
        latestStatus: latest?.status || null,
        averageProgress: enrollments.length
            ? Math.round(enrollments.reduce((sum, enrollment) => sum + Number(enrollment.progressPercent || 0), 0) / enrollments.length)
            : 0
    };
};

const calculateUserGoalMetrics = (user, activeGoals) => {
    const applicableGoals = activeGoals.filter(goal => {
        const hasTargetUsers = goal.targetUsers && goal.targetUsers.length > 0;
        const hasTargetCohortRoles = goal.targetCohortRoles && goal.targetCohortRoles.length > 0;
        const hasTargetDepartments = goal.targetDepartments && goal.targetDepartments.length > 0;

        if (hasTargetUsers) {
            return goal.targetUsers.some(tu => tu.userId === user.id);
        }
        if (hasTargetCohortRoles) {
            return goal.targetCohortRoles.some(tcr => tcr.cohortRole?.key && (user.roles || []).includes(tcr.cohortRole.key));
        }
        if (hasTargetDepartments) {
            return goal.targetDepartments.some(td => td.departmentId === user.departmentId);
        }
        if (goal.scope === GOAL_SCOPES.GLOBAL) {
            return true;
        }
        if (goal.scope === GOAL_SCOPES.DEPARTMENT) {
            return goal.departmentId === user.departmentId;
        }
        return false;
    });

    let completedGoals = 0;
    let totalGoals = applicableGoals.length;
    let sumProgressPercent = 0;

    const enrollments = user.enrollments || [];

    applicableGoals.forEach(goal => {
        const windowStart = new Date(goal.createdAt);
        const windowEnd = goal.expiryDate ? new Date(goal.expiryDate) : new Date(2100, 0, 1);
        const goalCourseIds = new Set(goal.courses.map(c => c.courseId));

        const completions = enrollments.filter(enrollment => {
            if (enrollment.status !== ENROLLMENT_STATUS.COMPLETED) return false;
            if (goal.type === 'SPECIFIC') {
                return goalCourseIds.has(enrollment.courseId);
            }
            const completedAt = enrollment.completedAt ? new Date(enrollment.completedAt) : null;
            return completedAt && completedAt >= windowStart && completedAt <= windowEnd;
        });

        const completionCount = completions.length;
        const targetCount = goal.targetCount;
        const isSuccess = completionCount >= targetCount;

        if (isSuccess) {
            completedGoals++;
        }

        let progressPercent = 0;
        if (goal.type === 'SPECIFIC') {
            if (goal.courses.length > 0) {
                const totalProgress = goal.courses.reduce((sum, gc) => {
                    const enrollment = enrollments.find(e => e.courseId === gc.courseId);
                    return sum + (enrollment ? Number(enrollment.progressPercent || 0) : 0);
                }, 0);
                progressPercent = Math.round(totalProgress / goal.courses.length);
            } else {
                progressPercent = 0;
            }
        } else {
            progressPercent = targetCount > 0 ? Math.round((completionCount / targetCount) * 100) : 0;
        }

        progressPercent = Math.min(progressPercent, 100);
        sumProgressPercent += progressPercent;
    });

    const averageProgress = totalGoals > 0 ? Math.round(sumProgressPercent / totalGoals) : 0;

    const latest = [...enrollments].sort((left, right) => {
        const leftDate = new Date(left.completedAt || left.startedAt || left.createdAt || 0).getTime();
        const rightDate = new Date(right.completedAt || right.startedAt || right.createdAt || 0).getTime();
        return rightDate - leftDate;
    })[0];

    return {
        completedGoals,
        totalGoals,
        averageProgress,
        latestCourseTitle: latest?.course?.title || null,
        latestLearningAt: latest?.completedAt || latest?.startedAt || null,
        latestStatus: latest?.status || null
    };
};

const mapTrackedUser = (user, activeGoals) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    departmentId: user.departmentRef?.id || user.departmentId || null,
    department: user.departmentRef?.name || user.department || null,
    subdivision: user.subdivision || null,
    position: user.tier?.name || user.position || null,
    positionLevel: user.positionLevel || null,
    positionType: user.positionType || null,
    roles: user.roles || [],
    roleLevels: user.roleLevels || {},
    tracking: calculateUserGoalMetrics(user, activeGoals)
});

const getSupervisorTracking = async (authUser) => {
    const actor = await getActorContext(authUser);
    const actorId = actor.id || actor.userId;

    const activeGoals = await prisma.learningGoal.findMany({
        where: {
            status: GOAL_STATUS.ACTIVE,
            OR: [
                { expiryDate: null },
                { expiryDate: { gte: new Date() } }
            ]
        },
        include: {
            courses: true,
            targetDepartments: true,
            targetCohortRoles: {
                include: {
                    cohortRole: true
                }
            },
            targetUsers: true
        }
    });

    if (actor.isAdmin) {
        // Fetch all cohort roles
        const cohortRoles = await prisma.cohortRole.findMany({
            orderBy: { order: 'asc' }
        });

        const roleKeys = cohortRoles.map(r => r.key);

        // Fetch all users who have at least one of these cohort roles
        const users = await prisma.user.findMany({
            where: {
                roles: {
                    hasSome: roleKeys
                }
            },
            include: {
                departmentRef: true,
                tier: true,
                enrollments: {
                    include: {
                        course: {
                            select: {
                                id: true,
                                title: true,
                                points: true,
                                category: {
                                    select: {
                                        id: true,
                                        name: true,
                                        type: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: [
                        { completedAt: 'desc' },
                        { startedAt: 'desc' }
                    ]
                }
            },
            orderBy: { name: 'asc' }
        });

        // Fetch all cohort role supervisors
        const roleSupervisors = await prisma.cohortRoleSupervisor.findMany({
            include: {
                supervisor: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        });

        // Group supervisors by cohort role ID
        const supervisorsByRoleId = new Map();
        roleSupervisors.forEach(rs => {
            if (!supervisorsByRoleId.has(rs.cohortRoleId)) {
                supervisorsByRoleId.set(rs.cohortRoleId, []);
            }
            if (rs.supervisor) {
                supervisorsByRoleId.get(rs.cohortRoleId).push(rs.supervisor);
            }
        });

        // Build groups
        const groups = cohortRoles.map(role => {
            const roleUsers = users.filter(user => user.roles.includes(role.key)).map(user => mapTrackedUser(user, activeGoals));
            const completedGoals = roleUsers.reduce((sum, user) => sum + user.tracking.completedGoals, 0);
            const totalGoals = roleUsers.reduce((sum, user) => sum + user.tracking.totalGoals, 0);

            return {
                cohortRole: role,
                supervisors: supervisorsByRoleId.get(role.id) || [],
                users: roleUsers,
                summary: {
                    userCount: roleUsers.length,
                    totalGoals,
                    completedGoals,
                    completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
                }
            };
        });

        return {
            actor: {
                id: actorId,
                name: actor.name,
                permission: actor.permission,
                isAdmin: actor.isAdmin,
                isSupervisor: actor.isSupervisor
            },
            groups
        };
    } else {
        const rows = await prisma.userCohortSupervisor.findMany({
            where: { supervisorId: actorId },
            include: {
                cohortRole: true,
                supervisor: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                user: {
                    include: {
                        departmentRef: true,
                        tier: true,
                        enrollments: {
                            include: {
                                course: {
                                    select: {
                                        id: true,
                                        title: true,
                                        points: true,
                                        category: {
                                            select: {
                                                id: true,
                                                name: true,
                                                type: true
                                            }
                                        }
                                    }
                                }
                            },
                            orderBy: [
                                { completedAt: 'desc' },
                                { startedAt: 'desc' }
                            ]
                        }
                    }
                }
            },
            orderBy: [
                { cohortRole: { order: 'asc' } },
                { user: { name: 'asc' } }
            ]
        });

        const groupsMap = new Map();

        rows.forEach((row) => {
            const roleId = row.cohortRoleId;
            if (!groupsMap.has(roleId)) {
                groupsMap.set(roleId, {
                    cohortRole: row.cohortRole,
                    supervisors: new Map(),
                    users: new Map()
                });
            }

            const group = groupsMap.get(roleId);
            group.supervisors.set(row.supervisorId, row.supervisor);
            group.users.set(row.userId, mapTrackedUser(row.user, activeGoals));
        });

        const groups = Array.from(groupsMap.values()).map((group) => {
            const users = Array.from(group.users.values());
            const completedGoals = users.reduce((sum, user) => sum + user.tracking.completedGoals, 0);
            const totalGoals = users.reduce((sum, user) => sum + user.tracking.totalGoals, 0);

            return {
                cohortRole: group.cohortRole,
                supervisors: Array.from(group.supervisors.values()),
                users,
                summary: {
                    userCount: users.length,
                    totalGoals,
                    completedGoals,
                    completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
                }
            };
        });

        return {
            actor: {
                id: actorId,
                name: actor.name,
                permission: actor.permission,
                isAdmin: actor.isAdmin,
                isSupervisor: actor.isSupervisor
            },
            groups
        };
    }
};

module.exports = {
    getEligibleSupervisors,
    getUserCohortSupervisors,
    saveUserCohortSupervisors,
    getSupervisorTracking
};
