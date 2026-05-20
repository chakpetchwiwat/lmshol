const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const systemController = require('../controllers/system.controller');
const certificateController = require('../controllers/certificate.controller');
const { verifyToken, verifyAdmin, verifySuperAdmin, verifyAdminOrManager, verifyAdminPanelAccess, verifyCourseAccess } = require('../middleware/auth');
const { adminAnalyticsRateLimiter } = require('../middleware/rateLimiters');
const { auditRequest } = require('../services/audit.service');

router.use(verifyToken, verifyAdminPanelAccess); // Admin + manager can access the admin panel

router.get('/dashboard', verifyAdminOrManager, adminAnalyticsRateLimiter, adminController.getDashboardStats);
router.get('/analytics', verifyAdminOrManager, adminAnalyticsRateLimiter, adminController.getAdvancedAnalytics);
router.get('/system/health', verifySuperAdmin, systemController.getSystemHealth);
router.post('/system/security/reset', verifySuperAdmin, systemController.resetRateLimit);

router.get('/users', adminController.getUsers);
router.get('/users/:id/details', auditRequest('admin.user_details.viewed', { entityType: 'user', includeBody: false }), adminController.getUserDetails);
router.post('/users', verifySuperAdmin, auditRequest('admin.user.created', { entityType: 'user' }), adminController.createUser);
router.put('/users/:id', verifySuperAdmin, auditRequest('admin.user.updated', { entityType: 'user' }), adminController.updateUser);
router.delete('/users/:id', verifySuperAdmin, auditRequest('admin.user.deleted', { entityType: 'user', includeBody: false }), adminController.deleteUser);

router.get('/departments', adminController.getDepartments);
router.post('/departments', verifySuperAdmin, auditRequest('admin.department.created', { entityType: 'department' }), adminController.createDepartment);
router.put('/departments/:id', verifySuperAdmin, auditRequest('admin.department.updated', { entityType: 'department' }), adminController.updateDepartment);
router.delete('/departments/:id', verifySuperAdmin, auditRequest('admin.department.deleted', { entityType: 'department', includeBody: false }), adminController.deleteDepartment);

router.get('/cohort-roles', adminController.getCohortRoles);
router.post('/cohort-roles', verifySuperAdmin, auditRequest('admin.cohort_role.created', { entityType: 'cohortRole' }), adminController.createCohortRole);
router.put('/cohort-roles/reorder', verifySuperAdmin, auditRequest('admin.cohort_role.reordered', { entityType: 'cohortRole' }), adminController.reorderCohortRoles);
router.put('/cohort-roles/:id', verifySuperAdmin, auditRequest('admin.cohort_role.updated', { entityType: 'cohortRole' }), adminController.updateCohortRole);
router.delete('/cohort-roles/:id', verifySuperAdmin, auditRequest('admin.cohort_role.deleted', { entityType: 'cohortRole', includeBody: false }), adminController.deleteCohortRole);

router.get('/tiers', adminController.getTiers);
router.post('/tiers', verifySuperAdmin, auditRequest('admin.tier.created', { entityType: 'tier' }), adminController.createTier);
router.put('/tiers/reorder', verifySuperAdmin, auditRequest('admin.tier.reordered', { entityType: 'tier' }), adminController.reorderTiers);
router.put('/tiers/:id', verifySuperAdmin, auditRequest('admin.tier.updated', { entityType: 'tier' }), adminController.updateTier);
router.delete('/tiers/:id', verifySuperAdmin, auditRequest('admin.tier.deleted', { entityType: 'tier', includeBody: false }), adminController.deleteTier);

router.get('/instructor-presets', adminController.getInstructorPresets);
router.post('/instructor-presets', verifySuperAdmin, adminController.createInstructorPreset);
router.put('/instructor-presets/:id', verifySuperAdmin, adminController.updateInstructorPreset);
router.delete('/instructor-presets/:id', verifySuperAdmin, adminController.deleteInstructorPreset);

router.get('/organization-presets', adminController.getOrganizationPresets);
router.post('/organization-presets', verifySuperAdmin, adminController.createOrganizationPreset);
router.put('/organization-presets/:id', verifySuperAdmin, adminController.updateOrganizationPreset);
router.delete('/organization-presets/:id', verifySuperAdmin, adminController.deleteOrganizationPreset);

router.get('/courses', adminController.getAdminCourses);
router.post('/courses', verifyAdmin, auditRequest('admin.course.created', { entityType: 'course' }), adminController.createCourse);
router.put('/courses/:id/republish', verifySuperAdmin, auditRequest('admin.course.republished', { entityType: 'course' }), adminController.republishCourse);
router.put('/courses/:id/archive', verifySuperAdmin, auditRequest('admin.course.archived', { entityType: 'course' }), adminController.archiveCourse);
router.get('/courses/:id/history', verifyCourseAccess, adminController.getCourseHistory);
router.put('/courses/:id', verifyCourseAccess, auditRequest('admin.course.updated', { entityType: 'course' }), adminController.updateCourse);
router.delete('/courses/:id', verifySuperAdmin, auditRequest('admin.course.deleted', { entityType: 'course', includeBody: false }), adminController.deleteCourse);

router.get('/announcements', verifyAdminOrManager, adminController.getAdminAnnouncements);
router.post('/announcements', verifyAdminOrManager, auditRequest('admin.announcement.created', { entityType: 'announcement' }), adminController.createAnnouncement);
router.get('/announcements/:id/history', verifyAdminOrManager, adminController.getAnnouncementHistory);
router.put('/announcements/:id/republish', verifyAdminOrManager, auditRequest('admin.announcement.republished', { entityType: 'announcement' }), adminController.republishAnnouncement);
router.put('/announcements/:id/archive', verifyAdminOrManager, auditRequest('admin.announcement.archived', { entityType: 'announcement' }), adminController.archiveAnnouncement);
router.put('/announcements/:id', verifyAdminOrManager, auditRequest('admin.announcement.updated', { entityType: 'announcement' }), adminController.updateAnnouncement);
router.delete('/announcements/:id', verifyAdminOrManager, auditRequest('admin.announcement.deleted', { entityType: 'announcement', includeBody: false }), adminController.deleteAnnouncement);

router.get('/categories', adminController.getCategories);
router.post('/categories', verifySuperAdmin, adminController.createCategory);
router.put('/categories/reorder', verifySuperAdmin, adminController.reorderCategories);
router.put('/categories/:id/republish', verifySuperAdmin, adminController.republishCategory);
router.put('/categories/:id/archive', verifySuperAdmin, adminController.archiveCategory);
router.put('/categories/:id', verifySuperAdmin, adminController.updateCategory);
router.delete('/categories/:id', verifySuperAdmin, adminController.deleteCategory);

router.get('/rewards', adminController.getAdminRewards);
router.post('/rewards', verifySuperAdmin, adminController.createReward);
router.put('/rewards/:id', verifySuperAdmin, adminController.updateReward);
router.delete('/rewards/:id', verifySuperAdmin, adminController.deleteReward);

router.get('/redeems', verifyAdminOrManager, adminController.getRedeemRequests);
router.put('/redeems/:id/status', verifyAdminOrManager, auditRequest('admin.redeem.status_updated', { entityType: 'redeemRequest' }), adminController.updateRedeemStatus);

// Lesson Management
router.get('/courses/:courseId/lessons', verifyCourseAccess, adminController.getCourseLessons);
router.put('/lessons/reorder', verifySuperAdmin, auditRequest('admin.lesson.reordered', { entityType: 'lesson' }), adminController.reorderLessons);
router.post('/lessons', verifyCourseAccess, auditRequest('admin.lesson.created', { entityType: 'lesson' }), adminController.createLesson);
router.put('/lessons/:id', verifyCourseAccess, auditRequest('admin.lesson.updated', { entityType: 'lesson' }), adminController.updateLesson);
router.delete('/lessons/:id', verifyCourseAccess, auditRequest('admin.lesson.deleted', { entityType: 'lesson', includeBody: false }), adminController.deleteLesson);

// Quiz Reports
router.get('/courses/:courseId/quiz-reports', verifyCourseAccess, adminController.getCourseQuizAttempts);

// Certificates
router.get('/certificates/pending', verifyAdminOrManager, certificateController.getPendingApprovals);
router.get('/courses/:courseId/certificates', verifyCourseAccess, certificateController.getCourseCertificates);

// Certificate Management
router.get('/certificates', certificateController.getAllCertificates);
router.post('/certificates/:certificateId/retry', auditRequest('admin.certificate.retry', { entityType: 'certificate' }), certificateController.retryGeneration);

// Assessments
router.get('/assessments', adminController.getAllAssessmentSubmissions);

module.exports = router;
