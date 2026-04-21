const { getSecurityConfig } = require('../config/security');
const { getClientIp, logSecurityEvent } = require('../utils/securityEvents');

const loginAttemptStore = new Map();

const normalizeLoginEmail = (email = '') => String(email || '').trim().toLowerCase();

const getLoginAttemptKey = (email, ipAddress) => `${normalizeLoginEmail(email)}::${ipAddress || 'unknown'}`;

const clearExpiredAttempt = (key, now, failureWindowMs) => {
    const state = loginAttemptStore.get(key);
    if (!state) {
        return null;
    }

    if ((state.lockedUntil && state.lockedUntil <= now) || now - state.firstFailureAt > failureWindowMs) {
        loginAttemptStore.delete(key);
        return null;
    }

    return state;
};

const getLoginAttemptState = (email, ipAddress, now = Date.now()) => {
    const { failureWindowMs } = getSecurityConfig().loginLockout;
    return clearExpiredAttempt(getLoginAttemptKey(email, ipAddress), now, failureWindowMs);
};

const recordLoginFailure = (req, email, now = Date.now()) => {
    const { failureWindowMs, maxFailures, lockoutMs } = getSecurityConfig().loginLockout;
    const normalizedEmail = normalizeLoginEmail(email);
    const ipAddress = getClientIp(req);
    const key = getLoginAttemptKey(normalizedEmail, ipAddress);
    const existingState = clearExpiredAttempt(key, now, failureWindowMs);
    const state = existingState || {
        failureCount: 0,
        firstFailureAt: now,
        lockedUntil: null
    };

    state.failureCount += 1;

    if (state.failureCount >= maxFailures) {
        state.lockedUntil = now + lockoutMs;
    }

    loginAttemptStore.set(key, state);

    logSecurityEvent('auth.login.failed', req, {
        email: normalizedEmail || null,
        failureCount: state.failureCount,
        lockedUntil: state.lockedUntil
    });

    if (state.lockedUntil) {
        logSecurityEvent('auth.login.locked', req, {
            email: normalizedEmail || null,
            failureCount: state.failureCount,
            lockoutMs
        });
    }

    return state;
};

const resetLoginFailures = (req, email) => {
    loginAttemptStore.delete(getLoginAttemptKey(email, getClientIp(req)));
};

const clearLoginAttemptStore = () => {
    loginAttemptStore.clear();
};

const enforceLoginLockout = (req, res, next) => {
    const normalizedEmail = normalizeLoginEmail(req.body?.email);
    const state = getLoginAttemptState(normalizedEmail, getClientIp(req));

    if (!state || !state.lockedUntil) {
        next();
        return;
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((state.lockedUntil - Date.now()) / 1000));

    logSecurityEvent('auth.login.lockout_blocked', req, {
        email: normalizedEmail || null,
        failureCount: state.failureCount,
        retryAfterSeconds
    });

    res.setHeader('Retry-After', retryAfterSeconds);
    res.status(429).json({
        success: false,
        message: 'Too many login attempts. Please try again later.'
    });
};

module.exports = {
    clearLoginAttemptStore,
    enforceLoginLockout,
    getLoginAttemptKey,
    getLoginAttemptState,
    normalizeLoginEmail,
    recordLoginFailure,
    resetLoginFailures
};
