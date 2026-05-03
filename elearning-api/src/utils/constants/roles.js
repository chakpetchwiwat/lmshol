const USER_ROLES = Object.freeze({
    SUPERADMIN: 'superadmin',
    ADMIN: 'admin',
    MANAGER: 'manager',
    USER: 'user'
});

const ADMIN_PANEL_ROLES = Object.freeze([
    USER_ROLES.SUPERADMIN,
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER
]);

const MANAGED_USER_ROLES = Object.freeze([
    USER_ROLES.USER,
    USER_ROLES.MANAGER
]);

module.exports = {
    USER_ROLES,
    ADMIN_PANEL_ROLES,
    MANAGED_USER_ROLES
};
