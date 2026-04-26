const prisma = require('../../utils/prisma');

const normalizeOptionalText = (value) => {
    if (value === undefined || value === null) return null;

    const normalized = String(value).trim();
    return normalized || null;
};

const parseOptionalDate = (value) => {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error('รูปแบบวันที่ไม่ถูกต้อง');
    }

    return date;
};

const normalizeCertificatePayload = (data = {}) => {
    const title = normalizeOptionalText(data.title);
    const issuer = normalizeOptionalText(data.issuer);

    if (!title) {
        throw new Error('กรุณาระบุชื่อ certificate');
    }

    if (!issuer) {
        throw new Error('กรุณาระบุหน่วยงานที่ออก certificate');
    }

    const noExpiration = Boolean(data.noExpiration);

    return {
        title,
        issuer,
        issueDate: parseOptionalDate(data.issueDate),
        expirationDate: noExpiration ? null : parseOptionalDate(data.expirationDate),
        noExpiration,
        credentialId: normalizeOptionalText(data.credentialId),
        credentialUrl: normalizeOptionalText(data.credentialUrl),
        fileUrl: normalizeOptionalText(data.fileUrl),
        fileKey: normalizeOptionalText(data.fileKey),
        fileName: normalizeOptionalText(data.fileName),
        fileMimeType: normalizeOptionalText(data.fileMimeType)
    };
};

const getCertificates = async (userId) => {
    return prisma.userCertificate.findMany({
        where: { userId },
        orderBy: [
            { issueDate: 'desc' },
            { createdAt: 'desc' }
        ]
    });
};

const createCertificate = async (userId, data) => {
    return prisma.userCertificate.create({
        data: {
            userId,
            ...normalizeCertificatePayload(data)
        }
    });
};

const updateCertificate = async (userId, certificateId, data) => {
    const existingCertificate = await prisma.userCertificate.findFirst({
        where: {
            id: certificateId,
            userId
        }
    });

    if (!existingCertificate) {
        throw new Error('ไม่พบ certificate ที่ต้องการแก้ไข');
    }

    return prisma.userCertificate.update({
        where: { id: certificateId },
        data: normalizeCertificatePayload(data)
    });
};

const deleteCertificate = async (userId, certificateId) => {
    const existingCertificate = await prisma.userCertificate.findFirst({
        where: {
            id: certificateId,
            userId
        }
    });

    if (!existingCertificate) {
        throw new Error('ไม่พบ certificate ที่ต้องการลบ');
    }

    await prisma.userCertificate.delete({
        where: { id: certificateId }
    });

    return { id: certificateId };
};

module.exports = {
    getCertificates,
    createCertificate,
    updateCertificate,
    deleteCertificate
};
