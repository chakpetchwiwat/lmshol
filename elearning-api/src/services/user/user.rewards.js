const prisma = require('../../utils/prisma');
const {
    REDEEM_STATUS,
    REWARD_STATUS
} = require('../../utils/constants/statuses');
const { POINT_SOURCE_TYPES } = require('../../utils/constants/ledger');

const requestRedeem = async (userId, rewardId) => {
    const reward = await prisma.reward.findUnique({
        where: { id: rewardId }
    });

    if (!reward || reward.status !== REWARD_STATUS.ACTIVE || reward.stock <= 0) {
        throw new Error('Reward unavailable or out of stock');
    }

    const userRedeemed = await prisma.redeemRequest.count({
        where: {
            userId,
            rewardId,
            status: {
                not: REDEEM_STATUS.REJECTED
            }
        }
    });

    if (userRedeemed >= reward.maxPerUser) {
        throw new Error('เธเธธเธ“เนเธฅเธเธฃเธฒเธเธงเธฑเธฅเธเธตเนเธเธฃเธเธ•เธฒเธกเธชเธดเธ—เธเธดเธ—เธตเนเธเธณเธซเธเธ”เนเธฅเนเธง');
    }

    const balanceResult = await prisma.pointsLedger.aggregate({
        where: { userId },
        _sum: { points: true }
    });
    const balance = balanceResult._sum.points || 0;

    if (balance < reward.pointsCost) {
        throw new Error('Insufficient points');
    }

    return prisma.$transaction(async (tx) => {
        const request = await tx.redeemRequest.create({
            data: {
                userId,
                rewardId,
                pointsCost: reward.pointsCost
            }
        });

        await tx.pointsLedger.create({
            data: {
                userId,
                sourceType: POINT_SOURCE_TYPES.REDEEM,
                sourceId: request.id,
                points: -reward.pointsCost,
                note: `Redeemed: ${reward.name}`
            }
        });

        await tx.reward.update({
            where: { id: reward.id },
            data: {
                stock: {
                    decrement: 1
                }
            }
        });

        return request;
    });
};

module.exports = {
    requestRedeem
};
