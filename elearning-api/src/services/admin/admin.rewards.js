const prisma = require('../../utils/prisma');
const { ENTITY_STATUS, REDEEM_STATUS } = require('../../utils/constants/statuses');
const { POINT_SOURCE_TYPES } = require('../../utils/constants/ledger');
const { mapCategoryRecord, mapCourseRecord } = require('./admin.serializers');
const { categoryInclude, courseInclude } = require('./admin.queries');
const { parseInteger, parseOptionalDate, normalizeNullableId, normalizeIdArray, sanitizeName, ensureReferenceName, ensureReferenceIdsExist, ensureInstructorPresetExists, buildTemporaryStateData } = require('./admin.helpers');

const getAdminRewards = async () => prisma.reward.findMany({
    orderBy: { createdAt: 'desc' }
});

const createReward = async (data) => prisma.reward.create({
    data: {
        ...data,
        pointsCost: parseInteger(data.pointsCost, 0),
        stock: parseInteger(data.stock, 0),
        maxPerUser: parseInteger(data.maxPerUser, 1)
    }
});

const updateReward = async (id, data) => {
    const updateData = { ...data };

    if (updateData.maxPerUser !== undefined) {
        updateData.maxPerUser = parseInteger(updateData.maxPerUser, 1);
    }

    if (updateData.pointsCost !== undefined) {
        updateData.pointsCost = parseInteger(updateData.pointsCost, 0);
    }

    if (updateData.stock !== undefined) {
        updateData.stock = parseInteger(updateData.stock, 0);
    }

    return prisma.reward.update({
        where: { id },
        data: updateData
    });
};

const deleteReward = async (id) => prisma.reward.delete({
    where: { id }
});

const getRedeemRequests = async () => prisma.redeemRequest.findMany({
    include: {
        user: {
            select: {
                name: true,
                email: true
            }
        },
        reward: true
    },
    orderBy: { requestedAt: 'desc' }
});

const updateRedeemStatus = async (id, status, adminNote) => {
    const request = await prisma.redeemRequest.findUnique({ where: { id } });
    if (!request) {
        throw new Error('Request not found');
    }

    return prisma.$transaction(async (tx) => {
        try {
            if (status === REDEEM_STATUS.REJECTED && request.status !== REDEEM_STATUS.REJECTED) {
                await tx.pointsLedger.create({
                    data: {
                        userId: request.userId,
                        sourceType: POINT_SOURCE_TYPES.REWARD_ADJUST,
                        sourceId: request.id,
                        points: request.pointsCost,
                        note: `Refund for rejected redeem: ${id}`
                    }
                });

                await tx.reward.update({
                    where: { id: request.rewardId },
                    data: {
                        stock: {
                            increment: 1
                        }
                    }
                });
            }

            return tx.redeemRequest.update({
                where: { id },
                data: {
                    status,
                    adminNote,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            console.error('Transaction Error in updateRedeemStatus:', error.message);
            throw error;
        }
    }, {
        maxWait: TRANSACTION_TIMEOUTS.DEFAULT_MAX_WAIT,
        timeout: TRANSACTION_TIMEOUTS.DEFAULT_TIMEOUT
    });
};

module.exports = {
    getAdminRewards,
    createReward,
    updateReward,
    deleteReward,
    getRedeemRequests,
    updateRedeemStatus,
};
