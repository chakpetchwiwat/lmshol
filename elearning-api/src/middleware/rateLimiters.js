const { ipKeyGenerator, rateLimit } = require('express-rate-limit');
const { getSecurityConfig, createDynamicLimiter } = require('../config/security');
const { logSecurityEvent } = require('../utils/securityEvents');

const buildLimiterHandler = (eventName, message) => (req, res, next, options) => {
    logSecurityEvent(eventName, req, {
        limit: options.limit,
        windowMs: options.windowMs
    });

    res.status(options.statusCode).json({
        success: false,
        message
    });
};

const securityConfig = getSecurityConfig();
const getActorOrIpKey = (req) => req.user?.userId
    ? `user:${req.user.userId}`
    : ipKeyGenerator(req.ip);

const authLoginRateLimiter = createDynamicLimiter({
    windowMs: securityConfig.authLoginRateLimit.windowMs,
    limit: securityConfig.authLoginRateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    handler: buildLimiterHandler(
        'auth.login.rate_limited',
        'Too many login attempts. Please try again later.'
    )
}, 'rl:auth:');

const uploadRateLimiter = createDynamicLimiter({
    windowMs: securityConfig.uploadRateLimit.windowMs,
    limit: securityConfig.uploadRateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    keyGenerator: getActorOrIpKey,
    handler: buildLimiterHandler(
        'upload.rate_limited',
        'Too many upload attempts. Please try again later.'
    )
}, 'rl:upload:');

const adminAnalyticsRateLimiter = createDynamicLimiter({
    windowMs: securityConfig.adminAnalyticsRateLimit.windowMs,
    limit: securityConfig.adminAnalyticsRateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    keyGenerator: getActorOrIpKey,
    handler: buildLimiterHandler(
        'admin.analytics.rate_limited',
        'Too many analytics requests. Please try again later.'
    )
}, 'rl:analytics:');

const goalReportRateLimiter = createDynamicLimiter({
    windowMs: securityConfig.goalReportRateLimit.windowMs,
    limit: securityConfig.goalReportRateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    keyGenerator: getActorOrIpKey,
    handler: buildLimiterHandler(
        'goal.report.rate_limited',
        'Too many goal report requests. Please try again later.'
    )
}, 'rl:goal:');

module.exports = {
    adminAnalyticsRateLimiter,
    authLoginRateLimiter,
    goalReportRateLimiter,
    uploadRateLimiter
};
