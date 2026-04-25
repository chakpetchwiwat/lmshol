const prisma = require('../../../utils/prisma');
const bcrypt = require('bcryptjs');
const authHelpers = require('../../../utils/auth.helpers');
const { USER_ROLES } = require('../../../utils/constants/roles');
const { POINT_SOURCE_TYPES } = require('../../../utils/constants/ledger');
const { TRANSACTION_TIMEOUTS } = require('../../../utils/constants/config');
const { mapUserRecord } = require('../admin.serializers');
const { userInclude, buildScopedUserWhere } = require('../admin.queries');
const { getActorContext, normalizeNullableId, parseInteger, ensureReferenceName } = require('../admin.helpers');

const buildUserMutationData = async (tx, inputData, { isCreate = false } = {}) => {
    const data = {};
    const { password, pointsBalance, ...baseData } = inputData;

    if (baseData.name !== undefined) data.name = baseData.name;
    if (baseData.email !== undefined) data.email = baseData.email;
    if (baseData.role !== undefined) {
        if (![USER_ROLES.USER, USER_ROLES.MANAGER, USER_ROLES.ADMIN].includes(baseData.role)) {
            throw new Error('Invalid role');
        }
        data.role = baseData.role;
    }

    if (password) {
        data.password = await bcrypt.hash(password, 10);
    } else if (isCreate) {
        data.password = await bcrypt.hash('password123', 10);
    }

    if (pointsBalance !== undefined) {
        data.pointsBalance = parseInteger(pointsBalance, 0);
    } else if (isCreate) {
        data.pointsBalance = 0;
    }

    const departmentId = normalizeNullableId(baseData.departmentId);
    if (departmentId !== undefined) {
        const department = await ensureReferenceName(tx, 'department', departmentId);
        data.departmentId = department?.id || null;
        data.department = department?.name || null;
    }

    const tierId = normalizeNullableId(baseData.tierId);
    if (tierId !== undefined) {
        if (tierId) {
            const tier = await tx.tier.findUnique({
                where: { id: tierId },
                select: { id: true, accessAdmin: true }
            });
            if (!tier) throw new Error('Tier not found');
            data.tierId = tier.id;
            const targetRole = tier.accessAdmin ? USER_ROLES.MANAGER : USER_ROLES.USER;
            if (data.role !== USER_ROLES.ADMIN) data.role = targetRole;
        } else {
            data.tierId = null;
        }
    }

    if (baseData.employmentDate !== undefined) {
        data.employmentDate = baseData.employmentDate ? new Date(baseData.employmentDate) : null;
    } else if (isCreate) {
        data.employmentDate = new Date();
    }

    return data;
};

const getUsers = async (authUser) => {
    const actor = await getActorContext(authUser);
    const users = await prisma.user.findMany({
        where: authHelpers.buildUserManagementWhere(actor),
        include: userInclude,
        orderBy: [{ tier: { order: 'asc' } }, { role: 'asc' }, { name: 'asc' }]
    });

    const balances = await prisma.pointsLedger.groupBy({
        by: ['userId'],
        where: { userId: { in: users.map((user) => user.id) } },
        _sum: { points: true }
    });

    const balanceMap = Object.fromEntries(balances.map((item) => [item.userId, item._sum.points || 0]));

    return users.map((user) => ({
        ...mapUserRecord(user),
        pointsBalance: balanceMap[user.id] ?? 0
    }));
};

const createUser = async (inputData) => prisma.$transaction(async (tx) => {
    const data = await buildUserMutationData(tx, inputData, { isCreate: true });
    const user = await tx.user.create({
        data: { ...data, role: inputData.role || USER_ROLES.USER },
        include: { departmentRef: true, tier: true }
    });

    if ((data.pointsBalance || 0) > 0) {
        await tx.pointsLedger.create({
            data: {
                userId: user.id,
                sourceType: POINT_SOURCE_TYPES.ADMIN_EDIT,
                points: data.pointsBalance,
                note: 'Initial balance set during user creation'
            }
        });
    }
    return mapUserRecord(user);
}, { maxWait: TRANSACTION_TIMEOUTS.DEFAULT_MAX_WAIT, timeout: TRANSACTION_TIMEOUTS.DEFAULT_TIMEOUT });

const updateUser = async (id, inputData) => prisma.$transaction(async (tx) => {
    const data = await buildUserMutationData(tx, inputData);
    if (inputData.pointsBalance !== undefined) {
        const targetBalance = parseInteger(inputData.pointsBalance, 0);
        const ledgerEntries = await tx.pointsLedger.findMany({ where: { userId: id } });
        const currentBalance = ledgerEntries.reduce((sum, entry) => sum + entry.points, 0);
        const difference = targetBalance - currentBalance;
        if (difference !== 0) {
            await tx.pointsLedger.create({
                data: {
                    userId: id,
                    sourceType: POINT_SOURCE_TYPES.ADMIN_EDIT,
                    points: difference,
                    note: `Admin adjusted balance by ${difference} (Target: ${targetBalance})`
                }
            });
        }
    }

    const user = await tx.user.update({
        where: { id },
        data,
        include: { departmentRef: true, tier: true }
    });
    return mapUserRecord(user);
}, { maxWait: TRANSACTION_TIMEOUTS.DEFAULT_MAX_WAIT, timeout: TRANSACTION_TIMEOUTS.DEFAULT_TIMEOUT });

const deleteUser = async (id) => prisma.user.delete({ where: { id } });

module.exports = {
    getUsers,
    createUser,
    updateUser,
    deleteUser
};
