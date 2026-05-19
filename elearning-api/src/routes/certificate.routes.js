const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificate.controller');
const { verifyToken } = require('../middleware/auth');
const { auditRequest } = require('../services/audit.service');

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
router.get('/:certificateId/download-url', verifyToken, auditRequest('certificate.download_url.created', { entityType: 'certificate', includeBody: false }), certificateController.getDownloadUrl);

/**
 * Certificate Management (Admin/Owner)
 */
router.post('/:certificateId/retry', verifyToken, auditRequest('certificate.retry', { entityType: 'certificate' }), certificateController.retry);
router.post('/:certificateId/reissue', verifyToken, auditRequest('certificate.reissue', { entityType: 'certificate' }), certificateController.reissue);
router.post('/:certificateId/revoke', verifyToken, auditRequest('certificate.revoke', { entityType: 'certificate' }), certificateController.revoke);

module.exports = router;
