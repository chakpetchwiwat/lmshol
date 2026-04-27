const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificate.controller');
const { verifyToken } = require('../middleware/auth');

/**
 * Public Verification
 * GET /api/certificates/verify/:token
 */
router.get('/verify/:token', certificateController.verifyPublic);

/**
 * My Certificates
 * GET /api/certificates/me
 */
router.get('/me', verifyToken, certificateController.getMyCertificates);
router.get('/:certificateId/download-url', verifyToken, certificateController.getDownloadUrl);

/**
 * Certificate Management (Admin/Owner)
 */
router.post('/:certificateId/retry', verifyToken, certificateController.retry);
router.post('/:certificateId/reissue', verifyToken, certificateController.reissue);
router.post('/:certificateId/revoke', verifyToken, certificateController.revoke);

module.exports = router;
