const prisma = require('./prisma');
const authHelpers = require('./auth.helpers');

const COURSE_MANAGEMENT_ACCESS = Object.freeze({
  NONE: 'none',
  READ_ONLY: 'read-only',
  LIMITED: 'limited',
  FULL: 'full'
});

const getUserId = (user) => user?.userId || user?.id || null;

const isAdmin = (user) => (
  user?.role === 'admin' ||
  user?.effectiveRole === 'admin' ||
  user?.isAdmin === true
);

const isManager = (user) => (
  user?.role === 'manager' ||
  user?.effectiveRole === 'manager' ||
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

  const staffRoles = await prisma.courseStaff.findMany({
    where: {
      courseId,
      userId,
      role: {
        in: ['owner', 'instructor', 'trainer']
      }
    },
    select: {
      role: true
    }
  });

  if (staffRoles.some((staff) => staff.role === 'owner')) {
    return {
      allowed: true,
      access: COURSE_MANAGEMENT_ACCESS.FULL,
      role: 'owner'
    };
  }

  if (isAdmin(user)) {
    return {
      allowed: true,
      access: COURSE_MANAGEMENT_ACCESS.FULL,
      role: 'admin'
    };
  }

  if (isManager(user) && await canManagerManageCourse(userId, courseId)) {
    return {
      allowed: true,
      access: COURSE_MANAGEMENT_ACCESS.FULL,
      role: 'manager'
    };
  }

  if (staffRoles.some((staff) => staff.role === 'instructor')) {
    return {
      allowed: true,
      access: COURSE_MANAGEMENT_ACCESS.LIMITED,
      role: 'instructor'
    };
  }

  if (staffRoles.some((staff) => staff.role === 'trainer')) {
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
  canManageCourse
};
