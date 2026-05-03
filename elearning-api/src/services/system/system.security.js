const { getRedisClient, getSecurityConfig } = require('../../config/security');

/**
 * Get the current security status including rate limiting info
 */
const getSecurityStatus = async () => {
    const config = getSecurityConfig();
    const redis = await getRedisClient();
    
    return {
        rateLimiting: {
            enabled: config.defaultRateLimit.enabled,
            store: redis ? 'Redis' : 'Memory',
            windowMs: config.defaultRateLimit.windowMs,
            maxRequests: config.defaultRateLimit.max
        },
        auth: {
            loginLimit: config.authLoginRateLimit.max,
            lockoutFailures: config.loginLockout.maxFailures,
            lockoutDuration: config.loginLockout.lockoutMs
        }
    };
};

/**
 * Reset rate limit for a specific identifier (IP or User ID)
 */
const resetRateLimit = async (identifier) => {
    const redis = await getRedisClient();
    if (!redis) {
        throw new Error('Cannot reset rate limit manually when using Memory Store. Please restart the server or wait for the window to expire.');
    }

    const prefixes = ['rl:default:', 'rl:auth:', 'rl:analytics:', 'rl:upload:', 'rl:goal:'];
    const keys = prefixes.map(p => `${p}${identifier}`);
    
    const results = await Promise.all(keys.map(key => redis.del(key)));
    const deletedCount = results.reduce((a, b) => a + b, 0);

    return {
        success: true,
        identifier,
        deletedCount,
        message: deletedCount > 0 
            ? `Successfully cleared ${deletedCount} rate limit keys for ${identifier}`
            : `No active rate limit found for ${identifier}`
    };
};

module.exports = {
    getSecurityStatus,
    resetRateLimit
};
