const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { verifyToken, verifyAdmin, verifySuperAdmin, verifyAdminPanelAccess } = require('../middleware/auth');

router.use(verifyToken, verifyAdminPanelAccess); // Admin + manager can access the admin panel

router.get('/dashboard', adminController.getDashboardStats);
router.get('/analytics', adminController.getAdvancedAnalytics);

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

router.get('/instructor-presets', verifySuperAdmin, adminController.getInstructorPresets);
router.post('/instructor-presets', verifySuperAdmin, adminController.createInstructorPreset);
router.put('/instructor-presets/:id', verifySuperAdmin, adminController.updateInstructorPreset);
router.delete('/instructor-presets/:id', verifySuperAdmin, adminController.deleteInstructorPreset);

router.get('/courses', adminController.getAdminCourses);
router.post('/courses', verifySuperAdmin, adminController.createCourse);
router.put('/courses/:id/republish', verifySuperAdmin, adminController.republishCourse);
router.put('/courses/:id/archive', verifySuperAdmin, adminController.archiveCourse);
router.get('/courses/:id/history', verifySuperAdmin, adminController.getCourseHistory);
router.put('/courses/:id', verifySuperAdmin, adminController.updateCourse);
router.delete('/courses/:id', verifySuperAdmin, adminController.deleteCourse);

router.get('/announcements', adminController.getAdminAnnouncements);
router.post('/announcements', adminController.createAnnouncement);
router.get('/announcements/:id/history', adminController.getAnnouncementHistory);
router.put('/announcements/:id/republish', adminController.republishAnnouncement);
router.put('/announcements/:id/archive', adminController.archiveAnnouncement);
router.put('/announcements/:id', adminController.updateAnnouncement);
router.delete('/announcements/:id', adminController.deleteAnnouncement);

router.get('/categories', verifySuperAdmin, adminController.getCategories);
router.post('/categories', verifySuperAdmin, adminController.createCategory);
router.put('/categories/reorder', verifySuperAdmin, adminController.reorderCategories);
router.put('/categories/:id/republish', verifySuperAdmin, adminController.republishCategory);
router.put('/categories/:id/archive', verifySuperAdmin, adminController.archiveCategory);
router.put('/categories/:id', verifySuperAdmin, adminController.updateCategory);
router.delete('/categories/:id', verifySuperAdmin, adminController.deleteCategory);

router.get('/rewards', verifySuperAdmin, adminController.getAdminRewards);
router.post('/rewards', verifySuperAdmin, adminController.createReward);
router.put('/rewards/:id', verifySuperAdmin, adminController.updateReward);
router.delete('/rewards/:id', verifySuperAdmin, adminController.deleteReward);

router.get('/redeems', adminController.getRedeemRequests);
router.put('/redeems/:id/status', adminController.updateRedeemStatus);

// Lesson Management
router.get('/courses/:courseId/lessons', verifySuperAdmin, adminController.getCourseLessons);
router.put('/lessons/reorder', verifySuperAdmin, adminController.reorderLessons);
router.post('/lessons', verifySuperAdmin, adminController.createLesson);
router.put('/lessons/:id', verifySuperAdmin, adminController.updateLesson);
router.delete('/lessons/:id', verifySuperAdmin, adminController.deleteLesson);

// Quiz Reports
router.get('/courses/:courseId/quiz-reports', verifySuperAdmin, adminController.getCourseQuizAttempts);

module.exports = router;
