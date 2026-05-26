const prisma = require('../../utils/prisma');
const { parseInteger, sanitizeName } = require('./admin.helpers');

const normalizeRoleKey = (value) => String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '');

const buildRoleData = (data, { includeOrderDefault = false } = {}) => {
    const name = sanitizeName(data.name, 'Cohort role');
    const payload = { name };

    if (data.order !== undefined || includeOrderDefault) {
        payload.order = parseInteger(data.order, 0);
    }

    if (data.levels !== undefined) {
        if (Array.isArray(data.levels)) {
            payload.levels = data.levels.map(l => String(l || '').trim()).filter(Boolean);
        } else if (typeof data.levels === 'string') {
            payload.levels = data.levels.split(',').map(l => l.trim()).filter(Boolean);
        }
    }

    if (data.adminLevels !== undefined) {
        const levels = Array.isArray(payload.levels)
            ? payload.levels
            : (Array.isArray(data.levels) ? data.levels.map(l => String(l || '').trim()).filter(Boolean) : null);
        const adminLevels = Array.isArray(data.adminLevels)
            ? data.adminLevels.map(l => String(l || '').trim()).filter(Boolean)
            : [];
        payload.adminLevels = levels
            ? adminLevels.filter((level) => levels.includes(level))
            : adminLevels;
    }

    return payload;
};

const shouldUserKeepManagerPermission = async (tx, user, targetRoleKey = null) => {
    if (['admin', 'superadmin', 'ADMIN', 'SUPERADMIN'].includes(user.permission)) {
        return true;
    }

    const tierId = user.tierId || null;
    if (tierId) {
        const tier = await tx.tier.findUnique({
            where: { id: tierId },
            select: { accessAdmin: true }
        });
        if (tier?.accessAdmin) {
            return true;
        }
    }

    const roleKeys = (user.roles || []).filter((roleKey) => roleKey !== targetRoleKey);
    if (!roleKeys.length) {
        return false;
    }

    const roles = await tx.cohortRole.findMany({
        where: { key: { in: roleKeys } },
        select: { key: true, adminLevels: true }
    });
    const roleLevels = typeof user.roleLevels === 'object' && user.roleLevels ? user.roleLevels : {};
    return roles.some((role) => {
        const assignedLevel = roleLevels[role.key];
        return assignedLevel && (role.adminLevels || []).includes(assignedLevel);
    });
};

const syncRoleAdminMemberPermissions = async (tx, role) => {
    const users = await tx.user.findMany({
        where: { roles: { has: role.key } }
    });

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
            const keepManagerPermission = await shouldUserKeepManagerPermission(tx, user, role.key);
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

const getCohortRoles = async () => {
    const roles = await prisma.cohortRole.findMany({
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
    const role = await tx.cohortRole.update({
        where: { id },
        data: buildRoleData(data)
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

    for (const user of usersWithRole) {
        const updatedRoles = user.roles.filter((r) => r !== role.key);
        let updatedRoleLevels = typeof user.roleLevels === 'object' && user.roleLevels ? { ...user.roleLevels } : {};
        delete updatedRoleLevels[role.key];
        const keepManagerPermission = await shouldUserKeepManagerPermission(tx, user, role.key);

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
            return { userId: String(item || '').trim(), level: null };
        }
        if (item && typeof item === 'object') {
            return {
                userId: String(item.userId || item.id || '').trim(),
                level: item.level ? String(item.level).trim() : null
            };
        }
        return null;
    }).filter((m) => m && m.userId);

    const normalizedUserIds = [...new Set(parsedMembers.map((m) => m.userId))];

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
                if (memberInfo.level && (role.adminLevels || []).includes(memberInfo.level) && user.permission !== 'admin') {
                    nextPermission = 'manager';
                } else if (user.permission === 'manager') {
                    const keepManagerPermission = await shouldUserKeepManagerPermission(tx, user, role.key);
                    if (!keepManagerPermission) {
                        nextPermission = 'user';
                    }
                }
            } else {
                updatedRoles = updatedRoles.filter((r) => r !== role.key);
                delete updatedRoleLevels[role.key];
                const keepManagerPermission = await shouldUserKeepManagerPermission(tx, user, role.key);
                if (!keepManagerPermission) {
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

        const memberCount = await tx.user.count({
            where: {
                roles: {
                    has: role.key
                }
            }
        });

        return {
            ...role,
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
