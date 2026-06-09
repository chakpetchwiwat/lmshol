const AdminService = require('../services/admin.service');
const AssessmentService = require('../services/assessment.service');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const { REDEEM_STATUS } = require('../utils/constants/statuses');

const appendServerTiming = (res, metricName, durationMs) => {
  const metricValue = `${metricName};dur=${durationMs}`;
  const existingHeader = res.getHeader('Server-Timing');

  if (!existingHeader) {
    res.setHeader('Server-Timing', metricValue);
    return;
  }

  res.setHeader('Server-Timing', `${existingHeader}, ${metricValue}`);
};

const logAdminTiming = (event, req, durationMs, extra = {}) => {
  console.info('[admin-timing]', JSON.stringify({
    event,
    durationMs,
    userId: req.user?.userId || null,
    role: req.user?.role || null,
    departmentId: req.query?.departmentId || req.user?.departmentId || null,
    month: req.query?.month || null,
    year: req.query?.year || null,
    ...extra
  }));
};

// DASHBOARD
const getDashboardStats = asyncHandler(async (req, res) => {
  const startedAt = Date.now();
  const stats = await AdminService.getDashboardStats(req.user, req.query);
  const durationMs = Date.now() - startedAt;
  appendServerTiming(res, 'admin-dashboard', durationMs);
  logAdminTiming('admin.dashboard.completed', req, durationMs, {
    enrollments: stats?.totalEnrollments || 0,
    users: stats?.totalUsers || 0
  });
  res.json({ success: true, data: stats });
});

const getAdvancedAnalytics = asyncHandler(async (req, res) => {
  const startedAt = Date.now();
  const analytics = await AdminService.getAdvancedAnalytics(req.user, req.query);
  const durationMs = Date.now() - startedAt;
  appendServerTiming(res, 'admin-analytics', durationMs);
  logAdminTiming('admin.analytics.completed', req, durationMs, {
    skillGapBuckets: analytics?.skillGap?.length || 0,
    benchmarkingDepartments: analytics?.benchmarking?.length || 0,
    atRiskCount: analytics?.atRisk?.length || 0
  });
  res.json({ success: true, data: analytics });
});

// USERS
const getUsers = asyncHandler(async (req, res) => {
  const users = await AdminService.getUsers(req.user);
  res.json({ success: true, data: users });
});

const exportUserTrainings = asyncHandler(async (req, res) => {
  const buffer = await AdminService.exportUserTrainings(req.user);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="training_report.xlsx"');
  res.send(buffer);
});

const exportUserProfiles = asyncHandler(async (req, res) => {
  const referer = req.headers.referer;
  let frontendUrl = 'http://localhost:3000';
  if (referer) {
    try {
      const urlObj = new URL(referer);
      frontendUrl = urlObj.origin;
    } catch (e) {
      // ignore
    }
  }
  
  if (req.query.frontendUrl) {
    frontendUrl = String(req.query.frontendUrl);
  }

  const buffer = await AdminService.exportUserProfiles(req.user, frontendUrl);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="users_profile.xlsx"');
  res.send(buffer);
});

const exportSingleUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, buffer } = await AdminService.exportSingleUser(id, req.user);
  const rawFilename = `ประวัติผู้เรียน_${name || 'user'}`;
  const safeFilename = encodeURIComponent(rawFilename);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.xlsx"; filename*=UTF-8''${safeFilename}.xlsx`);
  res.send(buffer);
});

const downloadTemplate = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const buffer = await AdminService.downloadTemplate(type);
  const encodedFilename = encodeURIComponent(type === 'profiles' ? 'แบบฟอร์ม_ประวัติผู้เรียน.xlsx' : 'แบบฟอร์ม_ประวัติอบรม.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
  res.send(buffer);
});

const importUsers = asyncHandler(async (req, res) => {
  const { type } = req.params;
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload an Excel file.' });
  }

  let result;
  if (type === 'profiles') {
    const mustChangePassword = req.body.mustChangePassword !== 'false' && req.body.mustChangePassword !== false;
    result = await AdminService.importProfiles(req.file.buffer, mustChangePassword);
  } else if (type === 'trainings') {
    result = await AdminService.importTrainings(req.file.buffer);
  } else {
    return res.status(400).json({ success: false, message: 'Invalid import type.' });
  }

  res.json({
    success: true,
    data: result
  });
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

const getUserCertificates = asyncHandler(async (req, res) => {
  const certificates = await AdminService.getUserCertificates(req.params.id);
  res.json({ success: true, data: certificates });
});

const getCompetencies = asyncHandler(async (req, res) => {
  const competencies = await AdminService.getCompetencies();
  res.json({ success: true, data: competencies });
});

const getCompetencyTree = asyncHandler(async (req, res) => {
  const tree = await AdminService.getCompetencyTree();
  res.json({ success: true, data: tree });
});

const createCompetencyGroup = asyncHandler(async (req, res) => {
  const group = await AdminService.createCompetencyGroup(req.body);
  res.status(201).json({ success: true, data: group });
});

const updateCompetencyGroup = asyncHandler(async (req, res) => {
  const group = await AdminService.updateCompetencyGroup(req.params.id, req.body);
  res.json({ success: true, data: group });
});

const deleteCompetencyGroup = asyncHandler(async (req, res) => {
  await AdminService.deleteCompetencyGroup(req.params.id);
  res.json({ success: true, message: 'Competency group deleted successfully' });
});

const createCompetencyCategory = asyncHandler(async (req, res) => {
  const category = await AdminService.createCompetencyCategory(req.body);
  res.status(201).json({ success: true, data: category });
});

const updateCompetencyCategory = asyncHandler(async (req, res) => {
  const category = await AdminService.updateCompetencyCategory(req.params.id, req.body);
  res.json({ success: true, data: category });
});

const deleteCompetencyCategory = asyncHandler(async (req, res) => {
  await AdminService.deleteCompetencyCategory(req.params.id);
  res.json({ success: true, message: 'Competency category deleted successfully' });
});

const createCompetency = asyncHandler(async (req, res) => {
  const competency = await AdminService.createCompetency(req.body);
  res.status(201).json({ success: true, data: competency });
});

const updateCompetency = asyncHandler(async (req, res) => {
  const competency = await AdminService.updateCompetency(req.params.id, req.body);
  res.json({ success: true, data: competency });
});

const deleteCompetency = asyncHandler(async (req, res) => {
  await AdminService.deleteCompetency(req.params.id);
  res.json({ success: true, message: 'Competency deleted successfully' });
});

const getCompetencyTypes = asyncHandler(async (req, res) => {
  const types = await AdminService.getCompetencyTypes();
  res.json({ success: true, data: types });
});

const createCompetencyType = asyncHandler(async (req, res) => {
  const type = await AdminService.createCompetencyType(req.body);
  res.status(201).json({ success: true, data: type });
});

const updateCompetencyType = asyncHandler(async (req, res) => {
  const type = await AdminService.updateCompetencyType(req.params.id, req.body);
  res.json({ success: true, data: type });
});

const deleteCompetencyType = asyncHandler(async (req, res) => {
  await AdminService.deleteCompetencyType(req.params.id);
  res.json({ success: true, message: 'Competency type deleted successfully' });
});

const importGbtCompetencies = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload a GBT Excel file.' });
  }
  const result = await AdminService.importGbtCompetencies(req.file.buffer);
  res.json({ success: true, data: result });
});

const createUserCertificate = asyncHandler(async (req, res) => {
  const certificate = await AdminService.createUserCertificate(req.params.id, req.body);
  res.status(201).json({ success: true, data: certificate });
});

const updateUserCertificate = asyncHandler(async (req, res) => {
  const certificate = await AdminService.updateUserCertificate(req.params.id, req.params.certificateId, req.body);
  res.json({ success: true, data: certificate });
});

const deleteUserCertificate = asyncHandler(async (req, res) => {
  await AdminService.deleteUserCertificate(req.params.id, req.params.certificateId);
  res.json({ success: true, message: 'Certificate deleted successfully' });
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

// COHORT ROLES
const getCohortRoles = asyncHandler(async (req, res) => {
  const roles = await AdminService.getCohortRoles(req.user);
  res.json({ success: true, data: roles });
});

const createCohortRole = asyncHandler(async (req, res) => {
  const role = await AdminService.createCohortRole(req.body);
  res.status(201).json({ success: true, data: role });
});

const updateCohortRole = asyncHandler(async (req, res) => {
  const role = await AdminService.updateCohortRole(req.params.id, req.body);
  res.json({ success: true, data: role });
});

const deleteCohortRole = asyncHandler(async (req, res) => {
  await AdminService.deleteCohortRole(req.params.id);
  res.json({ success: true, message: 'Cohort role deleted successfully' });
});

const reorderCohortRoles = asyncHandler(async (req, res) => {
  const { roleIds } = req.body;
  await AdminService.reorderCohortRoles(roleIds);
  res.json({ success: true, message: 'Cohort roles reordered successfully' });
});

const updateCohortRoleMembers = asyncHandler(async (req, res) => {
  const role = await AdminService.updateCohortRoleMembers(req.params.id, req.body.userIds || []);
  res.json({ success: true, data: role });
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

// SYSTEM SETTINGS
const getSetting = asyncHandler(async (req, res) => {
  const setting = await AdminService.getSetting(req.params.key);
  res.json({ success: true, data: setting });
});

const updateSetting = asyncHandler(async (req, res) => {
  const setting = await AdminService.updateSetting(req.params.key, req.body.items);
  res.json({ success: true, data: setting });
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
  res.status(204).end();
});

const getOrganizationPresets = asyncHandler(async (req, res) => {
  const presets = await AdminService.getOrganizationPresets();
  res.json({ success: true, data: presets });
});

const createOrganizationPreset = asyncHandler(async (req, res) => {
  const preset = await AdminService.createOrganizationPreset(req.body);
  res.status(201).json({ success: true, data: preset });
});

const updateOrganizationPreset = asyncHandler(async (req, res) => {
  const preset = await AdminService.updateOrganizationPreset(req.params.id, req.body);
  res.json({ success: true, data: preset });
});

const deleteOrganizationPreset = asyncHandler(async (req, res) => {
  await AdminService.deleteOrganizationPreset(req.params.id);
  res.status(204).end();
});


// COURSES
const getAdminCourses = asyncHandler(async (req, res) => {
  const { page, limit, search, categoryId, courseView } = req.query;
  const result = await AdminService.getAdminCourses(req.user, {
    page: page ? parseInt(page, 10) : undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
    search,
    categoryId,
    courseView
  });
  res.json({ success: true, data: result });
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
  const startedAt = Date.now();
  const history = await AdminService.getCourseHistory(req.params.courseId || req.params.id, req.query);
  const durationMs = Date.now() - startedAt;
  appendServerTiming(res, 'admin-course-history', durationMs);
  logAdminTiming('admin.course_history.completed', req, durationMs, {
    courseId: req.params.courseId || req.params.id || null,
    rows: history?.length || 0,
    status: req.query?.status || null,
    dateField: req.query?.dateField || 'startedAt'
  });
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
  const startedAt = Date.now();
  const history = await AdminService.getAnnouncementHistory(req.params.id, req.user);
  const durationMs = Date.now() - startedAt;
  appendServerTiming(res, 'admin-announcement-history', durationMs);
  logAdminTiming('admin.announcement_history.completed', req, durationMs, {
    announcementId: req.params.id || null,
    rows: history?.length || 0
  });
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
  const startedAt = Date.now();
  const attempts = await AdminService.getCourseQuizAttempts(req.params.courseId);
  const durationMs = Date.now() - startedAt;
  appendServerTiming(res, 'admin-course-quiz-attempts', durationMs);
  logAdminTiming('admin.course_quiz_attempts.completed', req, durationMs, {
    courseId: req.params.courseId || null,
    rows: attempts?.length || 0
  });
  res.json({ success: true, data: attempts });
});

// ASSESSMENTS
const getAllAssessmentSubmissions = asyncHandler(async (req, res) => {
  const startedAt = Date.now();
  const submissions = await AssessmentService.listAllAssessmentSubmissions(req.user, req.query);
  const durationMs = Date.now() - startedAt;
  
  appendServerTiming(res, 'admin-all-assessments', durationMs);
  logAdminTiming('admin.all_assessments.completed', req, durationMs, {
    rows: submissions?.length || 0,
    courseId: req.query?.courseId || null,
    status: req.query?.status || null
  });
  
  res.json({ success: true, data: submissions });
});

// COHORT SUPERVISORS
const getEligibleSupervisors = asyncHandler(async (req, res) => {
  const supervisors = await AdminService.getEligibleSupervisors();
  res.json({ success: true, data: supervisors });
});

const getUserCohortSupervisors = asyncHandler(async (req, res) => {
  const supervisors = await AdminService.getUserCohortSupervisors(req.params.id);
  res.json({ success: true, data: supervisors });
});

const saveUserCohortSupervisors = asyncHandler(async (req, res) => {
  const supervisors = await AdminService.saveUserCohortSupervisors(req.params.id, req.body.assignments);
  res.json({ success: true, data: supervisors });
});

const getSupervisorTracking = asyncHandler(async (req, res) => {
  const tracking = await AdminService.getSupervisorTracking(req.user);
  res.json({ success: true, data: tracking });
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
  exportUserProfiles,
  exportUserTrainings,
  exportSingleUser,
  downloadTemplate,
  importUsers,
  getCompetencies,
  getCompetencyTree,
  createCompetencyGroup,
  updateCompetencyGroup,
  deleteCompetencyGroup,
  createCompetencyCategory,
  updateCompetencyCategory,
  deleteCompetencyCategory,
  createCompetency,
  updateCompetency,
  deleteCompetency,
  getCompetencyTypes,
  createCompetencyType,
  updateCompetencyType,
  deleteCompetencyType,
  importGbtCompetencies,
  getUserDetails,
  createUser,
  updateUser,
  deleteUser,
  getUserCertificates,
  createUserCertificate,
  updateUserCertificate,
  deleteUserCertificate,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getCohortRoles,
  createCohortRole,
  updateCohortRole,
  deleteCohortRole,
  reorderCohortRoles,
  updateCohortRoleMembers,
  getTiers,
  getEligibleSupervisors,
  getUserCohortSupervisors,
  saveUserCohortSupervisors,
  getSupervisorTracking,
  createTier,
  updateTier,
  deleteTier,
  reorderTiers,
  getSetting,
  updateSetting,
  getInstructorPresets,
  createInstructorPreset,
  updateInstructorPreset,
  deleteInstructorPreset,
  getOrganizationPresets,
  createOrganizationPreset,
  updateOrganizationPreset,
  deleteOrganizationPreset,
  getCourseLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  getCourseQuizAttempts,
  getAllAssessmentSubmissions
};
