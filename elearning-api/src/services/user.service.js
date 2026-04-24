/**
 * User Service Facade
 * 
 * This file re-exports functionality from modular sub-services in the user/ directory.
 * It maintains backward compatibility with controllers.
 */

const profile = require('./user/user.profile');
const courses = require('./user/user.courses');
const progress = require('./user/user.progress');
const rewards = require('./user/user.rewards');
const points = require('./user/user.points');
const announcements = require('./user/user.announcements');
const notifications = require('./user/user.notifications');
const documents = require('./user/user.documents');

module.exports = {
    // Profile & Identity
    ...profile,
    
    // Courses & Categories
    ...courses,
    
    // Progress, Enrollment & Quizzes
    ...progress,
    
    // Rewards & Points
    ...rewards,
    ...points,
    
    // Announcements
    ...announcements,
    
    // Notifications
    ...notifications,
    
    // Documents & Streaming
    ...documents
};
