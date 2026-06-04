const bcrypt = require('bcryptjs');
const prisma = require('../../utils/prisma');
const authHelpers = require('../../utils/auth.helpers');

const mapPublicUser = authHelpers.mapUserRecord;
const MAX_PROFILE_ITEMS = 50;
const MAX_PROFILE_TEXT_LENGTH = 300;
const PROFILE_FILE_KEY_PREFIX = 'certificates/';

const normalizeString = (value) => {
    const normalized = value ? String(value).trim() : '';
    return normalized || null;
};

const truncateString = (value, maxLength = MAX_PROFILE_TEXT_LENGTH) => {
    const normalized = normalizeString(value);
    if (!normalized) return '';
    return normalized.slice(0, maxLength);
};

const normalizeProfileFileKey = (value) => {
    const fileKey = normalizeString(value);
    if (!fileKey) return '';
    const isAllowed = fileKey.startsWith('secure/certificates/') || fileKey.startsWith('certificates/');
    if (!isAllowed || fileKey.includes('..')) {
        throw new Error('Invalid profile file key');
    }
    return fileKey;
};

const normalizeUploadedAt = (value) => {
    const normalized = normalizeString(value);
    if (!normalized) return '';

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    return parsed.toISOString();
};

const normalizeProfileItems = (items, fields) => {
    if (!Array.isArray(items)) return [];

    return items
        .slice(0, MAX_PROFILE_ITEMS)
        .map((item) => {
            const normalized = {
                id: normalizeString(item?.id) || `${Date.now()}-${Math.random().toString(36).slice(2)}`
            };

            fields.forEach((field) => {
                if (field === 'fileKey') {
                    normalized[field] = normalizeProfileFileKey(item?.[field]);
                } else if (field === 'uploadedAt') {
                    normalized[field] = normalizeUploadedAt(item?.[field]);
                } else {
                    normalized[field] = truncateString(item?.[field]);
                }
            });

            return normalized;
        })
        .filter((item) => fields.some((field) => item[field]));
};

const updateProfile = async (userId, data) => {
    const { currentPassword, newPassword } = data;
    const dataToUpdate = {};

    if (currentPassword && newPassword) {
        if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
            throw new Error('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 8 ตัวอักษร มีตัวอักษรพิมพ์ใหญ่ภาษาอังกฤษอย่างน้อย 1 ตัว (A-Z) และอักขระพิเศษอย่างน้อย 1 ตัว');
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        const validPassword = await bcrypt.compare(currentPassword, user.password);

        if (!validPassword) {
            throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง');
        }

        dataToUpdate.password = await bcrypt.hash(newPassword, 10);
        dataToUpdate.mustChangePassword = false;
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
