const bcrypt = require('bcryptjs');
const prisma = require('../../utils/prisma');
const authHelpers = require('../../utils/auth.helpers');

const mapPublicUser = authHelpers.mapUserRecord;

const normalizeString = (value) => {
    const normalized = value ? String(value).trim() : '';
    return normalized || null;
};

const normalizeProfileItems = (items, fields) => {
    if (!Array.isArray(items)) return [];

    return items
        .map((item) => {
            const normalized = {
                id: normalizeString(item?.id) || `${Date.now()}-${Math.random().toString(36).slice(2)}`
            };

            fields.forEach((field) => {
                normalized[field] = normalizeString(item?.[field]) || '';
            });

            return normalized;
        })
        .filter((item) => fields.some((field) => item[field]));
};

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
        dataToUpdate.signatureImageUrl = normalizeString(data.signatureImageUrl);
    }

    if (Object.prototype.hasOwnProperty.call(data, 'signatureTitle')) {
        dataToUpdate.signatureTitle = normalizeString(data.signatureTitle);
    }

    if (Object.prototype.hasOwnProperty.call(data, 'profileImageUrl')) {
        dataToUpdate.profileImageUrl = normalizeString(data.profileImageUrl);
    }

    if (Object.prototype.hasOwnProperty.call(data, 'educationHistory')) {
        dataToUpdate.educationHistory = normalizeProfileItems(data.educationHistory, [
            'institution',
            'degree',
            'faculty',
            'major',
            'graduationYear'
        ]);
    }

    if (Object.prototype.hasOwnProperty.call(data, 'profileFiles')) {
        dataToUpdate.profileFiles = normalizeProfileItems(data.profileFiles, [
            'title',
            'fileName',
            'fileKey',
            'fileUrl',
            'fileMimeType',
            'uploadedAt'
        ]);
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
