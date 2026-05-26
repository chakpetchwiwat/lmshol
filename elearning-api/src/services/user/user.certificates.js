const prisma = require('../../utils/prisma');
const jwt = require('jsonwebtoken');

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
        fileMimeType: normalizeOptionalText(data.fileMimeType),
        trainingType: normalizeOptionalText(data.trainingType),
        trainingItem: normalizeOptionalText(data.trainingItem),
        trainingDetails: normalizeOptionalText(data.trainingDetails),
        trainingVenue: normalizeOptionalText(data.trainingVenue),
        trainingDays: normalizeOptionalText(data.trainingDays),
        intakeNo: normalizeOptionalText(data.intakeNo)
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

const getCertificateSignedUrl = async (userId, certificateId) => {
    // 1. Try to find in user-uploaded certificates first
    let cert = await prisma.userCertificate.findFirst({
        where: { id: certificateId, userId }
    });

    let isLms = false;
    let fileKey = null;
    let bucket = 'secure-documents';

    if (cert) {
        fileKey = cert.fileKey;
    } else {
        // 2. Try to find in LMS certificates
        const lmsCert = await prisma.certificate.findFirst({
            where: { id: certificateId, userId }
        });

        if (lmsCert) {
            cert = lmsCert;
            isLms = true;
            bucket = 'uploads';
            
            // Extract storage path from pdfUrl
            if (cert.pdfUrl) {
                try {
                    const url = new URL(cert.pdfUrl);
                    const match = url.pathname.match(/\/public\/(uploads|secure-documents)\/(.+)$/);
                    if (match) {
                        fileKey = match[2];
                        bucket = match[1];
                    } else {
                        fileKey = cert.pdfUrl; // Fallback
                    }
                } catch {
                    fileKey = cert.pdfUrl;
                }
            }
        }
    }

    if (!cert) {
        throw new Error('ไม่พบ certificate');
    }

    if (!fileKey) {
        throw new Error('ไม่มีไฟล์แนบสำหรับ certificate นี้');
    }

    let cleanFileKey = fileKey;
    if (cleanFileKey.startsWith('/uploads/')) {
        cleanFileKey = cleanFileKey.replace(/^\/uploads\//, '');
    } else if (cleanFileKey.startsWith('uploads/')) {
        cleanFileKey = cleanFileKey.replace(/^uploads\//, '');
    }

    if (!cleanFileKey.startsWith('secure/') && !cleanFileKey.startsWith('public/')) {
        cleanFileKey = 'secure/' + cleanFileKey;
    }

    const token = jwt.sign(
        { fileKey: cleanFileKey, originalName: cert.fileName || cert.title || 'certificate.pdf' },
        process.env.JWT_SECRET,
        { expiresIn: 3600 }
    );
    const signedUrl = `/api/upload/secure/${token}`;

    return { url: signedUrl };
};

module.exports = {
    getCertificates,
    createCertificate,
    updateCertificate,
    deleteCertificate,
    getCertificateSignedUrl
};
