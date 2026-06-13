const prisma = require('../../../utils/prisma');

/**
 * Bulk assigns a mentor to multiple sheep (mentees)
 * @param {Array<string>} sheepIds - Array of user IDs to assign the mentor to
 * @param {string|null} mentorId - The ID of the mentor user, or null to remove mentor
 */
const bulkAssignMentor = async (sheepIds, mentorId) => {
    if (!Array.isArray(sheepIds) || sheepIds.length === 0) {
        throw new Error('Please select at least one sheep to assign.');
    }

    return await prisma.$transaction(async (tx) => {
        // Validate mentor if provided
        if (mentorId) {
            const mentor = await tx.user.findUnique({
                where: { id: mentorId },
                select: { id: true, name: true }
            });
            if (!mentor) {
                throw new Error('The specified mentor was not found.');
            }
        }

        // Verify all target sheep users exist
        const sheepCount = await tx.user.count({
            where: {
                id: { in: sheepIds }
            }
        });

        if (sheepCount !== sheepIds.length) {
            throw new Error('One or more selected sheep users do not exist.');
        }

        // Perform bulk update
        const updated = await tx.user.updateMany({
            where: {
                id: { in: sheepIds }
            },
            data: {
                mentorId: mentorId || null
            }
        });

        return {
            count: updated.count,
            message: `Successfully assigned mentor to ${updated.count} users.`
        };
    });
};

/**
 * Transfers all sheep from one mentor to another mentor
 * @param {string} fromMentorId - ID of the current mentor
 * @param {string} toMentorId - ID of the new mentor
 */
const bulkTransferMentor = async (fromMentorId, toMentorId) => {
    if (!fromMentorId || !toMentorId) {
        throw new Error('Both current mentor and new mentor must be specified.');
    }

    if (fromMentorId === toMentorId) {
        throw new Error('Current mentor and new mentor cannot be the same person.');
    }

    return await prisma.$transaction(async (tx) => {
        // Validate both mentors exist
        const mentors = await tx.user.findMany({
            where: {
                id: { in: [fromMentorId, toMentorId] }
            },
            select: { id: true }
        });

        if (mentors.length !== 2) {
            throw new Error('One or both specified mentors were not found.');
        }

        // Perform transfer update
        const updated = await tx.user.updateMany({
            where: {
                mentorId: fromMentorId
            },
            data: {
                mentorId: toMentorId
            }
        });

        return {
            count: updated.count,
            message: `Successfully transferred ${updated.count} sheep to the new mentor.`
        };
    });
};

module.exports = {
    bulkAssignMentor,
    bulkTransferMentor
};
