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
  if (req.user && req.user.role === USER_ROLES.ADMIN) {
    next();
  } else {
    res.status(403).json({ message: 'Superadmin access required' });
  }
};

const verifySuperAdmin = verifyAdmin;

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

module.exports = {
  verifyToken,
  verifyAdmin,
  verifySuperAdmin,
  verifyAdminPanelAccess
};
