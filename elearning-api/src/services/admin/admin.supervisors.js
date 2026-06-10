const prisma = require('../../utils/prisma');
const { USER_PERMISSIONS } = require('../../utils/constants/roles');
const { ENROLLMENT_STATUS } = require('../../utils/constants/statuses');
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

const mapTrackedUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    departmentId: user.departmentRef?.id || user.departmentId || null,
    department: user.departmentRef?.name || user.department || null,
    roles: user.roles || [],
    roleLevels: user.roleLevels || {},
    tracking: summarizeEnrollments(user.enrollments || [])
});

const getSupervisorTracking = async (authUser) => {
    const actor = await getActorContext(authUser);
    const actorId = actor.id || actor.userId;

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
            const roleUsers = users.filter(user => user.roles.includes(role.key)).map(mapTrackedUser);
            const completedCourses = roleUsers.reduce((sum, user) => sum + user.tracking.completedCourses, 0);
            const totalCourses = roleUsers.reduce((sum, user) => sum + user.tracking.totalCourses, 0);

            return {
                cohortRole: role,
                supervisors: supervisorsByRoleId.get(role.id) || [],
                users: roleUsers,
                summary: {
                    userCount: roleUsers.length,
                    totalCourses,
                    completedCourses,
                    completionRate: totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0
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
            group.users.set(row.userId, mapTrackedUser(row.user));
        });

        const groups = Array.from(groupsMap.values()).map((group) => {
            const users = Array.from(group.users.values());
            const completedCourses = users.reduce((sum, user) => sum + user.tracking.completedCourses, 0);
            const totalCourses = users.reduce((sum, user) => sum + user.tracking.totalCourses, 0);

            return {
                cohortRole: group.cohortRole,
                supervisors: Array.from(group.supervisors.values()),
                users,
                summary: {
                    userCount: users.length,
                    totalCourses,
                    completedCourses,
                    completionRate: totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0
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
