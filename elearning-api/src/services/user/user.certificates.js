const prisma = require('../../utils/prisma');
const supabase = require('../../utils/supabase');

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
    // 1. Get user-uploaded certificates
    const userCerts = await prisma.userCertificate.findMany({
        where: { userId },
        orderBy: [
            { issueDate: 'desc' },
            { createdAt: 'desc' }
        ]
    });

    // 2. Get LMS-issued certificates (from Certificate table)
    const lmsCerts = await prisma.certificate.findMany({
        where: { userId },
        orderBy: { issuedAt: 'desc' },
        include: {
            course: { select: { title: true } },
            template: { select: { name: true } }
        }
    });

    // 3. Normalize and combine
    const normalizedLmsCerts = lmsCerts.map(c => ({
        id: c.id,
        isLms: true,
        status: c.status,
        certificateNo: c.certificateNo,
        courseTitle: c.course?.title,
        issuer: 'ScaleUp Learning Management System',
        issueDate: c.issuedAt,
        pdfUrl: c.pdfUrl,
        metadata: c.metadata,
        createdAt: c.issuedAt
    }));

    const normalizedUserCerts = userCerts.map(c => ({
        ...c,
        isLms: false
    }));

    // Combine and sort by date
    return [...normalizedLmsCerts, ...normalizedUserCerts].sort((a, b) => {
        const dateA = new Date(a.issueDate || a.createdAt);
        const dateB = new Date(b.issueDate || b.createdAt);
        return dateB - dateA;
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

    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(fileKey, 3600); // 1 hour

    if (error) {
        throw new Error(`ไม่สามารถสร้างลิงก์ดาวน์โหลดได้: ${error.message}`);
    }

    return { url: data.signedUrl };
};

module.exports = {
    getCertificates,
    createCertificate,
    updateCertificate,
    deleteCertificate,
    getCertificateSignedUrl
};
