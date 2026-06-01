const jwt = require('jsonwebtoken');
const { USER_PERMISSIONS, ADMIN_PANEL_PERMISSIONS, USER_ROLES, ADMIN_PANEL_ROLES } = require('../utils/constants/roles');
const { runWithContext } = require('../utils/context');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Normalize decoded token payload
    const permission = decoded.permission || decoded.role || 'user';
    req.user = {
      ...decoded,
      permission,
      role: permission // Compatibility alias
    };

    // Set context for RLS
    runWithContext({ userId: decoded.userId, role: permission }, () => {
      next();
    });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const verifyAdmin = (req, res, next) => {
  if (req.user && (req.user.permission === USER_PERMISSIONS.SUPERADMIN || req.user.permission === USER_PERMISSIONS.ADMIN)) {
    next();
  } else {
    res.status(403).json({ message: 'สิทธิ์ระดับผู้ดูแลระบบเท่านั้น (Admin access required)' });
  }
};

const verifySuperAdmin = (req, res, next) => {
  if (req.user && (req.user.permission === USER_PERMISSIONS.SUPERADMIN || req.user.permission === USER_PERMISSIONS.ADMIN)) {
    next();
  } else {
    res.status(403).json({ message: 'สิทธิ์ระดับผู้ดูแลระบบสูงสุดเท่านั้น (Superadmin access required)' });
  }
};

const verifyAdminOrManager = (req, res, next) => {
  if (req.user && (req.user.permission === USER_PERMISSIONS.SUPERADMIN || req.user.permission === USER_PERMISSIONS.ADMIN || req.user.permission === USER_PERMISSIONS.MANAGER || req.user.tier?.accessAdmin || req.user.isSupervisor)) {
    next();
  } else {
    res.status(403).json({ message: 'สิทธิ์ระดับผู้ดูแลแผนกหรือแอดมินเท่านั้น (Manager or Admin access required)' });
  }
};

const prisma = require('../utils/prisma');

const verifyAdminPanelAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { 
        tier: true,
        courseStaff: { take: 1 },
        cohortSupervisors: {
          take: 1,
          select: { supervisorId: true }
        },
        cohortRoleSupervisorRoles: {
          take: 1,
          select: { supervisorId: true }
        }
      }
    });

    const isSupervisor = (user?.cohortSupervisors?.length || 0) > 0 || (user?.cohortRoleSupervisorRoles?.length || 0) > 0;

    if (user && (ADMIN_PANEL_PERMISSIONS.includes(user.permission) || user.tier?.accessAdmin || (user.courseStaff && user.courseStaff.length > 0) || isSupervisor)) {
      // Update req.user with latest data for downstream use
      req.user.permission = user.permission;
      req.user.role = user.permission; // Compatibility alias
      req.user.tier = user.tier;
      req.user.isCourseStaff = (user.courseStaff && user.courseStaff.length > 0);
      req.user.isSupervisor = isSupervisor;
      next();
    } else {
      res.status(403).json({ message: 'Admin panel access required' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error verifying permissions' });
  }
};

const verifyCourseAccess = async (req, res, next) => {
  const { canManageCourse, COURSE_MANAGEMENT_ACCESS } = require('../utils/coursePermissions');
  const courseId = req.params.id || req.params.courseId || req.body.courseId;

  if (!courseId) {
    return res.status(400).json({ message: 'Course ID is required for permission check' });
  }

  try {
    const { allowed, access } = await canManageCourse(req.user, courseId);
    
    if (allowed && (access === COURSE_MANAGEMENT_ACCESS.FULL || access === COURSE_MANAGEMENT_ACCESS.LIMITED)) {
      next();
    } else {
      // If it's a superadmin/admin, they should ALWAYS have access even if not in CourseStaff
      if (req.user && (req.user.permission === USER_PERMISSIONS.SUPERADMIN || req.user.permission === USER_PERMISSIONS.ADMIN)) {
        return next();
      }
      res.status(403).json({ message: 'คุณไม่มีสิทธิ์จัดการคอร์สนี้ (You do not have permission to manage this course)' });
    }
  } catch (error) {
    console.error('Verify course access error:', error);
    res.status(500).json({ message: 'Error verifying course permissions' });
  }
};

module.exports = {
  verifyToken,
  verifyAdmin,
  verifySuperAdmin,
  verifyAdminOrManager,
  verifyAdminPanelAccess,
  verifyCourseAccess
};
