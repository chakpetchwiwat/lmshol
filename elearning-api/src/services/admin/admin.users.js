const prisma = require('../../utils/prisma');
const bcrypt = require('bcryptjs');
const authHelpers = require('../../utils/auth.helpers');
const { USER_ROLES, MANAGED_USER_ROLES } = require('../../utils/constants/roles');
const { USER_STATUS } = require('../../utils/constants/statuses');
const { POINT_SOURCE_TYPES } = require('../../utils/constants/ledger');
const { TRANSACTION_TIMEOUTS } = require('../../utils/constants/config');
const { mapUserRecord } = require('./admin.serializers');
const { userInclude, buildScopedUserWhere } = require('./admin.queries');
const { getActorContext, sanitizeName, normalizeNullableId, parseInteger, ensureReferenceName } = require('./admin.helpers');

const buildUserMutationData = async (tx, inputData, { isCreate = false } = {}) => {
    const data = {};
    const { password, pointsBalance, ...baseData } = inputData;

    if (baseData.name !== undefined) {
        data.name = baseData.name;
    }

    if (baseData.email !== undefined) {
        data.email = baseData.email;
    }

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
    } else if (baseData.department !== undefined && !isCreate) {
        data.department = baseData.department || null;
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

            // Auto-sync role based on tier's accessAdmin
            const targetRole = tier.accessAdmin ? USER_ROLES.MANAGER : USER_ROLES.USER;
            if (data.role !== USER_ROLES.ADMIN) {
                data.role = targetRole;
            }
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

const buildAdminManagedUsersWhere = (actor, extraWhere = {}) => authHelpers.buildUserManagementWhere(actor, extraWhere);

const buildPointsHistory = async (userId) => {
    const ledger = await prisma.pointsLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });

    if (ledger.length === 0) {
        return [];
    }

    const courseIds = [...new Set(ledger
        .filter((entry) => entry.sourceType === POINT_SOURCE_TYPES.COURSE && entry.sourceId)
        .map((entry) => entry.sourceId))];
    const lessonIds = [...new Set(ledger
        .filter((entry) => entry.sourceType === POINT_SOURCE_TYPES.QUIZ && entry.sourceId)
        .map((entry) => entry.sourceId))];
    const redeemIds = [...new Set(ledger
        .filter((entry) => [POINT_SOURCE_TYPES.REDEEM, POINT_SOURCE_TYPES.REWARD_ADJUST].includes(entry.sourceType) && entry.sourceId)
        .map((entry) => entry.sourceId))];

    const [courses, lessons, redeems] = await Promise.all([
        courseIds.length
            ? prisma.course.findMany({
                where: { id: { in: courseIds } },
                select: { id: true, title: true }
            })
            : Promise.resolve([]),
        lessonIds.length
            ? prisma.lesson.findMany({
                where: { id: { in: lessonIds } },
                select: { id: true, title: true }
            })
            : Promise.resolve([]),
        redeemIds.length
            ? prisma.redeemRequest.findMany({
                where: { id: { in: redeemIds } },
                include: {
                    reward: {
                        select: {
                            name: true
                        }
                    }
                }
            })
            : Promise.resolve([])
    ]);

    const courseMap = Object.fromEntries(courses.map((course) => [course.id, course]));
    const lessonMap = Object.fromEntries(lessons.map((lesson) => [lesson.id, lesson]));
    const redeemMap = Object.fromEntries(redeems.map((redeem) => [redeem.id, redeem]));

    return ledger.map((entry) => {
        let sourceLabel = entry.note || 'Point activity';

        if (entry.sourceType === POINT_SOURCE_TYPES.COURSE) {
            sourceLabel = courseMap[entry.sourceId]?.title
                ? `Completed course: ${courseMap[entry.sourceId].title}`
                : (entry.note || 'Completed course');
        }

        if (entry.sourceType === POINT_SOURCE_TYPES.QUIZ) {
            sourceLabel = lessonMap[entry.sourceId]?.title
                ? `Passed quiz: ${lessonMap[entry.sourceId].title}`
                : (entry.note || 'Passed quiz');
        }

        if (entry.sourceType === POINT_SOURCE_TYPES.REDEEM) {
            sourceLabel = redeemMap[entry.sourceId]?.reward?.name
                ? `Redeemed reward: ${redeemMap[entry.sourceId].reward.name}`
                : (entry.note || 'Redeemed reward');
        }

        if (entry.sourceType === POINT_SOURCE_TYPES.REWARD_ADJUST) {
            sourceLabel = redeemMap[entry.sourceId]?.reward?.name
                ? `Reward adjustment: ${redeemMap[entry.sourceId].reward.name}`
                : (entry.note || 'Reward adjustment');
        }

        if (entry.sourceType === POINT_SOURCE_TYPES.ADMIN_EDIT) {
            sourceLabel = entry.note || 'Admin adjusted points';
        }

        return {
            ...entry,
            direction: entry.points >= 0 ? 'earned' : 'spent',
            sourceLabel
        };
    });
};

const getUsers = async (authUser) => {
    const actor = await getActorContext(authUser);
    const users = await prisma.user.findMany({
        where: buildAdminManagedUsersWhere(actor),
        include: userInclude,
        orderBy: [
            { tier: { order: 'asc' } },
            { role: 'asc' },
            { name: 'asc' }
        ]
    });

    const balances = await prisma.pointsLedger.groupBy({
        by: ['userId'],
        where: {
            userId: {
                in: users.map((user) => user.id)
            }
        },
        _sum: {
            points: true
        }
    });

    const balanceMap = Object.fromEntries(
        balances.map((item) => [item.userId, item._sum.points || 0])
    );

    return users.map((user) => ({
        ...mapUserRecord(user),
        pointsBalance: balanceMap[user.id] ?? 0
    }));
};

const getUserDetails = async (id, authUser) => {
    const actor = await getActorContext(authUser);
    const user = await prisma.user.findFirst({
        where: await buildScopedUserWhere(actor, id),
        include: {
            departmentRef: true,
            tier: true,
            enrollments: {
                include: {
                    course: {
                        include: {
                            category: true
                        }
                    }
                },
                orderBy: { startedAt: 'desc' }
            },
            _count: {
                select: {
                    enrollments: true
                }
            }
        }
    });

    if (!user) {
        throw new Error('User not found');
    }

    const mappedUser = mapUserRecord(user);
    const pointsHistory = await buildPointsHistory(user.id);
    const actualPointsBalance = pointsHistory.reduce((sum, entry) => sum + entry.points, 0);

    return {
        ...mappedUser,
        pointsBalance: actualPointsBalance,
        enrollments: user.enrollments.map((enrollment) => ({
            id: enrollment.id,
            status: enrollment.status,
            progressPercent: enrollment.progressPercent,
            startedAt: enrollment.startedAt,
            completedAt: enrollment.completedAt,
            course: {
                id: enrollment.course.id,
                title: enrollment.course.title,
                categoryName: enrollment.course.category?.name || null,
                points: enrollment.course.points
            }
        })),
        pointsHistory
    };
};

const createUser = async (inputData) => prisma.$transaction(async (tx) => {
    try {
        const data = await buildUserMutationData(tx, inputData, { isCreate: true });

        const user = await tx.user.create({
            data: {
                ...data,
                role: inputData.role || USER_ROLES.USER
            },
            include: {
                departmentRef: true,
                tier: true
            }
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
    } catch (error) {
        console.error('Transaction Error in createUser:', error.message);
        throw error;
    }
}, {
    maxWait: TRANSACTION_TIMEOUTS.DEFAULT_MAX_WAIT,
    timeout: TRANSACTION_TIMEOUTS.DEFAULT_TIMEOUT
});

const updateUser = async (id, inputData) => prisma.$transaction(async (tx) => {
    try {
        const data = await buildUserMutationData(tx, inputData);

        if (inputData.pointsBalance !== undefined) {
            const targetBalance = parseInteger(inputData.pointsBalance, 0);
            const ledgerEntries = await tx.pointsLedger.findMany({
                where: { userId: id }
            });
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
            include: {
                departmentRef: true,
                tier: true
            }
        });

        return mapUserRecord(user);
    } catch (error) {
        console.error('Transaction Error in updateUser:', error.message);
        throw error;
    }
}, {
    maxWait: TRANSACTION_TIMEOUTS.DEFAULT_MAX_WAIT,
    timeout: TRANSACTION_TIMEOUTS.DEFAULT_TIMEOUT
});

const deleteUser = async (id) => prisma.user.delete({ where: { id } });

module.exports = {
    buildPointsHistory,
    getUsers,
    getUserDetails,
    createUser,
    updateUser,
    deleteUser,
};
