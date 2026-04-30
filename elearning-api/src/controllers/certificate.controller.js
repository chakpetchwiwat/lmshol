const certificateService = require('../services/admin/certificate.service');
const prisma = require('../utils/prisma');
const { COURSE_MANAGEMENT_ACCESS, canManageCourse } = require('../utils/coursePermissions');

const ErrorResponse = require('../utils/errorResponse');

const getRequestUserId = (req) => req.user?.userId || req.user?.id;

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
    const issuedById = getRequestUserId(req);

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

    // Trigger generation (Awaiting to ensure completion on Vercel/Production)
    const finalCert = await certificateService.generateCertificatePdfAsync(certificate.id);

    res.status(finalCert?.status === 'VALID' ? 201 : 202).json({
      success: true,
      data: {
        certificateId: certificate.id,
        certificateNo: certificate.certificateNo,
        status: finalCert?.status || certificate.status
      },
      message: finalCert?.status === 'VALID'
        ? 'Certificate issued and generated successfully'
        : 'Certificate issued, but generation is still processing'
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
      requestedById: getRequestUserId(req)
    });

    const finalCert = await certificateService.generateCertificatePdfAsync(updatedCert.id);

    res.json({
      success: true,
      data: {
        certificateId: updatedCert.id,
        status: finalCert?.status || updatedCert.status
      },
      message: finalCert?.status === 'VALID'
        ? 'Certificate has been approved and generated'
        : 'Certificate generation failed'
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
      revokedById: getRequestUserId(req),
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
    const userId = getRequestUserId(req);
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
      requestedById: getRequestUserId(req)
    });

    // Await generation for Vercel stability
    const finalCert = await certificateService.generateCertificatePdfAsync(updatedCert.id);

    res.json({
      success: true,
      data: {
        certificateId: updatedCert.id,
        status: finalCert?.status || updatedCert.status
      },
      message: finalCert?.status === 'VALID'
        ? 'Certificate regenerated successfully'
        : 'Certificate regeneration failed'
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
      // Map both uppercase and lowercase to ensure counting
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

/**
 * Get all pending certificates across all courses the user can manage
 */
exports.getPendingApprovals = async (req, res, next) => {
  try {
    const { status = 'PENDING' } = req.query;

    // Admins see all, others filtered by course staff
    const certificates = await certificateService.getPendingApprovals({
      user: req.user,
      status: status.toUpperCase()
    });

    res.json({
      success: true,
      data: certificates
    });
  } catch (error) {
    next(error);
  }
};
