const { ipKeyGenerator, rateLimit } = require('express-rate-limit');
const { getSecurityConfig } = require('../config/security');
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

const authLoginRateLimiter = rateLimit({
    windowMs: securityConfig.authLoginRateLimit.windowMs,
    limit: securityConfig.authLoginRateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    handler: buildLimiterHandler(
        'auth.login.rate_limited',
        'Too many login attempts. Please try again later.'
    )
});

const uploadRateLimiter = rateLimit({
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
});

const adminAnalyticsRateLimiter = rateLimit({
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
});

module.exports = {
    adminAnalyticsRateLimiter,
    authLoginRateLimiter,
    uploadRateLimiter
};
