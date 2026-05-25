/**
 * Admin Users Service Facade
 */
const crud = require('./users/admin.users.crud');
const details = require('./users/admin.users.details');
const exportsMod = require('./users/admin.users.export');
const importMod = require('./users/admin.users.import');

module.exports = {
    ...crud,
    ...details,
    ...exportsMod,
    ...importMod
};
