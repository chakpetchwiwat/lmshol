const prisma = require('../../utils/prisma');

const getOrganizationPresets = async () => prisma.organizationPreset.findMany({
    orderBy: { createdAt: 'desc' }
});

const createOrganizationPreset = async (input) => prisma.organizationPreset.create({
    data: {
        name: input.name,
        signatureTitle: input.signatureTitle,
        signatureImageUrl: input.signatureImageUrl,
        stampImageUrl: input.stampImageUrl
    }
});

const updateOrganizationPreset = async (id, input) => prisma.organizationPreset.update({
    where: { id },
    data: {
        name: input.name,
        signatureTitle: input.signatureTitle,
        signatureImageUrl: input.signatureImageUrl,
        stampImageUrl: input.stampImageUrl
    }
});

const deleteOrganizationPreset = async (id) => prisma.organizationPreset.delete({
    where: { id }
});

module.exports = {
    getOrganizationPresets,
    createOrganizationPreset,
    updateOrganizationPreset,
    deleteOrganizationPreset
};
