const { getRedisClient } = require('../config/security');

/**
 * Resilient read-through caching using Redis.
 * If Redis is disabled or fails to connect, it falls back to the database function directly.
 */
const getCachedData = async (key, fetchFn, ttlSeconds = 300) => {
    try {
        const redis = await getRedisClient();
        if (redis) {
            const cached = await redis.get(key);
            if (cached) {
                return JSON.parse(cached);
            }
        }
    } catch (err) {
        console.error(`[Cache] Error reading key ${key}:`, err);
    }

    // Fallback to fetchFn
    const data = await fetchFn();

    try {
        const redis = await getRedisClient();
        if (redis && data !== undefined && data !== null) {
            await redis.setEx(key, ttlSeconds, JSON.stringify(data));
        }
    } catch (err) {
        console.error(`[Cache] Error writing key ${key}:`, err);
    }

    return data;
};

/**
 * Resilient cache eviction. Supports exact keys and wildcard patterns (e.g. 'categories:*').
 */
const evictCache = async (keyOrPattern) => {
    try {
        const redis = await getRedisClient();
        if (!redis) return;

        if (keyOrPattern.includes('*')) {
            const keys = await redis.keys(keyOrPattern);
            if (keys.length > 0) {
                await redis.del(keys);
            }
        } else {
            await redis.del(keyOrPattern);
        }
    } catch (err) {
        console.error(`[Cache] Error evicting cache pattern ${keyOrPattern}:`, err);
    }
};

module.exports = {
    getCachedData,
    evictCache
};
