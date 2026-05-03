const bcrypt = require('bcryptjs');
const prisma = require('../../utils/prisma');
const authHelpers = require('../../utils/auth.helpers');

const mapPublicUser = authHelpers.mapUserRecord;

const updateProfile = async (userId, data) => {
    const { currentPassword, newPassword } = data;
    const dataToUpdate = {};

    if (currentPassword && newPassword) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const validPassword = await bcrypt.compare(currentPassword, user.password);

        if (!validPassword) {
            throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง');
        }

        dataToUpdate.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.prototype.hasOwnProperty.call(data, 'signatureImageUrl')) {
        const signatureImageUrl = data.signatureImageUrl ? String(data.signatureImageUrl).trim() : null;
        dataToUpdate.signatureImageUrl = signatureImageUrl || null;
    }

    if (Object.prototype.hasOwnProperty.call(data, 'signatureTitle')) {
        const signatureTitle = data.signatureTitle ? String(data.signatureTitle).trim() : null;
        dataToUpdate.signatureTitle = signatureTitle || null;
    }

    if (Object.keys(dataToUpdate).length > 0) {
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: dataToUpdate,
            include: {
                departmentRef: true,
                tier: true,
                courseStaff: { take: 1 }
            }
        });

        return mapPublicUser(updatedUser);
    }

    const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            departmentRef: true,
            tier: true,
            courseStaff: { take: 1 }
        }
    });

    return mapPublicUser(currentUser);
};

module.exports = {
    updateProfile
};
