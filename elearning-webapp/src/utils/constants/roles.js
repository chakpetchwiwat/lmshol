export const USER_PERMISSIONS = Object.freeze({
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
});

export const ADMIN_PANEL_PERMISSIONS = Object.freeze([
  USER_PERMISSIONS.SUPERADMIN,
  USER_PERMISSIONS.ADMIN,
  USER_PERMISSIONS.MANAGER,
]);

// Compatibility aliases
export const USER_ROLES = USER_PERMISSIONS;
export const ADMIN_PANEL_ROLES = ADMIN_PANEL_PERMISSIONS;
