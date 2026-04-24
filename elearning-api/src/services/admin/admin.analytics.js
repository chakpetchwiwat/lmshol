/**
 * Admin Analytics Service Facade
 * 
 * This file re-exports functionality from modular sub-services.
 * It maintains backward compatibility with controllers and other services.
 */

const engine = require('./analytics/admin.analytics.engine');
const dashboard = require('./analytics/admin.analytics.dashboard');
const advanced = require('./analytics/admin.analytics.advanced');
const atRisk = require('./analytics/admin.analytics.at-risk');

module.exports = {
    // Engine & Utilities
    ...engine,
    
    // Dashboard Core
    ...dashboard,
    
    // Advanced & Participation
    ...advanced,
    
    // Risk Analysis
    ...atRisk
};
