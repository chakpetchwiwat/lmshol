const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth');

router.get('/lessons/:id/document-stream', userController.getLessonDocumentStream);
router.get('/announcements/:id/document-stream', userController.getAnnouncementDocumentStream);

router.use(verifyToken); // All user routes require authentication

router.get('/courses', userController.getCourses);
router.get('/announcements', userController.getAnnouncements);
router.get('/courses/:id', userController.getCourseDetails);
router.get('/announcements/:id', userController.getAnnouncementDetails);
router.post('/courses/:id/enroll', userController.enrollCourse);

router.put('/lessons/:id/progress', userController.updateLessonProgress);
router.post('/lessons/:id/quiz', userController.submitQuiz);
router.get('/lessons/:id/questions', userController.getLessonQuestions);
router.get('/lessons/:id/document-access', userController.getLessonDocumentAccess);
router.post('/announcements/:id/quiz', userController.submitAnnouncementQuiz);
router.get('/announcements/:id/questions', userController.getAnnouncementQuestions);
router.get('/announcements/:id/document-access', userController.getAnnouncementDocumentAccess);
router.get('/points', userController.getPointsHistory);
router.get('/rewards', userController.getRewards);
router.get('/categories', userController.getCategories);
router.get('/notifications', userController.getNotifications);
router.put('/notifications/read-all', userController.markAllNotificationsAsRead);
router.put('/notifications/:id/read', userController.markNotificationAsRead);
router.delete('/notifications', userController.clearAllNotifications);
router.get('/certificates', userController.getCertificates);
router.get('/certificates/:id/download-url', userController.getCertificateDownloadUrl);
router.post('/certificates', userController.createCertificate);
router.put('/certificates/:id', userController.updateCertificate);
router.delete('/certificates/:id', userController.deleteCertificate);
router.post('/redeem/:id', userController.requestRedeem);
router.put('/profile', userController.updateProfile);

module.exports = router;
