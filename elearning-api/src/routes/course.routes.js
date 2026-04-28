const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course.controller');
const { verifyToken } = require('../middleware/auth');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const {
  COURSE_MANAGEMENT_ACCESS,
  canManageCourse
} = require('../utils/coursePermissions');

const certificateController = require('../controllers/certificate.controller');

const requireFullCourseAccess = asyncHandler(async (req, res, next) => {
  const permission = await canManageCourse(req.user, req.params.courseId);

  if (permission.access !== COURSE_MANAGEMENT_ACCESS.FULL) {
    throw new ErrorResponse('Forbidden: Owner access required', 403);
  }

  next();
});

const requireCourseStaffAccess = asyncHandler(async (req, res, next) => {
  const permission = await canManageCourse(req.user, req.params.courseId);

  if (permission.access !== COURSE_MANAGEMENT_ACCESS.FULL && permission.access !== COURSE_MANAGEMENT_ACCESS.LIMITED) {
    throw new ErrorResponse('Forbidden: Course staff access required', 403);
  }

  next();
});

router.use(verifyToken);

router.get('/:courseId', courseController.getCourseDetails);
router.get('/:courseId/staff', courseController.getCourseStaff);
router.post('/:courseId/staff', requireFullCourseAccess, courseController.assignCourseStaff);
router.patch('/:courseId/staff/:staffId', requireFullCourseAccess, courseController.updateCourseStaff);
router.delete('/:courseId/staff/:staffId', requireFullCourseAccess, courseController.deleteCourseStaff);

// Certificate Management
router.post('/:courseId/certificates/issue/:userId', requireCourseStaffAccess, certificateController.issueManual);

module.exports = router;
