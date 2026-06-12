const UserService = require('../services/user.service');
const AdminService = require('../services/admin.service');
const { Readable } = require('stream');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const AssessmentService = require('../services/assessment.service');

// Get all courses (with enrollment status if applicable)
const getCourses = asyncHandler(async (req, res) => {
  const courses = await UserService.getCourses(req.user.userId);
  res.json({ success: true, data: courses });
});

const getBookmarkedCourses = asyncHandler(async (req, res) => {
  const courses = await UserService.getBookmarkedCourses(req.user.userId);
  res.json({ success: true, data: courses });
});

const getAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await UserService.getAnnouncements(req.user.userId);
  res.json({ success: true, data: announcements });
});

// Update user profile
const updateProfile = asyncHandler(async (req, res) => {
  const updatedUser = await UserService.updateProfile(req.user.userId, req.body);
  res.json({ success: true, data: updatedUser });
});

const getCertificates = asyncHandler(async (req, res) => {
  const certificates = await UserService.getCertificates(req.user.userId);
  res.json({ success: true, data: certificates });
});

const createCertificate = asyncHandler(async (req, res) => {
  const certificate = await UserService.createCertificate(req.user.userId, req.body);
  res.status(201).json({ success: true, data: certificate });
});

const updateCertificate = asyncHandler(async (req, res) => {
  const certificate = await UserService.updateCertificate(req.user.userId, req.params.id, req.body);
  res.json({ success: true, data: certificate });
});

const deleteCertificate = asyncHandler(async (req, res) => {
  const result = await UserService.deleteCertificate(req.user.userId, req.params.id);
  res.json({ success: true, data: result });
});

// Get single course details
const getCourseDetails = asyncHandler(async (req, res) => {
  const course = await UserService.getCourseDetails(req.params.id, req.user.userId);
  if (!course) {
    throw new ErrorResponse('Course not found', 404);
  }
  res.json({ success: true, data: course });
});

const getAnnouncementDetails = asyncHandler(async (req, res) => {
  const announcement = await UserService.getAnnouncementDetails(req.params.id, req.user.userId);
  if (!announcement) {
    throw new ErrorResponse('Announcement not found', 404);
  }
  res.json({ success: true, data: announcement });
});

// Enroll in a course
const enrollCourse = asyncHandler(async (req, res) => {
  const enrollment = await UserService.enrollCourse(req.user.userId, req.params.id);
  res.status(201).json({ success: true, message: 'Successfully enrolled', data: enrollment });
});

const bookmarkCourse = asyncHandler(async (req, res) => {
  const bookmark = await UserService.bookmarkCourse(req.user.userId, req.params.id);
  res.status(201).json({ success: true, data: bookmark });
});

const unbookmarkCourse = asyncHandler(async (req, res) => {
  const bookmark = await UserService.unbookmarkCourse(req.user.userId, req.params.id);
  res.json({ success: true, data: bookmark });
});

// Update lesson progress and handle points
const updateLessonProgress = asyncHandler(async (req, res) => {
  const progress = await UserService.updateLessonProgress(req.user.userId, req.params.id, req.body.progress);
  res.json({ success: true, message: 'Progress updated', data: progress });
});

// Submit Quiz Answers
const submitQuiz = asyncHandler(async (req, res) => {
  const result = await UserService.submitQuiz(req.user.userId, req.params.id, req.body.answers);
  res.json({ success: true, data: result });
});

const submitAssessment = asyncHandler(async (req, res) => {
  const result = await AssessmentService.submitAssessment(req.user.userId, req.params.id, req.body);
  res.status(201).json({ success: true, data: result });
});

const getMyAssessmentSubmission = asyncHandler(async (req, res) => {
  const result = await AssessmentService.getMyAssessmentSubmission(req.user.userId, req.params.id);
  res.json({ success: true, data: result });
});

const submitAnnouncementQuiz = asyncHandler(async (req, res) => {
  const result = await UserService.submitAnnouncementQuiz(req.user.userId, req.params.id, req.body.answers);
  res.json({ success: true, data: result });
});

// Get user points balance and history
const getPointsHistory = asyncHandler(async (req, res) => {
  const data = await UserService.getPointsHistory(req.user.userId);
  res.json({ success: true, data: data });
});

// Get rewards catalog
const getRewards = asyncHandler(async (req, res) => {
  const data = await UserService.getRewardsData(req.user.userId);
  res.json({ success: true, data: data });
});

// Redeem a reward
const requestRedeem = asyncHandler(async (req, res) => {
  const request = await UserService.requestRedeem(req.user.userId, req.params.id);
  res.status(201).json({ success: true, message: 'Redeem request submitted successfully', data: request });
});

// Get all categories for filtering
const getCategories = asyncHandler(async (req, res) => {
  const categories = await UserService.getCategories(req.user.userId);
  res.json({ success: true, data: categories });
});

// Get all competencies for external mapping
const getCompetencies = asyncHandler(async (req, res) => {
  const competencies = await AdminService.getCompetencies();
  res.json({ success: true, data: competencies });
});

// Get quiz questions for a specific lesson
const getLessonQuestions = asyncHandler(async (req, res) => {
  const questions = await UserService.getLessonQuestions(req.params.id);
  res.json({ success: true, data: questions });
});

const getAnnouncementQuestions = asyncHandler(async (req, res) => {
  const questions = await UserService.getAnnouncementQuestions(req.params.id, req.user.userId);
  res.json({ success: true, data: questions });
});

const getLessonDocumentAccess = asyncHandler(async (req, res) => {
  const documentAccess = await UserService.getLessonDocumentAccess(req.user.userId, req.params.id);
  res.json({ success: true, data: documentAccess });
});

const getAnnouncementDocumentAccess = asyncHandler(async (req, res) => {
  const documentAccess = await UserService.getAnnouncementDocumentAccess(req.user.userId, req.params.id);
  res.json({ success: true, data: documentAccess });
});

const getCertificateDownloadUrl = asyncHandler(async (req, res) => {
  const result = await UserService.getCertificateSignedUrl(req.user.userId, req.params.id);
  res.json({ success: true, data: result });
});

const getAssessmentSubmissionDownloadUrl = asyncHandler(async (req, res) => {
  const result = await AssessmentService.getSubmissionDownloadUrl(req.user, req.params.id);
  res.json({ success: true, data: result });
});

const getLessonDocumentStream = asyncHandler(async (req, res) => {
  const result = await UserService.getLessonDocumentStream(req.params.id, req.query.token);
  const { upstreamResponse, fileName, isLocal, localFilePath } = result;
  
  const rawFileName = fileName || 'document';
  const asciiFilename = rawFileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '_');
  const encodedName = encodeURIComponent(rawFileName);

  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Content-Disposition', `inline; filename="${asciiFilename}"; filename*=UTF-8''${encodedName}`);
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  if (isLocal) {
    res.sendFile(localFilePath, (err) => {
      if (err) {
        console.error('Error sending local lesson document:', err);
        if (!res.headersSent) {
          res.status(404).send('File not found');
        }
      }
    });
  } else {
    const contentType = upstreamResponse.headers.get('content-type') || 'application/octet-stream';
    const contentLength = upstreamResponse.headers.get('content-length');
    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    Readable.fromWeb(upstreamResponse.body).pipe(res);
  }
});

const getAnnouncementDocumentStream = asyncHandler(async (req, res) => {
  const result = await UserService.getAnnouncementDocumentStream(req.params.id, req.query.token);
  const { upstreamResponse, fileName, isLocal, localFilePath } = result;
  
  const rawFileName = fileName || 'document';
  const asciiFilename = rawFileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '_');
  const encodedName = encodeURIComponent(rawFileName);

  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Content-Disposition', `inline; filename="${asciiFilename}"; filename*=UTF-8''${encodedName}`);
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  if (isLocal) {
    res.sendFile(localFilePath, (err) => {
      if (err) {
        console.error('Error sending local announcement document:', err);
        if (!res.headersSent) {
          res.status(404).send('File not found');
        }
      }
    });
  } else {
    const contentType = upstreamResponse.headers.get('content-type') || 'application/octet-stream';
    const contentLength = upstreamResponse.headers.get('content-length');
    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    Readable.fromWeb(upstreamResponse.body).pipe(res);
  }
});

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await UserService.getNotifications(req.user.userId);
  res.json({ success: true, data: notifications });
});

const markNotificationAsRead = asyncHandler(async (req, res) => {
  const notifications = await UserService.markNotificationAsRead(req.user.userId, req.params.id);
  res.json({ success: true, data: notifications });
});

const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const notifications = await UserService.markAllNotificationsAsRead(req.user.userId);
  res.json({ success: true, data: notifications });
});

const clearAllNotifications = asyncHandler(async (req, res) => {
  const notifications = await UserService.clearAllNotifications(req.user.userId);
  res.json({ success: true, data: notifications });
});

module.exports = {
  getCourses,
  getBookmarkedCourses,
  getAnnouncements,
  getCourseDetails,
  getAnnouncementDetails,
  enrollCourse,
  bookmarkCourse,
  unbookmarkCourse,
  updateLessonProgress,
  getPointsHistory,
  getRewards,
  requestRedeem,
  getCategories,
  getCompetencies,
  submitQuiz,
  submitAssessment,
  getMyAssessmentSubmission,
  submitAnnouncementQuiz,
  updateProfile,
  getCertificates,
  getCertificateDownloadUrl,
  getAssessmentSubmissionDownloadUrl,
  createCertificate,
  updateCertificate,
  deleteCertificate,
  getLessonQuestions,
  getAnnouncementQuestions,
  getLessonDocumentAccess,
  getLessonDocumentStream,
  getAnnouncementDocumentAccess,
  getAnnouncementDocumentStream,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications
};
