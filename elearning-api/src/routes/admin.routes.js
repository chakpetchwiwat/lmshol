const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const systemController = require('../controllers/system.controller');
const certificateController = require('../controllers/certificate.controller');
const { verifyToken, verifyAdmin, verifySuperAdmin, verifyAdminOrManager, verifyAdminPanelAccess, verifyCourseAccess } = require('../middleware/auth');
const { adminAnalyticsRateLimiter } = require('../middleware/rateLimiters');

router.use(verifyToken, verifyAdminPanelAccess); // Admin + manager can access the admin panel

router.get('/dashboard', verifyAdminOrManager, adminAnalyticsRateLimiter, adminController.getDashboardStats);
router.get('/analytics', verifyAdminOrManager, adminAnalyticsRateLimiter, adminController.getAdvancedAnalytics);
router.get('/system/health', verifySuperAdmin, systemController.getSystemHealth);
router.post('/system/security/reset', verifySuperAdmin, systemController.resetRateLimit);

router.get('/users', adminController.getUsers);
router.get('/users/:id/details', adminController.getUserDetails);
router.post('/users', verifySuperAdmin, adminController.createUser);
router.put('/users/:id', verifySuperAdmin, adminController.updateUser);
router.delete('/users/:id', verifySuperAdmin, adminController.deleteUser);

router.get('/departments', adminController.getDepartments);
router.post('/departments', verifySuperAdmin, adminController.createDepartment);
router.put('/departments/:id', verifySuperAdmin, adminController.updateDepartment);
router.delete('/departments/:id', verifySuperAdmin, adminController.deleteDepartment);

router.get('/tiers', adminController.getTiers);
router.post('/tiers', verifySuperAdmin, adminController.createTier);
router.put('/tiers/reorder', verifySuperAdmin, adminController.reorderTiers);
router.put('/tiers/:id', verifySuperAdmin, adminController.updateTier);
router.delete('/tiers/:id', verifySuperAdmin, adminController.deleteTier);

router.get('/instructor-presets', adminController.getInstructorPresets);
router.post('/instructor-presets', verifySuperAdmin, adminController.createInstructorPreset);
router.put('/instructor-presets/:id', verifySuperAdmin, adminController.updateInstructorPreset);
router.delete('/instructor-presets/:id', verifySuperAdmin, adminController.deleteInstructorPreset);

router.get('/courses', adminController.getAdminCourses);
router.post('/courses', verifyAdmin, adminController.createCourse);
router.put('/courses/:id/republish', verifySuperAdmin, adminController.republishCourse);
router.put('/courses/:id/archive', verifySuperAdmin, adminController.archiveCourse);
router.get('/courses/:id/history', verifyCourseAccess, adminController.getCourseHistory);
router.put('/courses/:id', verifyCourseAccess, adminController.updateCourse);
router.delete('/courses/:id', verifySuperAdmin, adminController.deleteCourse);

router.get('/announcements', verifyAdminOrManager, adminController.getAdminAnnouncements);
router.post('/announcements', verifyAdminOrManager, adminController.createAnnouncement);
router.get('/announcements/:id/history', verifyAdminOrManager, adminController.getAnnouncementHistory);
router.put('/announcements/:id/republish', verifyAdminOrManager, adminController.republishAnnouncement);
router.put('/announcements/:id/archive', verifyAdminOrManager, adminController.archiveAnnouncement);
router.put('/announcements/:id', verifyAdminOrManager, adminController.updateAnnouncement);
router.delete('/announcements/:id', verifyAdminOrManager, adminController.deleteAnnouncement);

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
router.put('/redeems/:id/status', verifyAdminOrManager, adminController.updateRedeemStatus);

// Lesson Management
router.get('/courses/:courseId/lessons', verifyCourseAccess, adminController.getCourseLessons);
router.put('/lessons/reorder', verifySuperAdmin, adminController.reorderLessons);
router.post('/lessons', verifyCourseAccess, adminController.createLesson);
router.put('/lessons/:id', verifyCourseAccess, adminController.updateLesson);
router.delete('/lessons/:id', verifyCourseAccess, adminController.deleteLesson);

// Quiz Reports
router.get('/courses/:courseId/quiz-reports', verifyCourseAccess, adminController.getCourseQuizAttempts);

// Certificates
router.get('/certificates/pending', verifyAdminOrManager, certificateController.getPendingApprovals);
router.get('/courses/:courseId/certificates', verifyCourseAccess, certificateController.getCourseCertificates);

module.exports = router;
