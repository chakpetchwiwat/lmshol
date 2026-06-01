import { USER_PERMISSIONS, ADMIN_PANEL_PERMISSIONS } from './constants/roles';

export const canAccessAdminPanel = (user) => {
  if (!user) return false;
  const permission = user.permission || user.role;
  return ADMIN_PANEL_PERMISSIONS.includes(permission) || user.tier?.accessAdmin === true || user.isCourseStaff === true || user.isSupervisor === true;
};

export const isSuperAdmin = (user) => {
  const permission = user?.permission || user?.role;
  return permission === USER_PERMISSIONS.SUPERADMIN || permission === USER_PERMISSIONS.ADMIN;
};

export const canEditAdminUsers = (user) => {
  const permission = user?.permission || user?.role;
  return permission === USER_PERMISSIONS.SUPERADMIN || permission === USER_PERMISSIONS.ADMIN;
};

export const getRoleLabel = (user) => {
  const permission = user?.permission || user?.role;
  if (permission === USER_PERMISSIONS.SUPERADMIN) return 'Admin';
  if (permission === USER_PERMISSIONS.ADMIN) return 'Admin';
  if (permission === USER_PERMISSIONS.MANAGER || user?.tier?.accessAdmin) return 'Manager';
  if (user?.isSupervisor) return 'Supervisor';
  if (user?.isCourseStaff) return 'Course Staff';
  return 'User';
};
