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

    return payload;
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

const updateCohortRole = async (id, data) => prisma.cohortRole.update({
    where: { id },
    data: buildRoleData(data)
});

const deleteCohortRole = async (id) => prisma.$transaction(async (tx) => {
    const role = await tx.cohortRole.findUnique({ where: { id } });
    if (!role) {
        throw new Error('Cohort role not found');
    }

    await tx.$executeRaw`
        UPDATE "User"
        SET "roles" = array_remove("roles", ${role.key}), "updatedAt" = NOW()
        WHERE ${role.key} = ANY("roles")
    `;

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

const updateCohortRoleMembers = async (id, userIds = []) => {
    if (!Array.isArray(userIds)) {
        throw new Error('User ids must be an array');
    }

    const normalizedUserIds = [...new Set(userIds.map((userId) => String(userId || '').trim()).filter(Boolean))];

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

        await tx.$executeRaw`
            UPDATE "User"
            SET "roles" = array_remove("roles", ${role.key}), "updatedAt" = NOW()
            WHERE ${role.key} = ANY("roles")
        `;

        if (normalizedUserIds.length > 0) {
            await tx.$executeRaw`
                UPDATE "User"
                SET "roles" = array_append("roles", ${role.key}), "updatedAt" = NOW()
                WHERE "id" = ANY(${normalizedUserIds}::text[])
                    AND NOT (${role.key} = ANY("roles"))
            `;
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
