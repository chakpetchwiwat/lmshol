const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const { getSecurityConfig } = require('../config/security');
const { verifyToken, verifyAdminPanelAccess } = require('../middleware/auth');
const { uploadRateLimiter } = require('../middleware/rateLimiters');
const { logSecurityEvent } = require('../utils/securityEvents');
const { validateUploadedFile, ALLOWED_UPLOAD_TYPES } = require('../utils/uploadValidation');

const router = express.Router();
const securityConfig = getSecurityConfig();

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

// POST /api/upload - Upload to Supabase Storage
router.post('/', verifyToken, verifyAdminPanelAccess, uploadRateLimiter, upload.single('file'), async (req, res) => {
    try {
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
        const bucketName = 'uploads';
        const subDir = isImage ? 'images' : 'documents';
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

        const fileUrl = isImage ? publicUrl : fileName;

        res.json({
            message: 'Upload successful!',
            fileUrl,
            fileKey: fileName,
            fileName
        });

    } catch (err) {
        logSecurityEvent('upload.failed', req, {
            reason: err.message
        });
        console.error('Upload Error:', err);
        res.status(500).json({ message: 'Upload failed', error: err.message });
    }
});

module.exports = router;
