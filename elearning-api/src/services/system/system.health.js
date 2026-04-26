const prisma = require('../../utils/prisma');
const { getRedisClient } = require('../../config/security');
const os = require('os');

/**
 * Performs a comprehensive health check of the system's core components.
 */
const checkSystemHealth = async () => {
    const health = {
        status: 'UP',
        timestamp: new Date().toISOString(),
        services: {
            database: { status: 'UNKNOWN' },
            redis: { status: 'UNKNOWN' },
            server: { status: 'UP' }
        },
        system: {
            uptime: process.uptime(),
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                process: process.memoryUsage()
            },
            cpu: os.loadavg(),
            nodeVersion: process.version,
            platform: process.platform
        }
    };

    // 1. Database Check (Prisma)
    try {
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        health.services.database = {
            status: 'UP',
            latency: `${Date.now() - start}ms`
        };
    } catch (err) {
        health.services.database = {
            status: 'DOWN',
            error: err.message
        };
        health.status = 'DEGRADED';
    }

    // 2. Redis Check
    try {
        const redis = await getRedisClient();
        if (redis) {
            const start = Date.now();
            await redis.ping();
            health.services.redis = {
                status: 'UP',
                latency: `${Date.now() - start}ms`
            };
        } else {
            health.services.redis = {
                status: 'DISABLED',
                message: 'Redis is not enabled in this environment'
            };
        }
    } catch (err) {
        health.services.redis = {
            status: 'DOWN',
            error: err.message
        };
        health.status = 'DEGRADED';
    }

    return health;
};

module.exports = {
    checkSystemHealth
};
