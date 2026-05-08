const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const path = require('path');
const { getSecurityConfig } = require('../config/security');
const { verifyToken, verifyAdminPanelAccess } = require('../middleware/auth');
const { uploadRateLimiter } = require('../middleware/rateLimiters');
const { logSecurityEvent } = require('../utils/securityEvents');
const { validateUploadedFile, ALLOWED_UPLOAD_TYPES } = require('../utils/uploadValidation');
const { ADMIN_PANEL_ROLES } = require('../utils/constants/roles');
const prisma = require('../utils/prisma');

const router = express.Router();
const securityConfig = getSecurityConfig();

// Supabase client is now managed centrally in ../config/supabase

// Use Memory Storage for Serverless (Vercel)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (ALLOWED_UPLOAD_TYPES[file.mimetype]) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: securityConfig.uploadMaxFileSizeBytes }
});

const createSecureDocumentSignedUrl = async (fileKey, expiresIn = 3600) => {
    const { data, error } = await supabase.storage
        .from('secure-documents')
        .createSignedUrl(fileKey, expiresIn);

    if (error || !data?.signedUrl) {
        throw error || new Error('Failed to create signed URL');
    }

    return data.signedUrl;
};

const uploadToSupabase = async (req, res, { forceSubDir, includeSignedUrl = false } = {}) => {
    try {
        if (req.file) {
            req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        }
        const fileValidation = validateUploadedFile(req.file);
        if (!fileValidation.valid) {
            logSecurityEvent('upload.rejected', req, {
                reason: fileValidation.message,
                mimeType: req.file?.mimetype || null,
                originalName: req.file?.originalname || null
            });

            return res.status(400).json({ message: fileValidation.message });
        }

        const isImage = req.file.mimetype.startsWith('image/');
        const privateSubDirs = new Set(['certificates', 'assessments', 'signatures']);
        // Use 'secure-documents' bucket for sensitive files, 'uploads' for public images
        // We only treat it as sensitive if it's explicitly in a private subdirectory.
        // General uploads (like lesson documents) should be public even if they are not images.
        const isSensitive = privateSubDirs.has(forceSubDir);
        const bucketName = isSensitive ? 'secure-documents' : 'uploads';
        const subDir = forceSubDir || (isImage ? 'images' : 'documents');
        const ext = path.extname(req.file.originalname);
        const fileName = `${subDir}/${crypto.randomUUID()}${ext.toLowerCase()}`;

        const { error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (error) {
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        // For sensitive files, we don't return a public URL as it's private.
        // Frontend must use the signed URL endpoint.
        const fileUrl = isSensitive ? null : publicUrl;

        const payload = {
            message: 'Upload successful!',
            fileUrl,
            fileKey: fileName,
            fileName: forceSubDir ? req.file.originalname : fileName,
            fileMimeType: req.file.mimetype
        };

        if (isSensitive && includeSignedUrl) {
            payload.signedUrl = await createSecureDocumentSignedUrl(fileName);
        }

        res.json(payload);
        return payload;

    } catch (err) {
        logSecurityEvent('upload.failed', req, {
            reason: err.message
        });
        console.error('Upload Error:', err);
        res.status(500).json({ message: 'Upload failed', error: err.message });
    }
};

const hasAdminPanelAccess = (user) => Boolean(
    user && (
        ADMIN_PANEL_ROLES.includes(user.role)
        || user.tier?.accessAdmin
        || (user.courseStaff && user.courseStaff.length > 0)
    )
);

const canPreviewSignature = async (authUser, fileKey) => {
    const user = await prisma.user.findUnique({
        where: { id: authUser.userId },
        select: {
            signatureImageUrl: true,
            role: true,
            tier: true,
            courseStaff: { take: 1, select: { id: true } }
        }
    });

    if (user?.signatureImageUrl === fileKey) {
        return true;
    }

    if (!hasAdminPanelAccess(user)) {
        return false;
    }

    const [instructorPreset, organizationPreset] = await Promise.all([
        prisma.instructorPreset.findFirst({
            where: { signatureImageUrl: fileKey },
            select: { id: true }
        }),
        prisma.organizationPreset.findFirst({
            where: { signatureImageUrl: fileKey },
            select: { id: true }
        })
    ]);

    return Boolean(instructorPreset || organizationPreset);
};

const readPngMetadata = (buffer) => {
    if (!buffer || buffer.length < 33 || !buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        return null;
    }

    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
        colorType: buffer[25],
        hasAlpha: buffer[25] === 4 || buffer[25] === 6 || buffer.includes(Buffer.from('tRNS', 'ascii'))
    };
};

const readWebpMetadata = (buffer) => {
    if (!buffer || buffer.length < 30 || !buffer.subarray(0, 4).equals(Buffer.from('RIFF', 'ascii')) || !buffer.subarray(8, 12).equals(Buffer.from('WEBP', 'ascii'))) {
        return null;
    }

    let offset = 12;
    while (offset + 8 <= buffer.length) {
        const chunkType = buffer.subarray(offset, offset + 4).toString('ascii');
        const chunkSize = buffer.readUInt32LE(offset + 4);
        const chunkStart = offset + 8;

        if (chunkType === 'VP8X' && chunkStart + 10 <= buffer.length) {
            const flags = buffer[chunkStart];
            const width = 1 + buffer.readUIntLE(chunkStart + 4, 3);
            const height = 1 + buffer.readUIntLE(chunkStart + 7, 3);
            return { width, height, hasAlpha: Boolean(flags & 0x10) };
        }

        if (chunkType === 'VP8L' && chunkStart + 5 <= buffer.length) {
            const b1 = buffer[chunkStart + 1];
            const b2 = buffer[chunkStart + 2];
            const b3 = buffer[chunkStart + 3];
            const b4 = buffer[chunkStart + 4];
            const width = 1 + (((b2 & 0x3f) << 8) | b1);
            const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
            return { width, height, hasAlpha: true };
        }

        offset = chunkStart + chunkSize + (chunkSize % 2);
    }

    return null;
};

const validateSignatureImage = (file) => {
    if (!file) {
        return 'Please select a signature image.';
    }

    if (!['image/png', 'image/webp'].includes(file.mimetype)) {
        return 'Signature must be a PNG or WebP image.';
    }

    const metadata = file.mimetype === 'image/png'
        ? readPngMetadata(file.buffer)
        : readWebpMetadata(file.buffer);

    if (!metadata) {
        return 'Unable to read signature image dimensions.';
    }

    if (metadata.width !== 1000 || metadata.height !== 300) {
        return 'Signature image must be exactly 1000 x 300 px.';
    }

    if (!metadata.hasAlpha) {
        return 'Signature image must have a transparent background.';
    }

    return null;
};

// POST /api/upload/certificate - User-owned certificate attachments
router.post('/certificate', verifyToken, uploadRateLimiter, upload.single('file'), async (req, res) => {
    await uploadToSupabase(req, res, { forceSubDir: 'certificates' });
});

// POST /api/upload/assessment - Learner assessment submissions
router.post('/assessment', verifyToken, uploadRateLimiter, upload.single('file'), async (req, res) => {
    await uploadToSupabase(req, res, { forceSubDir: 'assessments' });
});

// GET /api/upload/signature-url - Temporary preview URL for a signature the user can access
router.get('/signature-url', verifyToken, async (req, res) => {
    try {
        const fileKey = String(req.query.key || '').trim();

        if (!fileKey || !fileKey.startsWith('signatures/')) {
            return res.status(400).json({ message: 'Invalid signature key.' });
        }

        const allowed = await canPreviewSignature(req.user, fileKey);
        if (!allowed) {
            return res.status(403).json({ message: 'You do not have access to this signature.' });
        }

        const signedUrl = await createSecureDocumentSignedUrl(fileKey);
        return res.json({ url: signedUrl });
    } catch (error) {
        console.error('Signature signed URL error:', error);
        return res.status(500).json({ message: 'Unable to create signature preview URL.' });
    }
});

// POST /api/upload/signature - Instructor signature images for certificate signing
router.post('/signature', verifyToken, uploadRateLimiter, upload.single('file'), async (req, res) => {
    const signatureError = validateSignatureImage(req.file);
    if (signatureError) {
        return res.status(400).json({ message: signatureError });
    }

    await uploadToSupabase(req, res, { forceSubDir: 'signatures', includeSignedUrl: true });
});

// POST /api/upload - Upload to Supabase Storage
router.post('/', verifyToken, verifyAdminPanelAccess, uploadRateLimiter, upload.single('file'), async (req, res) => {
    await uploadToSupabase(req, res);
});

module.exports = router;
