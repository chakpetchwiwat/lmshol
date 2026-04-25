/**
 * Admin Courses Service Facade
 */
const crud = require('./courses/admin.courses.crud');
const lessons = require('./courses/admin.lessons');
const history = require('./courses/admin.courses.history');

module.exports = {
    ...crud,
    ...lessons,
    ...history
};
