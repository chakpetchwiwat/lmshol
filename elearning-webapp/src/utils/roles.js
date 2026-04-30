import { USER_ROLES, ADMIN_PANEL_ROLES } from './constants/roles';

export const canAccessAdminPanel = (user) => {
  if (!user) return false;
  return ADMIN_PANEL_ROLES.includes(user.role) || user.tier?.accessAdmin === true || user.isCourseStaff === true;
};

export const isSuperAdmin = (user) => user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.ADMIN;
export const canEditAdminUsers = (user) => user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.ADMIN;

export const getRoleLabel = (user) => {
  if (user?.role === USER_ROLES.SUPERADMIN) return 'Super Admin';
  if (user?.role === USER_ROLES.ADMIN) return 'Admin';
  if (user?.role === USER_ROLES.MANAGER || user?.tier?.accessAdmin) return 'Manager';
  if (user?.isCourseStaff) return 'Course Staff';
  return 'User';
};
