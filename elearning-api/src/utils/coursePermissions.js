const prisma = require('./prisma');
const authHelpers = require('./auth.helpers');
const { USER_PERMISSIONS, USER_ROLES } = require('./constants/roles');

const COURSE_MANAGEMENT_ACCESS = Object.freeze({
  NONE: 'none',
  READ_ONLY: 'read-only',
  LIMITED: 'limited',
  FULL: 'full'
});

const getUserId = (user) => user?.userId || user?.id || null;

const isAdmin = (user) => (
  user?.permission === USER_PERMISSIONS.SUPERADMIN ||
  user?.permission === USER_PERMISSIONS.ADMIN ||
  user?.role === USER_ROLES.SUPERADMIN ||
  user?.role === USER_ROLES.ADMIN ||
  user?.effectiveRole === USER_ROLES.SUPERADMIN ||
  user?.effectiveRole === USER_ROLES.ADMIN ||
  user?.effectivePermission === USER_PERMISSIONS.SUPERADMIN ||
  user?.effectivePermission === USER_PERMISSIONS.ADMIN ||
  user?.isAdmin === true
);

const isManager = (user) => (
  user?.permission === USER_PERMISSIONS.MANAGER ||
  user?.role === USER_ROLES.MANAGER ||
  user?.effectiveRole === USER_ROLES.MANAGER ||
  user?.effectivePermission === USER_PERMISSIONS.MANAGER ||
  user?.isManager === true
);

const canManagerManageCourse = async (userId, courseId) => {
  const actor = await authHelpers.getActorContext(prisma, { userId });

  if (actor.isAdmin) {
    return true;
  }

  if (!actor.isManager) {
    return false;
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      visibleToAll: true,
      departmentAccess: {
        select: {
          departmentId: true
        }
      }
    }
  });

  if (!course) {
    return false;
  }

  return course.visibleToAll ||
    course.departmentAccess.length === 0 ||
    course.departmentAccess.some((access) => access.departmentId === actor.departmentId);
};

const canManageCourse = async (user, courseId) => {
  const userId = getUserId(user);

  if (!userId || !courseId) {
    return {
      allowed: false,
      access: COURSE_MANAGEMENT_ACCESS.NONE,
      role: null
    };
  }

  if (isAdmin(user)) {
    return {
      allowed: true,
      access: COURSE_MANAGEMENT_ACCESS.FULL,
      role: 'admin'
    };
  }

  const staffRoles = await prisma.courseStaff.findMany({
    where: {
      courseId,
      userId,
    },
    select: {
      role: true
    }
  });

  const roles = staffRoles.map(s => s.role.toLowerCase());

  if (roles.includes('owner')) {
    return {
      allowed: true,
      access: COURSE_MANAGEMENT_ACCESS.FULL,
      role: 'owner'
    };
  }

  if (isManager(user) && await canManagerManageCourse(userId, courseId)) {
    return {
      allowed: true,
      access: COURSE_MANAGEMENT_ACCESS.FULL,
      role: 'manager'
    };
  }

  if (roles.includes('instructor')) {
    return {
      allowed: true,
      access: COURSE_MANAGEMENT_ACCESS.LIMITED,
      role: 'instructor'
    };
  }

  if (roles.includes('trainer')) {
    return {
      allowed: false,
      access: COURSE_MANAGEMENT_ACCESS.READ_ONLY,
      role: 'trainer'
    };
  }

  return {
    allowed: false,
    access: COURSE_MANAGEMENT_ACCESS.NONE,
    role: null
  };
};

module.exports = {
  COURSE_MANAGEMENT_ACCESS,
  isAdmin,
  isManager,
  canManageCourse
};
