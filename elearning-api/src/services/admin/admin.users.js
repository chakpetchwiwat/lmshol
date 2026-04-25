/**
 * Admin Users Service Facade
 */
const crud = require('./users/admin.users.crud');
const details = require('./users/admin.users.details');

module.exports = {
    ...crud,
    ...details
};
