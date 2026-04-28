const asyncHandler = require('../middleware/async');
const CourseStaffService = require('../services/courseStaff.service');
const UserService = require('../services/user.service');
const AssessmentService = require('../services/assessment.service');
const ErrorResponse = require('../utils/errorResponse');

const getCourseDetails = asyncHandler(async (req, res) => {
  const course = await UserService.getCourseDetails(req.params.courseId, req.user.userId);
  if (!course) {
    throw new ErrorResponse('Course not found', 404);
  }
  res.json({ success: true, data: course });
});

const getCourseStaff = asyncHandler(async (req, res) => {
  const staff = await CourseStaffService.getCourseStaff(req.params.courseId, req.user);
  res.json({ success: true, data: staff });
});

const assignCourseStaff = asyncHandler(async (req, res) => {
  const staff = await CourseStaffService.assignCourseStaff(req.params.courseId, req.body);
  res.status(201).json({ success: true, data: staff });
});

const updateCourseStaff = asyncHandler(async (req, res) => {
  const staff = await CourseStaffService.updateCourseStaff(req.params.courseId, req.params.staffId, req.body);
  res.json({ success: true, data: staff });
});

const deleteCourseStaff = asyncHandler(async (req, res) => {
  const result = await CourseStaffService.deleteCourseStaff(req.params.courseId, req.params.staffId);
  res.json({ success: true, data: result });
});

const getAssessmentSubmissions = asyncHandler(async (req, res) => {
  const submissions = await AssessmentService.listCourseAssessmentSubmissions(req.user, req.params.courseId);
  res.json({ success: true, data: submissions });
});

const gradeAssessmentSubmission = asyncHandler(async (req, res) => {
  const result = await AssessmentService.gradeAssessmentSubmission(req.user, req.params.submissionId, req.body);
  res.json({ success: true, data: result });
});

const getAssessmentSubmissionDownloadUrl = asyncHandler(async (req, res) => {
  const result = await AssessmentService.getSubmissionDownloadUrl(req.user, req.params.submissionId);
  res.json({ success: true, data: result });
});

module.exports = {
  getCourseDetails,
  getCourseStaff,
  assignCourseStaff,
  updateCourseStaff,
  deleteCourseStaff,
  getAssessmentSubmissions,
  gradeAssessmentSubmission,
  getAssessmentSubmissionDownloadUrl
};
