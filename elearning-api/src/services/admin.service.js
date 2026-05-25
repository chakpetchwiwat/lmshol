const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');
const authHelpers = require('../utils/auth.helpers');
const { USER_ROLES, MANAGED_USER_ROLES } = require('../utils/constants/roles');
const { ENTITY_STATUS, ENROLLMENT_STATUS, REDEEM_STATUS, USER_STATUS, GOAL_STATUS } = require('../utils/constants/statuses');
const { POINT_SOURCE_TYPES } = require('../utils/constants/ledger');
const { TRANSACTION_TIMEOUTS } = require('../utils/constants/config');
const { ANNOUNCEMENT_SCOPES, GOAL_SCOPES } = require('../utils/constants/scopes');

const { parseInteger, parseOptionalDate, normalizeNullableId, normalizeIdArray, sanitizeName, ensureReferenceName, ensureReferenceIdsExist, ensureInstructorPresetExists, buildTemporaryStateData } = require('./admin/admin.helpers');
const { getCategories, createCategory, updateCategory, republishCategory, archiveCategory, deleteCategory, reorderCategories } = require('./admin/admin.categories');
const { getAdminRewards, createReward, updateReward, deleteReward, getRedeemRequests, updateRedeemStatus } = require('./admin/admin.rewards');
const { getAdminCourses, createCourse, updateCourse, republishCourse, archiveCourse, getCourseHistory, deleteCourse, getCourseLessons, createLesson, updateLesson, deleteLesson, reorderLessons, getCourseQuizAttempts } = require('./admin/admin.courses');

const { getUsers, getUserDetails, createUser, updateUser, deleteUser, exportUserProfiles, exportUserTrainings, exportSingleUser } = require('./admin/admin.users');
const userCertificates = require('./user/user.certificates');
const { getDepartments, createDepartment, updateDepartment, deleteDepartment } = require('./admin/admin.departments');
const { getTiers, createTier, updateTier, deleteTier, reorderTiers } = require('./admin/admin.tiers');
const { getCohortRoles, createCohortRole, updateCohortRole, deleteCohortRole, reorderCohortRoles, updateCohortRoleMembers } = require('./admin/admin.cohortRoles');
const { getSetting, updateSetting } = require('./admin/admin.settings');

const { getDashboardStats, getAdvancedAnalytics } = require('./admin/admin.analytics');
const { getAdminAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, archiveAnnouncement, republishAnnouncement, getAnnouncementHistory } = require('./admin/admin.announcements');
const { getInstructorPresets, createInstructorPreset, updateInstructorPreset, deleteInstructorPreset } = require('./admin/admin.instructors');
const { getOrganizationPresets, createOrganizationPreset, updateOrganizationPreset, deleteOrganizationPreset } = require('./admin/admin.organizations');

const {
    courseInclude,
    announcementInclude,
    userInclude,
    categoryInclude,
    buildDepartmentVisibleCourseWhere,
    buildScopedUserWhere,
    buildLearnerWhere,
    buildVisibleCourseWhereForDashboard,
    buildDateOverlapWhere,
    buildAnnouncementWhereForActor
} = require('./admin/admin.queries');

const {
    mapUserRecord,
    mapCourseRecord,
    mapCategoryRecord,
    mapAnnouncementRecord,
    getDashboardUserSummary
} = require('./admin/admin.serializers');

module.exports = {
    getDashboardStats,
    getAdvancedAnalytics,
    getUsers,
    getUserDetails,
    createUser,
    updateUser,
    deleteUser,
    exportUserProfiles,
    exportUserTrainings,
    exportSingleUser,
    getUserCertificates: userCertificates.getCertificates,
    createUserCertificate: userCertificates.createCertificate,
    updateUserCertificate: userCertificates.updateCertificate,
    deleteUserCertificate: userCertificates.deleteCertificate,
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
    getAdminCourses: (user) => getAdminCourses(user),
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
    getCourseLessons,
    createLesson,
    updateLesson,
    deleteLesson,
    reorderLessons,
    getCourseQuizAttempts
};
