const prisma = require('../utils/prisma');
const ErrorResponse = require('../utils/errorResponse');
const {
  buildCourseVisibilityWhere,
  canAccessCourse,
  getVisibleCourseQuery
} = require('./user/user.visibility');
const {
  COURSE_MANAGEMENT_ACCESS,
  canManageCourse
} = require('../utils/coursePermissions');

const COURSE_STAFF_ROLES = new Set(['owner', 'instructor', 'trainer']);

const mapCourseStaff = (staff) => ({
  id: staff.id,
  userId: staff.userId,
  name: staff.user.name,
  role: staff.role,
  isPrimary: staff.isPrimary
});

const isUniqueConstraintError = (error) => error?.code === 'P2002';

const mapCourseStaffConstraintError = (error) => {
  if (!isUniqueConstraintError(error)) {
    return error;
  }

  const target = Array.isArray(error.meta?.target)
    ? error.meta.target.join(',')
    : String(error.meta?.target || '');

  if (target.includes('CourseStaff_one_owner_per_course')) {
    return new ErrorResponse('Course already has an owner', 400);
  }

  if (target.includes('CourseStaff_one_primary_instructor_per_course')) {
    return new ErrorResponse('Course already has a primary instructor', 400);
  }

  return new ErrorResponse('User is already assigned to this course with this role.', 409);
};

const validateCourseStaffRole = (role) => {
  if (!COURSE_STAFF_ROLES.has(role)) {
    throw new ErrorResponse('Invalid course staff role', 400);
  }
};

const ensureCourseAndUserExist = async (tx, courseId, userId) => {
  const [course, user] = await Promise.all([
    tx.course.findUnique({
      where: { id: courseId },
      select: { id: true }
    }),
    tx.user.findUnique({
      where: { id: userId },
      select: { id: true }
    })
  ]);

  if (!course) {
    throw new ErrorResponse('Course not found', 404);
  }

  if (!user) {
    throw new ErrorResponse('User not found', 404);
  }
};

const ensureOwnerAvailable = async (tx, courseId, excludeStaffId) => {
  const owner = await tx.courseStaff.findFirst({
    where: {
      courseId,
      role: 'owner',
      ...(excludeStaffId ? { id: { not: excludeStaffId } } : {})
    },
    select: { id: true }
  });

  if (owner) {
    throw new ErrorResponse('Course already has an owner', 400);
  }
};

const unsetPrimaryInstructor = async (tx, courseId, excludeStaffId) => {
  await tx.courseStaff.updateMany({
    where: {
      courseId,
      role: 'instructor',
      isPrimary: true,
      ...(excludeStaffId ? { id: { not: excludeStaffId } } : {})
    },
    data: {
      isPrimary: false
    }
  });
};

const canViewCourseStaff = async (courseId, authUser) => {
  const permission = await canManageCourse(authUser, courseId);

  if (permission.access !== COURSE_MANAGEMENT_ACCESS.NONE) {
    return true;
  }

  const userId = authUser?.userId || authUser?.id;
  if (!userId) {
    return false;
  }

  const userContext = await getVisibleCourseQuery(userId);
  const referenceDate = new Date();
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      ...buildCourseVisibilityWhere(userContext, referenceDate)
    },
    include: {
      category: {
        include: {
          departmentAccess: {
            include: {
              department: true
            }
          },
          tierAccess: {
            include: {
              tier: true
            }
          }
        }
      },
      departmentAccess: {
        include: {
          department: true
        }
      },
      tierAccess: {
        include: {
          tier: true
        }
      }
    }
  });

  return !!course && canAccessCourse(course, userContext, referenceDate);
};

const getCourseStaff = async (courseId, authUser) => {
  if (authUser && !(await canViewCourseStaff(courseId, authUser))) {
    throw new ErrorResponse('Course not found', 404);
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      staff: {
        orderBy: [
          { role: 'asc' },
          { isPrimary: 'desc' },
          { createdAt: 'asc' }
        ],
        include: {
          user: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  if (!course) {
    throw new ErrorResponse('Course not found', 404);
  }

  return course.staff.map(mapCourseStaff);
};

const assignCourseStaff = async (courseId, payload) => {
  const { userId, role } = payload;
  const isPrimary = role === 'instructor' && payload.isPrimary === true;

  if (!userId) {
    throw new ErrorResponse('userId is required', 400);
  }

  validateCourseStaffRole(role);

  try {
    return await prisma.$transaction(async (tx) => {
      await ensureCourseAndUserExist(tx, courseId, userId);

      if (role === 'owner') {
        await ensureOwnerAvailable(tx, courseId);
      }

      if (isPrimary) {
        await unsetPrimaryInstructor(tx, courseId);
      }

      const staff = await tx.courseStaff.create({
        data: {
          courseId,
          userId,
          role,
          isPrimary
        },
        include: {
          user: {
            select: {
              name: true
            }
          }
        }
      });

      return mapCourseStaff(staff);
    });
  } catch (error) {
    throw mapCourseStaffConstraintError(error);
  }
};

const updateCourseStaff = async (courseId, staffId, payload) => {
  const hasRole = Object.prototype.hasOwnProperty.call(payload, 'role');
  const hasIsPrimary = Object.prototype.hasOwnProperty.call(payload, 'isPrimary');

  if (!hasRole && !hasIsPrimary) {
    throw new ErrorResponse('role or isPrimary is required', 400);
  }

  if (hasRole) {
    validateCourseStaffRole(payload.role);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const existingStaff = await tx.courseStaff.findFirst({
        where: {
          id: staffId,
          courseId
        },
        select: {
          id: true,
          role: true,
          isPrimary: true
        }
      });

      if (!existingStaff) {
        const course = await tx.course.findUnique({
          where: { id: courseId },
          select: { id: true }
        });

        if (!course) {
          throw new ErrorResponse('Course not found', 404);
        }

        throw new ErrorResponse('Course staff not found', 404);
      }

      const nextRole = hasRole ? payload.role : existingStaff.role;
      const nextIsPrimary = nextRole === 'instructor'
        ? (hasIsPrimary ? payload.isPrimary === true : existingStaff.isPrimary)
        : false;

      if (nextRole === 'owner') {
        await ensureOwnerAvailable(tx, courseId, staffId);
      }

      if (nextIsPrimary) {
        await unsetPrimaryInstructor(tx, courseId, staffId);
      }

      const staff = await tx.courseStaff.update({
        where: { id: staffId },
        data: {
          ...(hasRole ? { role: nextRole } : {}),
          isPrimary: nextIsPrimary
        },
        include: {
          user: {
            select: {
              name: true
            }
          }
        }
      });

      return mapCourseStaff(staff);
    });
  } catch (error) {
    throw mapCourseStaffConstraintError(error);
  }
};

const deleteCourseStaff = async (courseId, staffId) => {
  return prisma.$transaction(async (tx) => {
    const staff = await tx.courseStaff.findFirst({
      where: {
        id: staffId,
        courseId
      },
      select: {
        id: true,
        role: true
      }
    });

    if (!staff) {
      const course = await tx.course.findUnique({
        where: { id: courseId },
        select: { id: true }
      });

      if (!course) {
        throw new ErrorResponse('Course not found', 404);
      }

      throw new ErrorResponse('Course staff not found', 404);
    }

    if (staff.role === 'owner') {
      const ownerCount = await tx.courseStaff.count({
        where: {
          courseId,
          role: 'owner'
        }
      });

      if (ownerCount <= 1) {
        throw new ErrorResponse('Cannot delete last owner', 400);
      }
    }

    await tx.courseStaff.delete({
      where: { id: staffId }
    });

    return { id: staffId };
  });
};

module.exports = {
  getCourseStaff,
  assignCourseStaff,
  updateCourseStaff,
  deleteCourseStaff
};
