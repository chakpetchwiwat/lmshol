/**
 * Admin Users Service Facade
 */
const crud = require('./users/admin.users.crud');
const details = require('./users/admin.users.details');
const exportsMod = require('./users/admin.users.export');

module.exports = {
    ...crud,
    ...details,
    ...exportsMod
};
