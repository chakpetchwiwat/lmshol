/**
 * Goal Service Facade
 * 
 * This file re-exports functionality from modular sub-services in the goal/ directory.
 * It maintains backward compatibility with controllers.
 */

const crud = require('./goal/goal.crud');
const reports = require('./goal/goal.reports');
const notifications = require('./goal/goal.notifications');

module.exports = {
    // Lifecycle Operations (CRUD)
    ...crud,
    
    // Reporting & Analytics
    ...reports,
    
    // Notification Helpers (if needed externally)
    ...notifications
};
