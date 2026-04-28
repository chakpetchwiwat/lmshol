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

const uploadToSupabase = async (req, res, { forceSubDir } = {}) => {
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
        // Use 'secure-documents' bucket for sensitive files, 'uploads' for public images
        const isSensitive = forceSubDir === 'certificates' || !isImage;
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

        res.json({
            message: 'Upload successful!',
            fileUrl,
            fileKey: fileName,
            fileName: forceSubDir ? req.file.originalname : fileName,
            fileMimeType: req.file.mimetype
        });

    } catch (err) {
        logSecurityEvent('upload.failed', req, {
            reason: err.message
        });
        console.error('Upload Error:', err);
        res.status(500).json({ message: 'Upload failed', error: err.message });
    }
};

// POST /api/upload/certificate - User-owned certificate attachments
router.post('/certificate', verifyToken, uploadRateLimiter, upload.single('file'), async (req, res) => {
    await uploadToSupabase(req, res, { forceSubDir: 'certificates' });
});

// POST /api/upload - Upload to Supabase Storage
router.post('/', verifyToken, verifyAdminPanelAccess, uploadRateLimiter, upload.single('file'), async (req, res) => {
    await uploadToSupabase(req, res);
});

module.exports = router;
