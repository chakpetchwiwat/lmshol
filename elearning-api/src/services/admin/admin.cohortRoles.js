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

const getCohortRoles = async () => prisma.cohortRole.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }]
});

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
    ensureCohortRoleKeysExist
};
