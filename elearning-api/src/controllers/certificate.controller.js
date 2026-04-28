const certificateService = require('../services/admin/certificate.service');
const prisma = require('../utils/prisma');
const { COURSE_MANAGEMENT_ACCESS, canManageCourse } = require('../utils/coursePermissions');

const ErrorResponse = require('../utils/errorResponse');

/**
 * Helper to check if user has FULL access to a course
 */
async function requireManagementAccess(user, courseId) {
  const { access } = await canManageCourse(user, courseId);
  if (access !== COURSE_MANAGEMENT_ACCESS.FULL && access !== COURSE_MANAGEMENT_ACCESS.LIMITED) {
    throw new ErrorResponse('Forbidden: Course management access required', 403);
  }
}

/**
 * Manual issue certificate
 */
exports.issueManual = async (req, res, next) => {
  try {
    const { courseId, userId } = req.params;
    const issuedById = req.user.id;

    await requireManagementAccess(req.user, courseId);

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { certificateSetting: { select: { enabled: true } } }
    });

    if (!course?.certificateSetting?.enabled) {
      return res.status(400).json({
        success: false,
        message: 'ระบบเกียรติบัตรถูกปิดใช้งานสำหรับคอร์สนี้ กรุณาเปิดใช้งานในส่วนข้อมูลพื้นฐานก่อน'
      });
    }

    const certificate = await certificateService.issueCertificate({
      courseId,
      userId,
      issuedById,
      manual: true
    });

    // Trigger async generation
    certificateService.generateCertificatePdfAsync(certificate.id).catch(err => {
      console.error(`[Certificate] Manual generation trigger failed | id=${certificate.id}:`, err);
    });

    res.status(202).json({
      success: true,
      data: {
        certificateId: certificate.id,
        certificateNo: certificate.certificateNo,
        status: certificate.status
      },
      message: 'Certificate generation started'
    });
  } catch (error) {
    // Handle known service errors with appropriate status codes
    if (error.message.includes('already has')) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.includes('enrolled')) {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

/**
 * Reissue certificate
 */
exports.reissue = async (req, res, next) => {
  try {
    const { certificateId } = req.params;
    
    const cert = await prisma.certificate.findUnique({ where: { id: certificateId } });
    if (!cert) return next(new ErrorResponse('Certificate not found', 404));

    await requireManagementAccess(req.user, cert.courseId);

    const updatedCert = await certificateService.reissueCertificate({
      certificateId,
      requestedById: req.user.id
    });

    // Trigger async generation
    certificateService.generateCertificatePdfAsync(updatedCert.id).catch(err => {
      console.error(`[Certificate] Reissue generation trigger failed | id=${updatedCert.id}:`, err);
    });

    res.status(202).json({
      success: true,
      data: {
        certificateId: updatedCert.id,
        status: updatedCert.status
      },
      message: 'Certificate reissue started'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Revoke certificate
 */
exports.revoke = async (req, res, next) => {
  try {
    const { certificateId } = req.params;
    const { reason = 'Revoked by administrator' } = req.body;

    const cert = await prisma.certificate.findUnique({ where: { id: certificateId } });
    if (!cert) return next(new ErrorResponse('Certificate not found', 404));

    await requireManagementAccess(req.user, cert.courseId);

    const revokedCert = await certificateService.revokeCertificate({
      certificateId,
      revokedById: req.user.id,
      reason
    });

    res.json({
      success: true,
      data: {
        certificateId: revokedCert.id,
        status: revokedCert.status,
        revokedAt: revokedCert.revokedAt
      },
      message: 'Certificate has been revoked'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's VALID certificates
 */
exports.getMyCertificates = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const certificates = await certificateService.getMyCertificates(userId);
    res.json(certificates);
  } catch (error) {
    next(error);
  }
};

/**
 * Get a temporary signed download URL
 */
exports.getDownloadUrl = async (req, res, next) => {
  try {
    const { certificateId } = req.params;
    const result = await certificateService.createCertificateSignedUrl({
      certificateId,
      requester: req.user
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Retry failed certificate generation
 */
exports.retry = async (req, res, next) => {
  try {
    const { certificateId } = req.params;

    const cert = await prisma.certificate.findUnique({ where: { id: certificateId } });
    if (!cert) return next(new ErrorResponse('Certificate not found', 404));

    await requireManagementAccess(req.user, cert.courseId);

    const updatedCert = await certificateService.retryCertificatePdfGeneration({
      certificateId,
      requestedById: req.user.id
    });

    res.json({
      success: true,
      data: {
        certificateId: updatedCert.id,
        status: updatedCert.status
      },
      message: 'Certificate retry started'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public verification
 */
exports.verifyPublic = async (req, res, next) => {
  try {
    const { token } = req.params;
    const result = await certificateService.verifyCertificate(token);

    if (!result.success) {
      return res.status(result.status === 'REVOKED' ? 403 : 404).json(result);
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all certificates for a course (Admin/Owner) with summary
 */
exports.getCourseCertificates = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    await requireManagementAccess(req.user, courseId);

    const [course, certificates] = await Promise.all([
      prisma.course.findUnique({
        where: { id: courseId },
        include: { certificateSetting: { select: { enabled: true } } }
      }),
      prisma.certificate.findMany({
        where: { courseId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { issuedAt: 'desc' }
      })
    ]);

    // Calculate Summary Safely
    const summary = {
      total: certificates.length,
      valid: 0,
      pending: 0,
      failed: 0,
      revoked: 0,
      expired: 0
    };

    certificates.forEach(c => {
      if (!c.status) return;
      const s = String(c.status).toLowerCase();
      if (summary[s] !== undefined) {
        summary[s]++;
      }
    });

    res.json({
      success: true,
      summary,
      data: certificates,
      hasCertificate: course?.certificateSetting?.enabled || false
    });
  } catch (error) {
    console.error(`[Certificate] getCourseCertificates Error | courseId=${req.params.courseId}:`, error);
    next(error);
  }
};
