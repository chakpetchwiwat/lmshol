const prisma = require('../../utils/prisma');
const crypto = require('crypto');

/**
 * Generates a unique, readable certificate number using DB sequence
 * Format: CERT-{YYYY}-{COURSE_PREFIX}-{SERIAL}
 */
async function generateCertificateNo(tx, course) {
  // 1. Get next serial from sequence (PostgreSQL)
  const [{ nextval }] = await tx.$queryRaw`SELECT nextval('certificate_serial_seq')::bigint as nextval`;

  const year = new Date().getFullYear();

  // 2. Resolve course prefix
  // Priority: 1. Code 2. Title prefix 3. ID prefix
  let rawPrefix = course.code || course.title || course.id;
  const prefix = rawPrefix
    .substring(0, 6)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') || 'CERT';

  const serial = String(nextval).padStart(6, '0');

  return `CERT-${year}-${prefix}-${serial}`;
}

/**
 * Resolves the signer for a course based on settings
 */
async function resolveCertificateSigner(tx, courseId, setting) {
  if (!setting) return null;

  const snapshot = {
    name: null,
    title: null,
    signatureImageUrl: null
  };

  if (setting.signatureType === 'CUSTOM') {
    if (!setting.signerNameOverride) {
      throw new Error('Signer name override is required for CUSTOM signature type');
    }
    snapshot.name = setting.signerNameOverride;
    snapshot.title = setting.signerTitleOverride || '';
    snapshot.signatureImageUrl = setting.signatureImageUrl || null;
  } else if (setting.signatureType === 'INSTRUCTOR') {
    // Find primary instructor from CourseStaff
    const primaryStaff = await tx.courseStaff.findFirst({
      where: {
        courseId,
        role: 'instructor',
        isPrimary: true
      },
      include: { user: true }
    });

    if (primaryStaff?.user) {
      snapshot.name = primaryStaff.user.name;
      snapshot.title = primaryStaff.user.signatureTitle || 'Instructor';
      snapshot.signatureImageUrl = primaryStaff.user.signatureImageUrl || null;
    } else {
      // Fallback to legacy course instructor fields
      const course = await tx.course.findUnique({ where: { id: courseId } });
      snapshot.name = course?.instructorName || 'ทีมงานวิทยากร';
      snapshot.title = course?.instructorRole || 'Instructor';
      snapshot.signatureImageUrl = course?.instructorAvatar || null;
    }
  } else {
    // ORGANIZATION - use system defaults (mocked for MVP)
    snapshot.name = 'ผู้อำนวยการสถาบัน';
    snapshot.title = 'Director';
    snapshot.signatureImageUrl = null;
  }

  return snapshot;
}

async function resolveInstructorSigner(tx, courseId, slot = {}) {
  let presetSigner = null;
  if (slot.instructorPresetId) {
    const preset = await tx.instructorPreset.findUnique({
      where: { id: slot.instructorPresetId }
    });

    if (preset) {
      presetSigner = {
        name: preset.name,
        title: preset.signatureTitle || preset.role,
        signatureImageUrl: preset.signatureImageUrl
      };
    }
  }

  const legacySigner = await resolveCertificateSigner(tx, courseId, {
    signatureType: 'INSTRUCTOR'
  });

  return {
    type: 'INSTRUCTOR',
    label: slot.label || 'Instructor signature',
    name: slot.name || presetSigner?.name || legacySigner?.name || 'Instructor',
    title: slot.title || presetSigner?.title || legacySigner?.title || 'Instructor',
    signatureImageUrl: slot.signatureImageUrl || presetSigner?.signatureImageUrl || legacySigner?.signatureImageUrl || null,
    ...(slot.instructorPresetId ? { instructorPresetId: slot.instructorPresetId } : {})
  };
}

async function resolveCertificateSignatureSlots(tx, courseId, setting) {
  const configuredSlots = Array.isArray(setting?.signatureSlots)
    ? setting.signatureSlots.filter((slot) => slot && slot.enabled !== false).slice(0, 2)
    : [];

  if (configuredSlots.length === 0) {
    const signer = await resolveCertificateSigner(tx, courseId, setting);
    return signer ? [{ ...signer, label: 'Signature' }] : [];
  }

  const signers = [];

  for (const slot of configuredSlots) {
    if (slot.type === 'INSTRUCTOR') {
      signers.push(await resolveInstructorSigner(tx, courseId, slot));
      continue;
    }

    if (slot.type === 'ORGANIZATION') {
      let orgName = slot.name;
      let orgTitle = slot.title;
      let orgSignature = slot.signatureImageUrl;
      let orgStamp = slot.stampImageUrl;

      if (slot.organizationPresetId) {
        const preset = await tx.organizationPreset.findUnique({
          where: { id: slot.organizationPresetId }
        });
        if (preset) {
          orgName = orgName || preset.name;
          orgTitle = orgTitle || preset.signatureTitle;
          orgSignature = orgSignature || preset.signatureImageUrl;
          orgStamp = orgStamp || preset.stampImageUrl;
        }
      }

      signers.push({
        ...(slot.id ? { id: slot.id } : {}),
        type: 'ORGANIZATION',
        label: slot.label || 'Organization signature',
        name: (orgName || '').trim() || process.env.ORGANIZATION_SIGNER_NAME || 'ผู้อำนวยการสถาบัน',
        title: (orgTitle || '').trim() || process.env.ORGANIZATION_SIGNER_TITLE || 'Director',
        signatureImageUrl: orgSignature || null,
        stampImageUrl: orgStamp || null,
        ...(slot.organizationPresetId ? { organizationPresetId: slot.organizationPresetId } : {})
      });
      continue;
    }

    if (slot.type === 'CUSTOM' && !slot.name) {
      throw new Error(`${slot.label || 'Signature'} name is required`);
    }

    signers.push({
      type: slot.type || 'CUSTOM',
      label: slot.label || 'Signature',
      name: slot.name || 'Signature',
      title: slot.title || '',
      signatureImageUrl: slot.signatureImageUrl || null
    });
  }

  return signers;
}

/**
 * Main service to issue a certificate
 */
async function issueCertificate({ courseId, userId, issuedById = null, manual = false }) {
  return await prisma.$transaction(async (tx) => {
    // 1. Load entities and settings
    const [user, course] = await Promise.all([
      tx.user.findUnique({ where: { id: userId } }),
      tx.course.findUnique({
        where: { id: courseId },
        include: {
          certificateSetting: {
            include: { template: true }
          }
        }
      })
    ]);

    if (!user) throw new Error('User not found');
    if (!course) throw new Error('Course not found');

    // 2. Validate enrollment
    const enrollment = await tx.userCourse.findUnique({
      where: { userId_courseId: { userId, courseId } }
    });

    if (!enrollment) throw new Error('User is not enrolled in this course');

    // 3. Completion check
    if (!manual && enrollment.status.toLowerCase() !== 'completed') {
      throw new Error('Course must be completed before automatic issuance');
    }

    // 4. Validate settings
    const setting = course.certificateSetting;
    if (!setting || !setting.enabled) {
      throw new Error('Certificate issuing is disabled for this course');
    }

    // 5. Duplicate check
    const existing = await tx.certificate.findFirst({
      where: {
        userId,
        courseId,
        status: { not: 'REVOKED' }
      }
    });

    if (existing) {
      throw new Error('User already has an active certificate for this course');
    }

    // 6. Data preparation
    const certificateId = crypto.randomUUID();
    const verificationToken = crypto.randomUUID();
    
    // Resolve signers BEFORE generating certificate number to avoid wasting a number if signer resolution fails
    const signer = await resolveCertificateSigner(tx, courseId, setting);
    const signers = await resolveCertificateSignatureSlots(tx, courseId, setting);

    // Generate number as the LAST step before creation
    const certificateNo = await generateCertificateNo(tx, course);

    // 7. Create record
    const certificate = await tx.certificate.create({
      data: {
        id: certificateId,
        certificateNo,
        verificationToken,
        userId,
        courseId,
        templateId: setting.templateId,
        status: 'PENDING',
        issuedById,
        metadata: {
          version: 1,
          learner: { id: user.id, name: user.name },
          course: { id: course.id, title: course.title },
          signer,
          signers,
          template: { id: setting.template.id, name: setting.template.name },
          issue: { mode: setting.issueMode, manual },
          issuedAt: new Date().toISOString()
        }
      }
    });

    // Decide if we should trigger auto-generation based on mode
    const shouldAutoGenerate = !manual && setting.issueMode === 'AUTOMATIC';

    return { certificate, shouldAutoGenerate };
  });
}

/**
 * Reissue an existing certificate
 */
async function reissueCertificate({ certificateId, requestedById }) {
  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: {
      course: {
        include: {
          certificateSetting: {
            include: { template: true }
          }
        }
      }
    }
  });

  if (!cert) throw new Error('Certificate not found');
  if (cert.status === 'REVOKED') throw new Error('Cannot reissue a revoked certificate');

  const signer = cert.course?.certificateSetting
    ? await resolveCertificateSigner(prisma, cert.courseId, cert.course.certificateSetting)
    : cert.metadata?.signer;
  const signers = cert.course?.certificateSetting
    ? await resolveCertificateSignatureSlots(prisma, cert.courseId, cert.course.certificateSetting)
    : cert.metadata?.signers;

  return await prisma.certificate.update({
    where: { id: certificateId },
    data: {
      status: 'PENDING',
      pdfUrl: null,
      templateId: cert.course?.certificateSetting?.templateId || cert.templateId,
      metadata: {
        ...(cert.metadata || {}),
        signer,
        signers,
        template: cert.course?.certificateSetting?.template ? {
          id: cert.course.certificateSetting.template.id,
          name: cert.course.certificateSetting.template.name
        } : cert.metadata?.template,
        reissuedAt: new Date().toISOString(),
        reissuedById: requestedById
      }
    }
  });
}

/**
 * Revoke a certificate
 */
async function revokeCertificate({ certificateId, revokedById, reason }) {
  if (!reason) throw new Error('Revocation reason is required');

  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId }
  });

  if (!cert) throw new Error('Certificate not found');

  return await prisma.certificate.update({
    where: { id: certificateId },
    data: {
      status: 'REVOKED',
      revokedById,
      revokedAt: new Date().toISOString(),
      revokeReason: reason
    }
  });
}

/**
 * Get VALID certificates for current user
 */
async function getMyCertificates(userId) {
  const certs = await prisma.certificate.findMany({
    where: { 
      userId, 
      status: { in: ['VALID', 'PENDING'] } 
    },
    include: { course: { select: { title: true } } },
    orderBy: { issuedAt: 'desc' }
  });

  return certs.map(c => ({
    id: c.id,
    certificateNo: c.certificateNo,
    status: c.status,
    courseTitle: c.course.title,
    issuedAt: c.issuedAt,
    expiresAt: c.expiresAt,
    pdfUrl: c.pdfUrl,
    metadata: c.metadata
  }));
}

/**
 * Verify a certificate by token
 */
async function verifyCertificate(token) {
  const cert = await prisma.certificate.findUnique({
    where: { verificationToken: token },
    include: {
      user: { select: { name: true } },
      course: { select: { title: true } }
    }
  });

  if (!cert) return { success: false, message: 'Certificate not found' };

  if (cert.status === 'REVOKED') {
    return {
      success: false,
      status: 'REVOKED',
      message: 'This certificate has been revoked'
    };
  }

  if (cert.status !== 'VALID') {
    return {
      success: false,
      status: cert.status,
      message: 'Certificate is currently unavailable'
    };
  }

  return {
    success: true,
    status: 'VALID',
    data: {
      id: cert.id,
      status: cert.status,
      certificateNo: cert.certificateNo,
      learnerName: cert.user.name,
      courseTitle: cert.course.title,
      issuedAt: cert.issuedAt,
      expiresAt: cert.expiresAt,
      metadata: cert.metadata
    }
  };
}

/**
 * Compatibility helper to extract storage path from old public Supabase URLs
 */
function extractStoragePath(pdfUrl) {
  if (!pdfUrl) return { bucket: 'uploads', path: null };
  if (!pdfUrl.startsWith('http')) return { bucket: 'uploads', path: pdfUrl };

  try {
    const url = new URL(pdfUrl);
    // Standard Supabase public URL: .../storage/v1/object/public/{bucket}/certificates/...
    const match = url.pathname.match(/\/public\/(uploads|secure-documents)\/(.+)$/);
    if (match) {
      return { bucket: match[1], path: match[2] };
    }
    return { bucket: 'uploads', path: pdfUrl };
  } catch {
    return { bucket: 'uploads', path: pdfUrl };
  }
}

/**
 * Generates a temporary signed URL for certificate download
 */
async function createCertificateSignedUrl({ certificateId, requester }) {
  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId }
  });

  if (!cert) throw new Error('Certificate not found');
  if (cert.status !== 'VALID') throw new Error(`Certificate is not available (Status: ${cert.status})`);
  if (!cert.pdfUrl) throw new Error('Certificate file is missing');

  // Validate Access
  if (!requester) throw new ErrorResponse('Authentication required', 401);

  const requesterId = requester.userId || requester.id;
  let hasAccess = false;

  // 1. Owner
  if (requesterId === cert.userId) hasAccess = true;

  // 2. Admin/Manager with full access to course
  if (!hasAccess) {
    const { canManageCourse, COURSE_MANAGEMENT_ACCESS } = require('../../utils/coursePermissions');
    const { access } = await canManageCourse(requester, cert.courseId);
    if (access === COURSE_MANAGEMENT_ACCESS.FULL || access === COURSE_MANAGEMENT_ACCESS.LIMITED) {
      hasAccess = true;
    }
  }

  if (!hasAccess) throw new ErrorResponse('Forbidden: You do not have permission to access this certificate', 403);

  const supabase = require('../../utils/supabase');
  const { bucket, path: storagePath } = extractStoragePath(cert.pdfUrl);
  const expiresIn = parseInt(process.env.CERTIFICATE_SIGNED_URL_EXPIRES_SECONDS || '300', 10);

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.error(`[Certificate] Signed URL failed | id=${certificateId} | bucket=${bucket} | path=${storagePath}:`, error);
    throw new Error(`Storage Error: ${error.message} (Bucket: ${bucket})`);
  }

  if (!data?.signedUrl) {
    throw new Error('Storage Error: Failed to retrieve signed URL from Supabase');
  }

  console.log(`[Certificate] download_url.created | id=${certificateId} | user=${requesterId} | bucket=${bucket}`);

  return {
    url: data.signedUrl,
    expiresIn
  };
}

/**
 * Retries generation for a FAILED certificate
 */
async function retryCertificatePdfGeneration({ certificateId, requestedById }) {
  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId }
  });

  if (!cert) throw new Error('Certificate not found');
  if (cert.status !== 'FAILED') throw new Error('Only failed certificates can be retried');

  const updated = await prisma.certificate.update({
    where: { id: certificateId },
    data: {
      status: 'PENDING',
      metadata: {
        ...(cert.metadata || {}),
        retryCount: (cert.metadata?.retryCount || 0) + 1,
        lastRetryAt: new Date().toISOString(),
        lastRetryById: requestedById,
        lastError: null
      }
    }
  });

  console.log(`[Certificate] retry.started | id=${certificateId} | by=${requestedById} | count=${updated.metadata.retryCount}`);

  // Trigger async generation
  generateCertificatePdfAsync(certificateId);

  return updated;
}

const certificatePdfService = require('./certificatePdf.service');
const templateRenderer = require('../../utils/certificateTemplateRenderer');
const { buildCertificateVerificationUrl } = require('../../utils/certificateUrl');

/**
 * Async PDF generation logic (Real Implementation)
 */
async function generateCertificatePdfAsync(certificateId) {
  const startTime = Date.now();
  let certNo = 'unknown';

  try {
    const cert = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        course: { include: { certificateSetting: true } },
        user: true,
        template: true
      }
    });

    if (!cert) return;
    certNo = cert.certificateNo;

    console.log(`[Certificate] pdf.started | id=${certificateId} | no=${certNo}`);

    // 1. Prepare verification URL
    const verificationUrl = buildCertificateVerificationUrl(cert.verificationToken);
    const currentSigners = cert.course?.certificateSetting
      ? await resolveCertificateSignatureSlots(prisma, cert.courseId, cert.course.certificateSetting)
      : null;
    const effectiveSigners = Array.isArray(currentSigners) && currentSigners.length > 0
      ? currentSigners
      : (cert.metadata?.signers || (cert.metadata?.signer ? [cert.metadata.signer] : []));
    const effectiveSigner = effectiveSigners[0] || cert.metadata?.signer || {};

    // 2. Render HTML
    const html = templateRenderer.renderCertificateHtml({
      template: cert.template,
      certificate: cert,
      metadata: {
        ...(cert.metadata || {}),
        signer: effectiveSigner,
        signers: effectiveSigners
      },
      verificationUrl
    });

    // 3. Generate PDF Buffer
    const pdfBuffer = await certificatePdfService.generatePdfBuffer(html, {
      orientation: cert.template.orientation,
      fallbackData: {
        templateId: cert.templateId,
        certificateNo: cert.certificateNo,
        learnerName: cert.metadata?.learner?.name || cert.user?.name,
        courseTitle: cert.metadata?.course?.title || cert.course?.title,
        signerName: effectiveSigner.name,
        signerTitle: effectiveSigner.title,
        signatureImageUrl: effectiveSigner.signatureImageUrl,
        signers: effectiveSigners,
        issuedAt: cert.metadata?.issuedAt
          ? new Date(cert.metadata.issuedAt).toISOString().slice(0, 10)
          : new Date(cert.issuedAt).toISOString().slice(0, 10),
        verificationUrl
      }
    });

    // 4. Upload to Storage
    const pdfPath = await certificatePdfService.uploadCertificatePdf({
      buffer: pdfBuffer,
      userId: cert.userId,
      certificateId: cert.id
    });

    // 5. Update status to VALID
    const updatedCert = await prisma.certificate.update({
      where: { id: certificateId },
      data: {
        status: 'VALID',
        pdfUrl: pdfPath,
        metadata: {
          ...(cert.metadata || {}),
          pdfGeneratedAt: new Date().toISOString()
        }
      }
    });

    const duration = Date.now() - startTime;
    console.log(`[Certificate] pdf.success | id=${certificateId} | no=${certNo} | duration=${duration}ms`);
    return updatedCert;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Certificate] pdf.failed | id=${certificateId} | no=${certNo} | duration=${duration}ms | error=${error.message}`);

    // Update status to FAILED
    const current = await prisma.certificate.findUnique({ where: { id: certificateId } });
    return await prisma.certificate.update({
      where: { id: certificateId },
      data: {
        status: 'FAILED',
        metadata: {
          ...(current?.metadata || {}),
          lastError: error.message,
          failedAt: new Date().toISOString()
        }
      }
    });
  }
}

/**
 * Get pending certificates across all courses the user can manage
 */
async function getPendingApprovals({ user, status = 'PENDING' }) {
  const where = { status };
  const isAdmin = user.role === 'admin' || user.effectiveRole === 'admin' || user.isAdmin === true;

  const certificates = await prisma.certificate.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, department: true } },
      course: { select: { id: true, title: true } }
    },
    orderBy: { issuedAt: 'desc' }
  });

  if (isAdmin) return certificates;

  const { COURSE_MANAGEMENT_ACCESS, canManageCourse } = require('../../utils/coursePermissions');
  const allowed = [];

  for (const certificate of certificates) {
    const { access } = await canManageCourse(user, certificate.courseId);
    if (access === COURSE_MANAGEMENT_ACCESS.FULL || access === COURSE_MANAGEMENT_ACCESS.LIMITED) {
      allowed.push(certificate);
    }
  }

  return allowed;
}

/**
 * List all certificates for admin monitoring
 */
async function listAllCertificates({ page = 1, limit = 20, status, search }) {
  const skip = (page - 1) * limit;
  const where = {};

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { certificateNo: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { course: { title: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const [total, items] = await Promise.all([
    prisma.certificate.count({ where }),
    prisma.certificate.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, department: true } },
        course: { select: { id: true, title: true } }
      },
      orderBy: { issuedAt: 'desc' },
      skip,
      take: limit
    })
  ]);

  return {
    items,
    total,
    pages: Math.ceil(total / limit)
  };
}

module.exports = {
  issueCertificate,
  reissueCertificate,
  revokeCertificate,
  getMyCertificates,
  verifyCertificate,
  generateCertificateNo,
  resolveCertificateSigner,
  resolveCertificateSignatureSlots,
  generateCertificatePdfAsync,
  createCertificateSignedUrl,
  retryCertificatePdfGeneration,
  getPendingApprovals,
  listAllCertificates
};
