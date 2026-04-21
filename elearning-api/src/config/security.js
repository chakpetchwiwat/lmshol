const rateLimit = require('express-rate-limit');
const { SECURITY_DEFAULTS } = require('../utils/constants/config');

const splitCsv = (value = '') => value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const toUniqueList = (values) => [...new Set(values)];

const getAllowedOrigins = (
    nodeEnv = process.env.NODE_ENV,
    allowedOriginsValue = process.env.ALLOWED_ORIGINS
) => {
    const configuredOrigins = splitCsv(allowedOriginsValue);

    if (nodeEnv !== 'production') {
        return toUniqueList([
            ...configuredOrigins,
            ...SECURITY_DEFAULTS.LOCAL_ALLOWED_ORIGINS
        ]);
    }

    return toUniqueList(configuredOrigins);
};

const isOriginAllowed = (origin, allowedOrigins) => {
    if (!origin) {
        return true;
    }

    return allowedOrigins.includes(origin);
};

const parseTrustProxy = (value = process.env.TRUST_PROXY) => {
    if (value === undefined || value === null || value === '') {
        return SECURITY_DEFAULTS.TRUST_PROXY;
    }

    const normalizedValue = String(value).trim().toLowerCase();

    if (normalizedValue === 'true') {
        // express-rate-limit rejects a permissive boolean true because it trusts
        // every forwarded hop. Treat "true" as a single trusted proxy instead.
        return 1;
    }

    if (normalizedValue === 'false') {
        return false;
    }

    if (['loopback', 'linklocal', 'uniquelocal'].includes(normalizedValue)) {
        return normalizedValue;
    }

    const numericValue = Number.parseInt(normalizedValue, 10);
    if (Number.isInteger(numericValue) && numericValue >= 0) {
        return numericValue;
    }

    return value;
};

const parseLimit = (value, fallback) => {
    if (typeof value === 'string' && value.trim()) {
        return value.trim();
    }

    return fallback;
};

const parsePositiveInteger = (value, fallback) => {
    const parsedValue = Number.parseInt(value, 10);
    return Number.isInteger(parsedValue) && parsedValue > 0
        ? parsedValue
        : fallback;
};

const parseBoolean = (value, fallback) => {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }

    const normalizedValue = String(value).trim().toLowerCase();
    if (normalizedValue === 'true') {
        return true;
    }

    if (normalizedValue === 'false') {
        return false;
    }

    return fallback;
};

const getSecurityConfig = (env = process.env) => ({
    nodeEnv: env.NODE_ENV || 'development',
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
    allowedOrigins: getAllowedOrigins(env.NODE_ENV, env.ALLOWED_ORIGINS),
    bodyLimits: {
        json: parseLimit(env.API_BODY_LIMIT, SECURITY_DEFAULTS.API_BODY_LIMIT),
        urlencoded: parseLimit(env.URLENCODED_BODY_LIMIT, SECURITY_DEFAULTS.URLENCODED_BODY_LIMIT)
    },
    defaultRateLimit: {
        enabled: parseBoolean(
            env.SECURITY_ENABLE_DEFAULT_RATE_LIMIT,
            SECURITY_DEFAULTS.ENABLE_DEFAULT_RATE_LIMIT
        ),
        windowMs: parsePositiveInteger(
            env.DEFAULT_RATE_LIMIT_WINDOW_MS,
            SECURITY_DEFAULTS.DEFAULT_RATE_LIMIT_WINDOW_MS
        ),
        max: parsePositiveInteger(
            env.DEFAULT_RATE_LIMIT_MAX,
            SECURITY_DEFAULTS.DEFAULT_RATE_LIMIT_MAX
        )
    },
    authLoginRateLimit: {
        windowMs: parsePositiveInteger(
            env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS,
            SECURITY_DEFAULTS.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS
        ),
        max: parsePositiveInteger(
            env.AUTH_LOGIN_RATE_LIMIT_MAX,
            SECURITY_DEFAULTS.AUTH_LOGIN_RATE_LIMIT_MAX
        )
    },
    loginLockout: {
        failureWindowMs: parsePositiveInteger(
            env.AUTH_LOGIN_FAILURE_WINDOW_MS,
            SECURITY_DEFAULTS.AUTH_LOGIN_FAILURE_WINDOW_MS
        ),
        maxFailures: parsePositiveInteger(
            env.AUTH_LOGIN_LOCKOUT_MAX_FAILURES,
            SECURITY_DEFAULTS.AUTH_LOGIN_LOCKOUT_MAX_FAILURES
        ),
        lockoutMs: parsePositiveInteger(
            env.AUTH_LOGIN_LOCKOUT_MS,
            SECURITY_DEFAULTS.AUTH_LOGIN_LOCKOUT_MS
        )
    },
    uploadRateLimit: {
        windowMs: parsePositiveInteger(
            env.UPLOAD_RATE_LIMIT_WINDOW_MS,
            SECURITY_DEFAULTS.UPLOAD_RATE_LIMIT_WINDOW_MS
        ),
        max: parsePositiveInteger(
            env.UPLOAD_RATE_LIMIT_MAX,
            SECURITY_DEFAULTS.UPLOAD_RATE_LIMIT_MAX
        )
    },
    adminAnalyticsRateLimit: {
        windowMs: parsePositiveInteger(
            env.ADMIN_ANALYTICS_RATE_LIMIT_WINDOW_MS,
            SECURITY_DEFAULTS.ADMIN_ANALYTICS_RATE_LIMIT_WINDOW_MS
        ),
        max: parsePositiveInteger(
            env.ADMIN_ANALYTICS_RATE_LIMIT_MAX,
            SECURITY_DEFAULTS.ADMIN_ANALYTICS_RATE_LIMIT_MAX
        )
    },
    goalReportRateLimit: {
        windowMs: parsePositiveInteger(
            env.GOAL_REPORT_RATE_LIMIT_WINDOW_MS,
            SECURITY_DEFAULTS.GOAL_REPORT_RATE_LIMIT_WINDOW_MS
        ),
        max: parsePositiveInteger(
            env.GOAL_REPORT_RATE_LIMIT_MAX,
            SECURITY_DEFAULTS.GOAL_REPORT_RATE_LIMIT_MAX
        )
    },
    uploadMaxFileSizeBytes: parsePositiveInteger(
        env.UPLOAD_MAX_FILE_SIZE_MB,
        SECURITY_DEFAULTS.UPLOAD_MAX_FILE_SIZE_MB
    ) * 1024 * 1024
});

const buildCorsOptions = (securityConfig = getSecurityConfig()) => ({
    origin: (origin, callback) => {
        if (isOriginAllowed(origin, securityConfig.allowedOrigins)) {
            callback(null, true);
            return;
        }

        callback(new Error(`CORS: Origin "${origin}" not allowed`));
    },
    credentials: true,
    methods: SECURITY_DEFAULTS.ALLOWED_METHODS,
    allowedHeaders: SECURITY_DEFAULTS.ALLOWED_HEADERS
});

const buildHelmetOptions = () => ({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
});

const createDefaultApiLimiter = (securityConfig = getSecurityConfig()) => {
    if (!securityConfig.defaultRateLimit.enabled) {
        return (req, res, next) => next();
    }

    return rateLimit({
        windowMs: securityConfig.defaultRateLimit.windowMs,
        limit: securityConfig.defaultRateLimit.max,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => req.method === 'OPTIONS',
        message: {
            success: false,
            message: 'Too many requests. Please try again later.'
        }
    });
};

module.exports = {
    buildCorsOptions,
    buildHelmetOptions,
    createDefaultApiLimiter,
    getAllowedOrigins,
    getSecurityConfig,
    isOriginAllowed,
    parseTrustProxy
};
