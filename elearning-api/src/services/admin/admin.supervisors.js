const prisma = require('../../utils/prisma');
const { USER_PERMISSIONS } = require('../../utils/constants/roles');

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

module.exports = {
    getEligibleSupervisors,
    getUserCohortSupervisors,
    saveUserCohortSupervisors
};
