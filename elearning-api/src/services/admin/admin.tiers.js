const prisma = require('../../utils/prisma');
const { getActorContext, sanitizeName, parseInteger } = require('./admin.helpers');

const getTiers = async (authUser) => {
    await getActorContext(authUser);

    return prisma.tier.findMany({
        orderBy: { order: 'asc' }
    });
};

const createTier = async (data) => prisma.tier.create({
    data: {
        name: sanitizeName(data.name, 'Tier'),
        accessAdmin: Boolean(data.accessAdmin),
        order: parseInteger(data.order, 0)
    }
});

const updateTier = async (id, data) => prisma.tier.update({
    where: { id },
    data: {
        name: sanitizeName(data.name, 'Tier'),
        accessAdmin: Boolean(data.accessAdmin),
        order: parseInteger(data.order, 0)
    }
});

const deleteTier = async (id) => prisma.tier.delete({
    where: { id }
});

const reorderTiers = async (tierIds) => prisma.$transaction(
    tierIds.map((id, index) => prisma.tier.update({
        where: { id },
        data: { order: index }
    }))
);

module.exports = {
    getTiers,
    createTier,
    updateTier,
    deleteTier,
    reorderTiers,
};
