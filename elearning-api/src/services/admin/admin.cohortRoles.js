const prisma = require('../../utils/prisma');
const { parseInteger, sanitizeName } = require('./admin.helpers');

const normalizeRoleKey = (value) => String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');

const isSupervisorRole = (roleName) => {
    const lower = String(roleName || '').toLowerCase();
    return lower.includes('supervisor') ||
           lower.includes('lead inspector') ||
           lower.includes('reviewer') ||
           lower.includes('evaluator');
};

const buildRoleData = (data, { includeOrderDefault = false } = {}) => {
    const name = sanitizeName(data.name, 'Cohort role');
    const payload = { name };

    if (data.group !== undefined) {
        payload.group = data.group ? String(data.group).trim() : null;
    }

    if (data.order !== undefined || includeOrderDefault) {
        payload.order = parseInteger(data.order, 0);
    }

    // Bypass levels hierarchy
    payload.levels = [];
    payload.adminLevels = [];

    return payload;
};

const prefetchUserPermissionsMap = async (tx, userIds, targetRoleKey = null) => {
    const accessAdminTiers = await tx.tier.findMany({
        where: { accessAdmin: true },
        select: { id: true }
    });
    const accessAdminTierIds = new Set(accessAdminTiers.map(t => t.id));

    const supervisedCounts = await tx.userCohortSupervisor.groupBy({
        by: ['supervisorId'],
        where: {
            supervisorId: { in: userIds },
            ...(targetRoleKey ? { cohortRole: { key: { not: targetRoleKey } } } : {})
        },
        _count: {
            userId: true
        }
    });
    const supervisedCountsMap = new Map(
        supervisedCounts.map(s => [s.supervisorId, s._count.userId])
    );

    const roleSupervisorCounts = await tx.cohortRoleSupervisor.groupBy({
        by: ['supervisorId'],
        where: {
            supervisorId: { in: userIds },
            ...(targetRoleKey ? { cohortRole: { key: { not: targetRoleKey } } } : {})
        },
        _count: {
            cohortRoleId: true
        }
    });
    const roleSupervisorCountsMap = new Map(
        roleSupervisorCounts.map(r => [r.supervisorId, r._count.cohortRoleId])
    );

    const allCohortRoles = await tx.cohortRole.findMany({
        select: { key: true, name: true, adminLevels: true }
    });
    const cohortRolesMap = new Map(allCohortRoles.map(r => [r.key, r]));

    return {
        accessAdminTierIds,
        supervisedCountsMap,
        roleSupervisorCountsMap,
        cohortRolesMap
    };
};

const shouldUserKeepManagerPermission = async (tx, user, targetRoleKey = null, prefetch = null) => {
    if (['admin', 'superadmin', 'ADMIN', 'SUPERADMIN'].includes(user.permission)) {
        return true;
    }

    const tierId = user.tierId || null;
    if (tierId) {
        if (prefetch && prefetch.accessAdminTierIds) {
            if (prefetch.accessAdminTierIds.has(tierId)) {
                return true;
            }
        } else {
            const tier = await tx.tier.findUnique({
                where: { id: tierId },
                select: { accessAdmin: true }
            });
            if (tier?.accessAdmin) {
                return true;
            }
        }
    }

    let supervisedCount = 0;
    if (prefetch && prefetch.supervisedCountsMap) {
        supervisedCount = prefetch.supervisedCountsMap.get(user.id) || 0;
    } else {
        supervisedCount = await tx.userCohortSupervisor.count({
            where: {
                supervisorId: user.id,
                ...(targetRoleKey ? { cohortRole: { key: { not: targetRoleKey } } } : {})
            }
        });
    }
    if (supervisedCount > 0) {
        return true;
    }

    let roleSupervisorCount = 0;
    if (prefetch && prefetch.roleSupervisorCountsMap) {
        roleSupervisorCount = prefetch.roleSupervisorCountsMap.get(user.id) || 0;
    } else {
        roleSupervisorCount = await tx.cohortRoleSupervisor.count({
            where: {
                supervisorId: user.id,
                ...(targetRoleKey ? { cohortRole: { key: { not: targetRoleKey } } } : {})
            }
        });
    }
    if (roleSupervisorCount > 0) {
        return true;
    }

    const roleKeys = (user.roles || []).filter((roleKey) => roleKey !== targetRoleKey);
    if (!roleKeys.length) {
        return false;
    }

    const roleLevels = typeof user.roleLevels === 'object' && user.roleLevels ? user.roleLevels : {};

    if (prefetch && prefetch.cohortRolesMap) {
        return roleKeys.some((roleKey) => {
            const role = prefetch.cohortRolesMap.get(roleKey);
            if (!role) return false;
            const assignedLevel = roleLevels[roleKey];
            return assignedLevel && (role.adminLevels || []).includes(assignedLevel);
        });
    } else {
        const roles = await tx.cohortRole.findMany({
            where: { key: { in: roleKeys } },
            select: { key: true, adminLevels: true }
        });
        return roles.some((role) => {
            const assignedLevel = roleLevels[role.key];
            return assignedLevel && (role.adminLevels || []).includes(assignedLevel);
        });
    }
};

const syncRoleAdminMemberPermissions = async (tx, role) => {
    const users = await tx.user.findMany({
        where: { roles: { has: role.key } }
    });

    const userIds = users.map(u => u.id);
    const prefetch = userIds.length > 0 ? await prefetchUserPermissionsMap(tx, userIds, role.key) : null;

    for (const user of users) {
        if (['admin', 'superadmin', 'ADMIN', 'SUPERADMIN'].includes(user.permission)) {
            continue;
        }

        const roleLevels = typeof user.roleLevels === 'object' && user.roleLevels ? user.roleLevels : {};
        const assignedLevel = roleLevels[role.key];
        let nextPermission = user.permission;

        if (assignedLevel && (role.adminLevels || []).includes(assignedLevel)) {
            nextPermission = 'manager';
        } else if (user.permission === 'manager') {
            const keepManagerPermission = await shouldUserKeepManagerPermission(tx, user, role.key, prefetch);
            nextPermission = keepManagerPermission ? user.permission : 'user';
        }

        if (nextPermission !== user.permission) {
            await tx.user.update({
                where: { id: user.id },
                data: { permission: nextPermission }
            });
        }
    }
};

const getCohortRoles = async (authUser) => {
    let where = {};
    if (authUser) {
        const authHelpers = require('../../utils/auth.helpers');
        const actor = await authHelpers.getActorContext(prisma, authUser);
        if (actor.isSupervisor && !actor.isAdmin) {
            where = {
                roleSupervisors: {
                    some: {
                        supervisorId: actor.id || actor.userId
                    }
                }
            };
        }
    }

    const roles = await prisma.cohortRole.findMany({
        where,
        include: {
            roleSupervisors: {
                select: { supervisorId: true }
            }
        },
        orderBy: [{ order: 'asc' }, { name: 'asc' }]
    });

    if (!roles.length) {
        return roles;
    }

    const roleKeys = roles.map((role) => role.key);
    const users = await prisma.user.findMany({
        where: {
            roles: {
                hasSome: roleKeys
            }
        },
        select: {
            id: true,
            roles: true
        }
    });

    const countByRoleKey = users.reduce((acc, user) => {
        user.roles.forEach((roleKey) => {
            if (roleKeys.includes(roleKey)) {
                acc[roleKey] = (acc[roleKey] || 0) + 1;
            }
        });
        return acc;
    }, {});

    return roles.map((role) => ({
        ...role,
        memberCount: countByRoleKey[role.key] || 0
    }));
};

const createCohortRole = async (data) => {
    const payload = buildRoleData(data, { includeOrderDefault: true });
    const key = normalizeRoleKey(data.key || payload.name);

    if (!key) {
        throw new Error('Cohort role key is required');
    }

    if (data.order === undefined) {
        payload.order = await prisma.cohortRole.count();
    }

    return prisma.cohortRole.create({
        data: {
            ...payload,
            key
        }
    });
};

const updateCohortRole = async (id, data) => prisma.$transaction(async (tx) => {
    const oldRole = await tx.cohortRole.findUnique({ where: { id } });
    if (!oldRole) {
        throw new Error('Cohort role not found');
    }

    const payload = buildRoleData(data);
    const newKey = normalizeRoleKey(data.key || payload.name);

    if (newKey !== oldRole.key) {
        // Check if newKey already exists on a different role
        const keyExists = await tx.cohortRole.findFirst({
            where: {
                key: newKey,
                id: { not: id }
            }
        });
        if (keyExists) {
            throw new Error('Cohort role key already exists');
        }

        // Update users who have the old role key
        const users = await tx.user.findMany({
            where: {
                roles: {
                    has: oldRole.key
                }
            }
        });

        for (const user of users) {
            const updatedRoles = user.roles.map((r) => (r === oldRole.key ? newKey : r));
            let updatedRoleLevels = typeof user.roleLevels === 'object' && user.roleLevels ? { ...user.roleLevels } : {};
            if (oldRole.key in updatedRoleLevels) {
                updatedRoleLevels[newKey] = updatedRoleLevels[oldRole.key];
                delete updatedRoleLevels[oldRole.key];
            }

            await tx.user.update({
                where: { id: user.id },
                data: {
                    roles: updatedRoles,
                    roleLevels: updatedRoleLevels,
                    updatedAt: new Date()
                }
            });
        }

        payload.key = newKey;
    }

    const role = await tx.cohortRole.update({
        where: { id },
        data: payload
    });
    await syncRoleAdminMemberPermissions(tx, role);
    return role;
});

const deleteCohortRole = async (id) => prisma.$transaction(async (tx) => {
    const role = await tx.cohortRole.findUnique({ where: { id } });
    if (!role) {
        throw new Error('Cohort role not found');
    }

    const usersWithRole = await tx.user.findMany({
        where: {
            roles: {
                has: role.key
            }
        }
    });

    const userIds = usersWithRole.map(u => u.id);
    const prefetch = userIds.length > 0 ? await prefetchUserPermissionsMap(tx, userIds, role.key) : null;

    for (const user of usersWithRole) {
        const updatedRoles = user.roles.filter((r) => r !== role.key);
        let updatedRoleLevels = typeof user.roleLevels === 'object' && user.roleLevels ? { ...user.roleLevels } : {};
        delete updatedRoleLevels[role.key];
        const keepManagerPermission = await shouldUserKeepManagerPermission(tx, user, role.key, prefetch);

        await tx.user.update({
            where: { id: user.id },
            data: {
                roles: updatedRoles,
                roleLevels: updatedRoleLevels,
                permission: keepManagerPermission ? user.permission : 'user',
                updatedAt: new Date()
            }
        });
    }

    return tx.cohortRole.delete({ where: { id } });
});

const reorderCohortRoles = async (roleIds) => {
    if (!Array.isArray(roleIds)) {
        throw new Error('Cohort role ids must be an array');
    }

    return prisma.$transaction(
        roleIds.map((id, index) => prisma.cohortRole.update({
            where: { id },
            data: { order: index }
        }))
    );
};

const updateCohortRoleMembers = async (id, membersInput = []) => {
    if (!Array.isArray(membersInput)) {
        throw new Error('Members input must be an array');
    }

    const parsedMembers = membersInput.map((item) => {
        if (typeof item === 'string') {
            return { userId: String(item || '').trim(), level: null, isSupervisor: false };
        }
        if (item && typeof item === 'object') {
            return {
                userId: String(item.userId || item.id || '').trim(),
                level: item.level ? String(item.level).trim() : null,
                isSupervisor: Boolean(item.isSupervisor)
            };
        }
        return null;
    }).filter((m) => m && m.userId);

    const normalizedUserIds = [...new Set(parsedMembers.map((m) => m.userId))];
    const normalizedSupervisorIds = [...new Set(parsedMembers
        .filter((m) => m.isSupervisor)
        .map((m) => m.userId))];

    return prisma.$transaction(async (tx) => {
        const role = await tx.cohortRole.findUnique({ where: { id } });
        if (!role) {
            throw new Error('Cohort role not found');
        }

        if (normalizedUserIds.length > 0) {
            const matchedCount = await tx.user.count({
                where: {
                    id: { in: normalizedUserIds }
                }
            });

            if (matchedCount !== normalizedUserIds.length) {
                throw new Error('Invalid user selection');
            }
        }

        const currentMembers = await tx.user.findMany({
            where: {
                roles: {
                    has: role.key
                }
            },
            select: {
                id: true,
                roles: true,
                roleLevels: true
            }
        });

        const currentMemberIds = currentMembers.map((u) => u.id);
        const allUserIdsToUpdate = [...new Set([...normalizedUserIds, ...currentMemberIds])];

        const usersToUpdate = await tx.user.findMany({
            where: {
                id: { in: allUserIdsToUpdate }
            }
        });

        const userIds = usersToUpdate.map(u => u.id);
        const prefetch = userIds.length > 0 ? await prefetchUserPermissionsMap(tx, userIds, role.key) : null;

        for (const user of usersToUpdate) {
            const isNewMember = normalizedUserIds.includes(user.id);
            let updatedRoles = [...(user.roles || [])];
            let updatedRoleLevels = typeof user.roleLevels === 'object' && user.roleLevels ? { ...user.roleLevels } : {};
            let nextPermission = user.permission;

            if (isNewMember) {
                if (!updatedRoles.includes(role.key)) {
                    updatedRoles.push(role.key);
                }
                const memberInfo = parsedMembers.find((m) => m.userId === user.id);
                updatedRoleLevels[role.key] = memberInfo.level;
                
                if (isSupervisorRole(role.name) && user.permission === 'user') {
                    nextPermission = 'manager';
                }
            } else {
                updatedRoles = updatedRoles.filter((r) => r !== role.key);
                delete updatedRoleLevels[role.key];
                const keepManagerPermission = await shouldUserKeepManagerPermission(tx, user, role.key, prefetch);
                
                let hasOtherSupervisorRole = false;
                if (updatedRoles.length > 0) {
                    if (prefetch && prefetch.cohortRolesMap) {
                        hasOtherSupervisorRole = updatedRoles.some((roleKey) => {
                            const r = prefetch.cohortRolesMap.get(roleKey);
                            return r && isSupervisorRole(r.name);
                        });
                    } else {
                        const otherRoles = await tx.cohortRole.findMany({
                            where: { key: { in: updatedRoles } },
                            select: { name: true }
                        });
                        hasOtherSupervisorRole = otherRoles.some(r => isSupervisorRole(r.name));
                    }
                }

                if (!keepManagerPermission && !hasOtherSupervisorRole) {
                    nextPermission = 'user';
                }
            }

            await tx.user.update({
                where: { id: user.id },
                data: {
                    roles: updatedRoles,
                    roleLevels: updatedRoleLevels,
                    permission: nextPermission,
                    updatedAt: new Date()
                }
            });
        }

        await tx.cohortRoleSupervisor.deleteMany({
            where: { cohortRoleId: role.id }
        });

        if (normalizedSupervisorIds.length > 0) {
            await tx.cohortRoleSupervisor.createMany({
                data: normalizedSupervisorIds.map((supervisorId) => ({
                    cohortRoleId: role.id,
                    supervisorId
                })),
                skipDuplicates: true
            });
        }

        await tx.userCohortSupervisor.deleteMany({
            where: {
                cohortRoleId: role.id,
                userId: { in: allUserIdsToUpdate }
            }
        });

        const supervisorRows = parsedMembers.flatMap((member) => (
            normalizedSupervisorIds
                .filter((supervisorId) => supervisorId !== member.userId)
                .map((supervisorId) => ({
                    userId: member.userId,
                    cohortRoleId: role.id,
                    supervisorId
                }))
        ));

        if (supervisorRows.length > 0) {
            await tx.userCohortSupervisor.createMany({
                data: supervisorRows,
                skipDuplicates: true
            });
        }

        if (normalizedSupervisorIds.length > 0) {
            await tx.user.updateMany({
                where: {
                    id: { in: normalizedSupervisorIds },
                    permission: 'user'
                },
                data: {
                    permission: 'manager'
                }
            });
        }

        const memberCount = await tx.user.count({
            where: {
                roles: {
                    has: role.key
                }
            }
        });

        return {
            ...role,
            roleSupervisors: normalizedSupervisorIds.map((supervisorId) => ({ supervisorId })),
            memberCount
        };
    });
};

const ensureCohortRoleKeysExist = async (tx, roleKeys) => {
    if (!roleKeys.length) {
        return;
    }

    const count = await tx.cohortRole.count({
        where: {
            key: {
                in: roleKeys
            }
        }
    });

    if (count !== roleKeys.length) {
        throw new Error('Invalid cohort role selection');
    }
};

module.exports = {
    getCohortRoles,
    createCohortRole,
    updateCohortRole,
    deleteCohortRole,
    reorderCohortRoles,
    updateCohortRoleMembers,
    ensureCohortRoleKeysExist
};
