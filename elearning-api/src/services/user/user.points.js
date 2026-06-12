const prisma = require('../../utils/prisma');

const isOptionalDataUnavailableError = (error) => {
    return ['P2021', 'P2022', 'P1001', 'P1008'].includes(error?.code);
};

const getPointsHistory = async (userId) => {
    try {
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
    } catch (error) {
        if (isOptionalDataUnavailableError(error)) {
            console.warn('Points data is unavailable; returning empty points history.', {
                code: error.code,
                message: error.message
            });
            return {
                balance: 0,
                history: []
            };
        }

        throw error;
    }
};

module.exports = {
    getPointsHistory
};
