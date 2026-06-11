const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const { getSecurityConfig } = require('../config/security');
const { verifyToken, verifyAdminPanelAccess } = require('../middleware/auth');
const { uploadRateLimiter } = require('../middleware/rateLimiters');
const { logSecurityEvent } = require('../utils/securityEvents');
const { validateUploadedFile, ALLOWED_UPLOAD_TYPES } = require('../utils/uploadValidation');
const { ADMIN_PANEL_PERMISSIONS, ADMIN_PANEL_ROLES } = require('../utils/constants/roles');
const prisma = require('../utils/prisma');
const { getActorContext } = require('../services/admin/admin.helpers');
const { buildScopedUserWhere } = require('../services/admin/admin.queries');
const { writeAuditLog } = require('../services/audit.service');

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

const fs = require('fs/promises');
const jwt = require('jsonwebtoken');

// We need to ensure uploads directory exists
const UPLOADS_DIR = process.env.NODE_ENV === 'production' ? '/var/www/html/uploads' : path.join(__dirname, '../../uploads');

const ensureDir = async (dirPath) => {
    try { await fs.access(dirPath); }
    catch { await fs.mkdir(dirPath, { recursive: true }); }
};

const createSecureDocumentSignedUrl = async (fileKey, originalName = null, expiresIn = 900) => {
    const token = jwt.sign({ fileKey, originalName }, process.env.JWT_SECRET, { expiresIn });
    return `/api/upload/secure/${token}`;
};

const scanExistingUploads = async () => {
    const list = [];
    const publicDir = path.join(UPLOADS_DIR, 'public');
    try {
        await fs.access(publicDir);
    } catch {
        return list; // Directory doesn't exist yet
    }

    const recurse = async (dir) => {
        const items = await fs.readdir(dir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory()) {
                await recurse(fullPath);
            } else {
                if (item.name === 'metadata.json') continue;
                const fileKey = path.relative(UPLOADS_DIR, fullPath).replace(/\\/g, '/');
                const stat = await fs.stat(fullPath);
                let fileMimeType = 'image/png';
                const lowerKey = fileKey.toLowerCase();
                if (lowerKey.endsWith('.pdf')) fileMimeType = 'application/pdf';
                else if (lowerKey.endsWith('.mp3')) fileMimeType = 'audio/mpeg';
                else if (lowerKey.endsWith('.mp4')) fileMimeType = 'video/mp4';
                else if (lowerKey.endsWith('.webm')) fileMimeType = 'video/webm';
                else if (lowerKey.endsWith('.webp')) fileMimeType = 'image/webp';
                else if (lowerKey.endsWith('.jpg') || lowerKey.endsWith('.jpeg')) fileMimeType = 'image/jpeg';
                else if (lowerKey.endsWith('.gif')) fileMimeType = 'image/gif';
                else if (lowerKey.endsWith('.svg')) fileMimeType = 'image/svg+xml';
                else if (lowerKey.endsWith('.doc')) fileMimeType = 'application/msword';
                else if (lowerKey.endsWith('.docx')) fileMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                else if (lowerKey.endsWith('.xls')) fileMimeType = 'application/vnd.ms-excel';
                else if (lowerKey.endsWith('.xlsx')) fileMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

                list.push({
                    fileKey,
                    fileUrl: `/uploads/${fileKey}`,
                    fileName: item.name,
                    fileMimeType,
                    createdAt: stat.mtime.toISOString()
                });
            }
        }
    };
    
    await recurse(publicDir);
    // Sort by modified time descending
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
};

const appendToMediaLibrary = async (record) => {
    try {
        const metadataPath = path.join(UPLOADS_DIR, 'metadata.json');
        let list = [];
        try {
            const data = await fs.readFile(metadataPath, 'utf8');
            list = JSON.parse(data);
        } catch (e) {
            try {
                list = await scanExistingUploads();
            } catch (scanErr) {
                list = [];
            }
        }
        list.unshift(record);
        await fs.writeFile(metadataPath, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
        console.error('Error writing to media library metadata:', err);
    }
};

const uploadToLocalDisk = async (req, res, { forceSubDir, includeSignedUrl = false } = {}) => {
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
        const isSensitive = privateSubDirs.has(forceSubDir);
        const visibilityDir = isSensitive ? 'secure' : 'public';
        const subDir = forceSubDir || (isImage ? 'images' : 'documents');
        const ext = path.extname(req.file.originalname);
        
        const fileKey = `${visibilityDir}/${subDir}/${crypto.randomUUID()}${ext.toLowerCase()}`;
        const absolutePath = path.join(UPLOADS_DIR, fileKey);

        await ensureDir(path.dirname(absolutePath));
        await fs.writeFile(absolutePath, req.file.buffer);

        const fileUrl = isSensitive ? null : `/uploads/${fileKey}`;

        if (!isSensitive) {
            await appendToMediaLibrary({
                fileKey,
                fileUrl,
                fileName: req.file.originalname,
                fileMimeType: req.file.mimetype,
                createdAt: new Date().toISOString()
            });
        }

        const payload = {
            message: 'Upload successful!',
            fileUrl,
            fileKey,
            fileName: forceSubDir ? req.file.originalname : fileKey,
            fileMimeType: req.file.mimetype
        };

        if (isSensitive && includeSignedUrl) {
            payload.signedUrl = await createSecureDocumentSignedUrl(fileKey, req.file.originalname);
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
        ADMIN_PANEL_PERMISSIONS.includes(user.permission)
        || ADMIN_PANEL_ROLES.includes(user.role)
        || user.tier?.accessAdmin
        || (user.courseStaff && user.courseStaff.length > 0)
    )
);

const canPreviewSignature = async (authUser, fileKey) => {
    const user = await prisma.user.findUnique({
        where: { id: authUser.userId },
        select: {
            signatureImageUrl: true,
            permission: true,
            roles: true,
            tier: true,
            courseStaff: { take: 1, select: { id: true } }
        }
    });

    if (user?.signatureImageUrl === fileKey) {
        return true;
    }

    if (!hasAdminPanelAccess({ ...user, role: user.roles?.[0] || user.permission })) {
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

const canPreviewProfileFile = async (authUser, fileKey) => {
    const user = await prisma.user.findUnique({
        where: { id: authUser.userId },
        select: { profileFiles: true }
    });

    const files = Array.isArray(user?.profileFiles) ? user.profileFiles : [];
    const matchedFile = files.find((file) => file?.fileKey === fileKey);
    if (matchedFile) {
        return { allowed: true, ownerUserId: authUser.userId, accessType: 'owner', fileName: matchedFile.fileName };
    }

    const actor = await getActorContext(authUser);
    if (!actor.canAccessAdminPanel) {
        return { allowed: false };
    }

    const usersWithProfileFiles = await prisma.user.findMany({
        select: {
            id: true,
            profileFiles: true
        }
    });

    let matchedFileAdmin = null;
    const matchedUser = usersWithProfileFiles.find((candidate) => {
        if (Array.isArray(candidate.profileFiles)) {
            const found = candidate.profileFiles.find((file) => file?.fileKey === fileKey);
            if (found) {
                matchedFileAdmin = found;
                return true;
            }
        }
        return false;
    });

    if (!matchedUser) {
        return { allowed: false };
    }

    const scopedUser = await prisma.user.findFirst({
        where: await buildScopedUserWhere(actor, matchedUser.id),
        select: { id: true }
    });

    return {
        allowed: Boolean(scopedUser),
        ownerUserId: matchedUser.id,
        accessType: 'admin-scoped',
        fileName: matchedFileAdmin ? matchedFileAdmin.fileName : null
    };
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
    await uploadToLocalDisk(req, res, { forceSubDir: 'certificates' });
});

// POST /api/upload/profile-image - Current user's public profile image
router.post('/profile-image', verifyToken, uploadRateLimiter, upload.single('file'), async (req, res) => {
    if (!req.file?.mimetype?.startsWith('image/')) {
        return res.status(400).json({ message: 'Profile image must be an image file.' });
    }

    await uploadToLocalDisk(req, res, { forceSubDir: 'profile-images' });
});

// POST /api/upload/profile-file - Current user's private profile attachments
router.post('/profile-file', verifyToken, uploadRateLimiter, upload.single('file'), async (req, res) => {
    await uploadToLocalDisk(req, res, { forceSubDir: 'certificates', includeSignedUrl: true });
});

// POST /api/upload/assessment - Learner assessment submissions
router.post('/assessment', verifyToken, uploadRateLimiter, upload.single('file'), async (req, res) => {
    await uploadToLocalDisk(req, res, { forceSubDir: 'assessments' });
});

// GET /api/upload/signature-url - Temporary preview URL for a signature the user can access
router.get('/signature-url', verifyToken, async (req, res) => {
    try {
        const fileKey = String(req.query.key || '').trim();

        if (!fileKey || !fileKey.includes('signatures/')) {
            return res.status(400).json({ message: 'Invalid signature key.' });
        }

        const allowed = await canPreviewSignature(req.user, fileKey);
        if (!allowed) {
            return res.status(403).json({ message: 'You do not have access to this signature.' });
        }

        const signedUrl = await createSecureDocumentSignedUrl(fileKey, path.basename(fileKey));
        return res.json({ url: signedUrl });
    } catch (error) {
        console.error('Signature signed URL error:', error);
        return res.status(500).json({ message: 'Unable to create signature preview URL.' });
    }
});

// GET /api/upload/profile-file-url - Temporary URL for current user's profile attachment
router.get('/profile-file-url', verifyToken, async (req, res) => {
    try {
        const fileKey = String(req.query.key || '').trim();

        if (!fileKey || !fileKey.includes('certificates/')) {
            return res.status(400).json({ message: 'Invalid profile file key.' });
        }

        const access = await canPreviewProfileFile(req.user, fileKey);
        if (!access.allowed) {
            await writeAuditLog({
                req,
                action: 'profile_file.access_denied',
                entityType: 'profileFile',
                entityId: fileKey,
                statusCode: 403,
                metadata: { fileKey }
            });
            return res.status(403).json({ message: 'You do not have access to this file.' });
        }

        const signedUrl = await createSecureDocumentSignedUrl(fileKey, access.fileName);
        await writeAuditLog({
            req,
            action: 'profile_file.signed_url.created',
            entityType: 'user',
            entityId: access.ownerUserId,
            statusCode: 200,
            metadata: {
                fileKey,
                accessType: access.accessType
            }
        });
        return res.json({ url: signedUrl });
    } catch (error) {
        console.error('Profile file signed URL error:', error);
        return res.status(500).json({ message: 'Unable to create file preview URL.' });
    }
});

// POST /api/upload/signature - Instructor signature images for certificate signing
router.post('/signature', verifyToken, uploadRateLimiter, upload.single('file'), async (req, res) => {
    const signatureError = validateSignatureImage(req.file);
    if (signatureError) {
        return res.status(400).json({ message: signatureError });
    }

    await uploadToLocalDisk(req, res, { forceSubDir: 'signatures', includeSignedUrl: true });
});

// POST /api/upload - Upload to local disk
router.post('/', verifyToken, verifyAdminPanelAccess, uploadRateLimiter, upload.single('file'), async (req, res) => {
    await uploadToLocalDisk(req, res);
});

// GET /api/upload/secure/:token - Serve a secure file if JWT is valid
router.get('/secure/:token', async (req, res) => {
    try {
        const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
        const { fileKey, originalName } = decoded;
        
        // Prevent path traversal
        const normalizedKey = path.normalize(fileKey).replace(/^(\.\.(\/|\\|$))+/, '');
        let absolutePath = path.join(UPLOADS_DIR, normalizedKey);
        
        // Try local file exists checks with secure, public, and public/uploads subdirectories
        const possiblePaths = [
            absolutePath,
            path.join(UPLOADS_DIR, 'secure', normalizedKey),
            path.join(UPLOADS_DIR, 'public', normalizedKey),
            path.join(UPLOADS_DIR, 'public/uploads', normalizedKey)
        ];

        for (const p of possiblePaths) {
            try {
                await fs.access(p);
                absolutePath = p;
                break;
            } catch (err) {
                // Try next path
            }
        }
        
        // Ensure it only serves from allowed secure/private directories to prevent arbitrary file read
        const isAllowedPath = 
            absolutePath.includes(path.join('secure', '')) ||
            absolutePath.includes(path.join('public', '')) ||
            absolutePath.includes(path.join('certificates', '')) ||
            absolutePath.includes(path.join('assessments', '')) ||
            absolutePath.includes(path.join('signatures', ''));
            
        if (!isAllowedPath) {
            return res.status(403).send('Forbidden access to non-secure directory');
        }

        if (originalName) {
            let decodedOriginalName = originalName;
            try {
                decodedOriginalName = decodeURIComponent(originalName);
            } catch (e) {
                // Ignore decoding error
            }
            const asciiFilename = decodedOriginalName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '_');
            const encodedName = encodeURIComponent(decodedOriginalName);
            res.setHeader('Content-Disposition', `inline; filename="${asciiFilename}"; filename*=UTF-8''${encodedName}`);
        }

        res.sendFile(absolutePath);
    } catch (err) {
        console.error('Secure stream verification failed:', err);
        return res.status(403).send('Invalid or expired signed URL');
    }
});

// GET /api/upload/media-library - List and search uploaded files
router.get('/media-library', verifyToken, verifyAdminPanelAccess, async (req, res) => {
    try {
        const metadataPath = path.join(UPLOADS_DIR, 'metadata.json');
        let list = [];
        try {
            const data = await fs.readFile(metadataPath, 'utf8');
            list = JSON.parse(data);
        } catch (e) {
            try {
                list = await scanExistingUploads();
                // Save the scanned list so next time we don't have to rescan
                await fs.writeFile(metadataPath, JSON.stringify(list, null, 2), 'utf8');
            } catch (scanErr) {
                list = [];
            }
        }
        
        const search = String(req.query.search || '').trim().toLowerCase();
        if (search) {
            list = list.filter(item => 
                String(item.fileName).toLowerCase().includes(search) ||
                String(item.fileKey).toLowerCase().includes(search)
            );
        }
        
        res.json(list);
    } catch (err) {
        console.error('Error reading media library:', err);
        res.status(500).json({ message: 'Failed to read media library', error: err.message });
    }
});

module.exports = router;
