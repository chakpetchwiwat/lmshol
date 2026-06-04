const prisma = require('../../../utils/prisma');
const bcrypt = require('bcryptjs');
const authHelpers = require('../../../utils/auth.helpers');
const { USER_PERMISSIONS } = require('../../../utils/constants/roles');
const { POINT_SOURCE_TYPES } = require('../../../utils/constants/ledger');
const { TRANSACTION_TIMEOUTS } = require('../../../utils/constants/config');
const { mapUserRecord } = require('../admin.serializers');
const { userInclude, buildScopedUserWhere } = require('../admin.queries');
const { getActorContext, normalizeNullableId, parseInteger, ensureReferenceName } = require('../admin.helpers');
const { ensureCohortRoleKeysExist } = require('../admin.cohortRoles');

const buildUserMutationData = async (tx, inputData, { isCreate = false } = {}) => {
    const data = {};
    const { password, pointsBalance, ...baseData } = inputData;

    if (baseData.name !== undefined) {
        const name = String(baseData.name || '').trim();
        if (!name) throw new Error('Name is required');
        data.name = name.slice(0, 200);
    } else if (isCreate) {
        throw new Error('Name is required');
    }

    if (baseData.email !== undefined) {
        const email = String(baseData.email || '').trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error('Invalid email');
        }
        data.email = email;
    } else if (isCreate) {
        throw new Error('Email is required');
    }
    if (baseData.permission !== undefined) {
        if (![USER_PERMISSIONS.USER, USER_PERMISSIONS.MANAGER, USER_PERMISSIONS.ADMIN].includes(baseData.permission)) {
            throw new Error('Invalid permission');
        }
        data.permission = baseData.permission;
    }

    if (baseData.roles !== undefined) {
        if (!Array.isArray(baseData.roles)) {
            throw new Error('Roles must be an array');
        }
        const roleKeys = [...new Set(
            baseData.roles
                .filter(Boolean)
                .map((roleKey) => String(roleKey))
        )];
        await ensureCohortRoleKeysExist(tx, roleKeys);
        data.roles = roleKeys;
    }

    if (baseData.roleLevels !== undefined) {
        data.roleLevels = baseData.roleLevels || {};
    }

    if (baseData.mustChangePassword !== undefined) {
        data.mustChangePassword = !!baseData.mustChangePassword;
    } else if (isCreate) {
        data.mustChangePassword = false;
    }

    if (password) {
        if (String(password).length < 8) {
            throw new Error('Password must be at least 8 characters');
        }
        data.password = await bcrypt.hash(password, 10);
    } else if (isCreate) {
        data.password = await bcrypt.hash('password123', 10);
    }

    if (pointsBalance !== undefined) {
        data.pointsBalance = parseInteger(pointsBalance, 0);
        if (data.pointsBalance < 0) {
            throw new Error('Points balance cannot be negative');
        }
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
                select: { id: true, name: true, accessAdmin: true }
            });
            if (!tier) throw new Error('Tier not found');
            data.tierId = tier.id;
            data.position = tier.name;
            const targetPermission = tier.accessAdmin ? USER_PERMISSIONS.MANAGER : USER_PERMISSIONS.USER;
            if (data.permission !== USER_PERMISSIONS.ADMIN) data.permission = targetPermission;
        } else {
            data.tierId = null;
            data.position = null;
        }
    }

    const cohortRoleKeys = Array.isArray(data.roles)
        ? data.roles
        : (Array.isArray(baseData.roles) ? baseData.roles : []);
    const cohortRoleLevels = data.roleLevels || baseData.roleLevels || {};
    if (cohortRoleKeys.length > 0 && cohortRoleLevels && data.permission !== USER_PERMISSIONS.ADMIN) {
        const cohortRoles = await tx.cohortRole.findMany({
            where: { key: { in: cohortRoleKeys } },
            select: { key: true, adminLevels: true }
        });
        const hasAdminLevel = cohortRoles.some((role) => {
            const assignedLevel = cohortRoleLevels[role.key];
            return assignedLevel && (role.adminLevels || []).includes(assignedLevel);
        });
        if (hasAdminLevel) {
            data.permission = USER_PERMISSIONS.MANAGER;
        }
    }

    if (baseData.subdivision !== undefined) {
        data.subdivision = baseData.subdivision ? String(baseData.subdivision).trim() : null;
    }

    if (baseData.positionLevel !== undefined) {
        data.positionLevel = baseData.positionLevel ? String(baseData.positionLevel).trim() : null;
    }

    if (baseData.positionType !== undefined) {
        data.positionType = baseData.positionType ? String(baseData.positionType).trim() : null;
    }

    if (baseData.supervisorName !== undefined) {
        data.supervisorName = baseData.supervisorName ? String(baseData.supervisorName).trim() : null;
    }

    if (baseData.employmentDate !== undefined) {
        data.employmentDate = baseData.employmentDate ? new Date(baseData.employmentDate) : null;
        if (data.employmentDate && Number.isNaN(data.employmentDate.getTime())) {
            throw new Error('Employment date is invalid');
        }
    } else if (isCreate) {
        data.employmentDate = new Date();
    }

    if (baseData.profileImageUrl !== undefined) {
        data.profileImageUrl = baseData.profileImageUrl ? String(baseData.profileImageUrl).trim() : null;
    }

    if (baseData.educationHistory !== undefined) {
        data.educationHistory = Array.isArray(baseData.educationHistory)
            ? baseData.educationHistory.slice(0, 50).map((item) => ({
                id: String(item?.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
                institution: String(item?.institution || '').trim().slice(0, 300),
                degree: String(item?.degree || '').trim().slice(0, 300),
                faculty: String(item?.faculty || '').trim().slice(0, 300),
                major: String(item?.major || '').trim().slice(0, 300),
                graduationYear: String(item?.graduationYear || '').trim().slice(0, 300)
            })).filter((item) => item.institution || item.degree || item.faculty || item.major || item.graduationYear)
            : [];
    }

    if (baseData.profileFiles !== undefined) {
        data.profileFiles = Array.isArray(baseData.profileFiles)
            ? baseData.profileFiles.slice(0, 50).map((file) => ({
                id: String(file?.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
                title: String(file?.title || '').trim().slice(0, 300),
                fileName: String(file?.fileName || '').trim().slice(0, 300),
                fileKey: String(file?.fileKey || '').trim(),
                fileUrl: String(file?.fileUrl || '').trim(),
                fileMimeType: String(file?.fileMimeType || '').trim().slice(0, 300),
                uploadedAt: file?.uploadedAt ? new Date(file.uploadedAt).toISOString() : ''
            })).filter((file) => file.title || file.fileName || file.fileKey || file.fileUrl)
            : [];
    }

    return data;
};

const getUsers = async (authUser) => {
    const actor = await getActorContext(authUser);
    const baseWhere = authHelpers.buildUserManagementWhere(actor);
    const users = await prisma.user.findMany({
        where: {
            AND: [
                baseWhere,
                { permission: { not: 'ADMIN' } }
            ]
        },
        include: userInclude,
        orderBy: [{ tier: { order: 'asc' } }, { permission: 'asc' }, { name: 'asc' }]
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
        data: {
            ...data,
            permission: data.permission || inputData.permission || USER_PERMISSIONS.USER,
            roles: data.roles || []
        },
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
