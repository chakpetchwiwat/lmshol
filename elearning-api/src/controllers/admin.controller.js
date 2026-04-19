const AdminService = require('../services/admin.service');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const { REDEEM_STATUS } = require('../utils/constants/statuses');

// DASHBOARD
const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await AdminService.getDashboardStats(req.user);
  res.json({ success: true, data: stats });
});

const getAdvancedAnalytics = asyncHandler(async (req, res) => {
  const analytics = await AdminService.getAdvancedAnalytics(req.user);
  res.json({ success: true, data: analytics });
});

// USERS
const getUsers = asyncHandler(async (req, res) => {
  const users = await AdminService.getUsers(req.user);
  res.json({ success: true, data: users });
});

const getUserDetails = asyncHandler(async (req, res) => {
  const user = await AdminService.getUserDetails(req.params.id, req.user);
  res.json({ success: true, data: user });
});

const createUser = asyncHandler(async (req, res) => {
  const user = await AdminService.createUser(req.body);
  res.status(201).json({ success: true, data: user });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await AdminService.updateUser(req.params.id, req.body);
  res.json({ success: true, data: user });
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (req.user.userId === id) {
    throw new ErrorResponse('Cannot delete your own account', 400);
  }
  await AdminService.deleteUser(id);
  res.json({ success: true, message: 'User deleted successfully' });
});

// DEPARTMENTS
const getDepartments = asyncHandler(async (req, res) => {
  const departments = await AdminService.getDepartments(req.user);
  res.json({ success: true, data: departments });
});

const createDepartment = asyncHandler(async (req, res) => {
  const department = await AdminService.createDepartment(req.body);
  res.status(201).json({ success: true, data: department });
});

const updateDepartment = asyncHandler(async (req, res) => {
  const department = await AdminService.updateDepartment(req.params.id, req.body);
  res.json({ success: true, data: department });
});

const deleteDepartment = asyncHandler(async (req, res) => {
  await AdminService.deleteDepartment(req.params.id);
  res.json({ success: true, message: 'Department deleted successfully' });
});

// TIERS
const getTiers = asyncHandler(async (req, res) => {
  const tiers = await AdminService.getTiers(req.user);
  res.json({ success: true, data: tiers });
});

const createTier = asyncHandler(async (req, res) => {
  const tier = await AdminService.createTier(req.body);
  res.status(201).json({ success: true, data: tier });
});

const updateTier = asyncHandler(async (req, res) => {
  const tier = await AdminService.updateTier(req.params.id, req.body);
  res.json({ success: true, data: tier });
});

const deleteTier = asyncHandler(async (req, res) => {
  await AdminService.deleteTier(req.params.id);
  res.json({ success: true, message: 'Tier deleted successfully' });
});

const reorderTiers = asyncHandler(async (req, res) => {
  const { tierIds } = req.body;
  await AdminService.reorderTiers(tierIds);
  res.json({ success: true, message: 'Tiers reordered successfully' });
});

// INSTRUCTOR PRESETS
const getInstructorPresets = asyncHandler(async (req, res) => {
  const presets = await AdminService.getInstructorPresets();
  res.json({ success: true, data: presets });
});

const createInstructorPreset = asyncHandler(async (req, res) => {
  const preset = await AdminService.createInstructorPreset(req.body);
  res.status(201).json({ success: true, data: preset });
});

const updateInstructorPreset = asyncHandler(async (req, res) => {
  const preset = await AdminService.updateInstructorPreset(req.params.id, req.body);
  res.json({ success: true, data: preset });
});

const deleteInstructorPreset = asyncHandler(async (req, res) => {
  await AdminService.deleteInstructorPreset(req.params.id);
  res.json({ success: true, message: 'Instructor preset deleted successfully' });
});


// COURSES
const getAdminCourses = asyncHandler(async (req, res) => {
  const courses = await AdminService.getAdminCourses();
  res.json({ success: true, data: courses });
});

const createCourse = asyncHandler(async (req, res) => {
  const course = await AdminService.createCourse(req.body);
  res.status(201).json({ success: true, data: course });
});

const updateCourse = asyncHandler(async (req, res) => {
  const course = await AdminService.updateCourse(req.params.id, req.body);
  res.json({ success: true, data: course });
});

const republishCourse = asyncHandler(async (req, res) => {
  const course = await AdminService.republishCourse(req.params.id);
  res.json({ success: true, data: course });
});

const archiveCourse = asyncHandler(async (req, res) => {
  const course = await AdminService.archiveCourse(req.params.id);
  res.json({ success: true, data: course });
});

const getCourseHistory = asyncHandler(async (req, res) => {
  const history = await AdminService.getCourseHistory(req.params.courseId || req.params.id, req.query);
  res.json({ success: true, data: history });
});


const deleteCourse = asyncHandler(async (req, res) => {
  await AdminService.deleteCourse(req.params.id);
  res.json({ success: true, message: 'Course deleted' });
});

// ANNOUNCEMENTS
const getAdminAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await AdminService.getAdminAnnouncements(req.user);
  res.json({ success: true, data: announcements });
});

const createAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await AdminService.createAnnouncement(req.user, req.body);
  res.status(201).json({ success: true, data: announcement });
});

const updateAnnouncement = asyncHandler(async (req, res) => {
  const announcement = await AdminService.updateAnnouncement(req.params.id, req.user, req.body);
  res.json({ success: true, data: announcement });
});

const archiveAnnouncement = asyncHandler(async (req, res) => {
  const result = await AdminService.archiveAnnouncement(req.params.id, req.user);
  res.json({ success: true, data: result });
});

const republishAnnouncement = asyncHandler(async (req, res) => {
  const result = await AdminService.republishAnnouncement(req.params.id, req.user);
  res.json({ success: true, data: result });
});

const getAnnouncementHistory = asyncHandler(async (req, res) => {
  const history = await AdminService.getAnnouncementHistory(req.params.id, req.user);
  res.json({ success: true, data: history });
});

const deleteAnnouncement = asyncHandler(async (req, res) => {
  await AdminService.deleteAnnouncement(req.params.id, req.user);
  res.json({ success: true, message: 'Announcement deleted' });
});

// CATEGORIES
const getCategories = asyncHandler(async (req, res) => {
  const categories = await AdminService.getCategories();
  res.json({ success: true, data: categories });
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await AdminService.createCategory(req.body);
  res.status(201).json({ success: true, data: category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await AdminService.updateCategory(req.params.id, req.body);
  res.json({ success: true, data: category });
});

const republishCategory = asyncHandler(async (req, res) => {
  const category = await AdminService.republishCategory(req.params.id);
  res.json({ success: true, data: category });
});

const archiveCategory = asyncHandler(async (req, res) => {
  const category = await AdminService.archiveCategory(req.params.id);
  res.json({ success: true, data: category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  await AdminService.deleteCategory(req.params.id);
  res.json({ success: true, message: 'Category deleted' });
});

const reorderCategories = asyncHandler(async (req, res) => {
  await AdminService.reorderCategories(req.body.categoryIds);
  res.json({ success: true, message: 'Categories reordered successfully' });
});

// REWARDS
const getAdminRewards = asyncHandler(async (req, res) => {
  const rewards = await AdminService.getAdminRewards();
  res.json({ success: true, data: rewards });
});

const createReward = asyncHandler(async (req, res) => {
  const reward = await AdminService.createReward(req.body);
  res.status(201).json({ success: true, data: reward });
});

const updateReward = asyncHandler(async (req, res) => {
  const reward = await AdminService.updateReward(req.params.id, req.body);
  res.json({ success: true, data: reward });
});

const deleteReward = asyncHandler(async (req, res) => {
  await AdminService.deleteReward(req.params.id);
  res.json({ success: true, message: 'Reward deleted' });
});

// REDEMPTIONS
const getRedeemRequests = asyncHandler(async (req, res) => {
  const requests = await AdminService.getRedeemRequests();
  res.json({ success: true, data: requests });
});

const updateRedeemStatus = asyncHandler(async (req, res) => {
  const { status, adminNote } = req.body;
  if (![REDEEM_STATUS.APPROVED, REDEEM_STATUS.REJECTED, REDEEM_STATUS.FULFILLED].includes(status)) {
    throw new ErrorResponse('Invalid status', 400);
  }
  await AdminService.updateRedeemStatus(req.params.id, status, adminNote);
  res.json({ success: true, message: `Request ${status}` });
});

// LESSONS
const getCourseLessons = asyncHandler(async (req, res) => {
  const lessons = await AdminService.getCourseLessons(req.params.courseId);
  res.json({ success: true, data: lessons });
});

const createLesson = asyncHandler(async (req, res) => {
  const lesson = await AdminService.createLesson(req.body);
  res.status(201).json({ success: true, data: lesson });
});

const updateLesson = asyncHandler(async (req, res) => {
  const lesson = await AdminService.updateLesson(req.params.id, req.body);
  res.json({ success: true, data: lesson });
});

const deleteLesson = asyncHandler(async (req, res) => {
  await AdminService.deleteLesson(req.params.id);
  res.json({ success: true, message: 'Lesson deleted' });
});

const reorderLessons = asyncHandler(async (req, res) => {
  const { lessonIds } = req.body;
  await AdminService.reorderLessons(lessonIds);
  res.json({ success: true, message: 'Lessons reordered successfully' });
});

// QUIZ REPORTS
const getCourseQuizAttempts = asyncHandler(async (req, res) => {
  const attempts = await AdminService.getCourseQuizAttempts(req.params.courseId);
  res.json({ success: true, data: attempts });
});

module.exports = {
  getDashboardStats,
  getAdvancedAnalytics,
  getAdminCourses,
  createCourse,
  updateCourse,
  republishCourse,
  archiveCourse,
  getCourseHistory,
  deleteCourse,
  getAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  archiveAnnouncement,
  republishAnnouncement,
  getAnnouncementHistory,
  getCategories,
  createCategory,
  updateCategory,
  republishCategory,
  archiveCategory,
  deleteCategory,
  reorderCategories,
  getAdminRewards,
  createReward,
  updateReward,
  deleteReward,
  getRedeemRequests,
  updateRedeemStatus,
  getUsers,
  getUserDetails,
  createUser,
  updateUser,
  deleteUser,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getTiers,
  createTier,
  updateTier,
  deleteTier,
  reorderTiers,
  getInstructorPresets,
  createInstructorPreset,
  updateInstructorPreset,
  deleteInstructorPreset,
  getCourseLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  getCourseQuizAttempts
};
