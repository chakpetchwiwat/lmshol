const prisma = require('../../utils/prisma');
const { sanitizeName } = require('./admin.helpers');

const getInstructorPresets = async () => prisma.instructorPreset.findMany({
    orderBy: [
        { name: 'asc' },
        { createdAt: 'desc' }
    ]
});

const createInstructorPreset = async (input) => prisma.instructorPreset.create({
    data: {
        name: sanitizeName(input.name, 'Instructor preset'),
        role: input.role || null,
        avatar: input.avatar || null,
        bio: input.bio || null
    }
});

const updateInstructorPreset = async (id, input) => prisma.instructorPreset.update({
    where: { id },
    data: {
        name: sanitizeName(input.name, 'Instructor preset'),
        role: input.role || null,
        avatar: input.avatar || null,
        bio: input.bio || null
    }
});

const deleteInstructorPreset = async (id) => prisma.instructorPreset.delete({
    where: { id }
});

module.exports = {
    getInstructorPresets,
    createInstructorPreset,
    updateInstructorPreset,
    deleteInstructorPreset,
};
