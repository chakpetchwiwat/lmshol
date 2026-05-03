const jwt = require('jsonwebtoken');
const { USER_ROLES, ADMIN_PANEL_ROLES } = require('../utils/constants/roles');
const { runWithContext } = require('../utils/context');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Set context for RLS
    runWithContext({ userId: decoded.userId, role: decoded.role }, () => {
      next();
    });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const verifyAdmin = (req, res, next) => {
  if (req.user && (req.user.role === USER_ROLES.SUPERADMIN || req.user.role === USER_ROLES.ADMIN)) {
    next();
  } else {
    res.status(403).json({ message: 'สิทธิ์ระดับผู้ดูแลระบบเท่านั้น (Admin access required)' });
  }
};

const verifySuperAdmin = (req, res, next) => {
  if (req.user && (req.user.role === USER_ROLES.SUPERADMIN || req.user.role === USER_ROLES.ADMIN)) {
    next();
  } else {
    res.status(403).json({ message: 'สิทธิ์ระดับผู้ดูแลระบบสูงสุดเท่านั้น (Superadmin access required)' });
  }
};

const verifyAdminOrManager = (req, res, next) => {
  if (req.user && (req.user.role === USER_ROLES.SUPERADMIN || req.user.role === USER_ROLES.ADMIN || req.user.role === USER_ROLES.MANAGER || req.user.tier?.accessAdmin)) {
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
        courseStaff: { take: 1 }
      }
    });

    if (user && (ADMIN_PANEL_ROLES.includes(user.role) || user.tier?.accessAdmin || (user.courseStaff && user.courseStaff.length > 0))) {
      // Update req.user with latest data for downstream use
      req.user.role = user.role;
      req.user.tier = user.tier;
      req.user.isCourseStaff = (user.courseStaff && user.courseStaff.length > 0);
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
      if (req.user && (req.user.role === USER_ROLES.SUPERADMIN || req.user.role === USER_ROLES.ADMIN)) {
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
