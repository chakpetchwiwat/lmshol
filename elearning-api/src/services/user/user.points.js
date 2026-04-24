const prisma = require('../../../utils/prisma');

const getPointsHistory = async (userId) => {
    const [ledger, aggregation] = await Promise.all([
        prisma.pointsLedger.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.pointsLedger.aggregate({
            where: { userId },
            _sum: { points: true }
        })
    ]);

    return {
        balance: aggregation._sum.points || 0,
        history: ledger
    };
};

module.exports = {
    getPointsHistory
};
