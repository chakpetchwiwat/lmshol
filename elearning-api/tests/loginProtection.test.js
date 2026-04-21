const test = require('node:test');
const assert = require('node:assert/strict');

const {
    clearLoginAttemptStore,
    enforceLoginLockout,
    getLoginAttemptState,
    recordLoginFailure
} = require('../src/middleware/loginProtection');

const createRequest = (email) => ({
    body: { email },
    headers: {},
    ip: '127.0.0.1',
    method: 'POST',
    originalUrl: '/api/auth/login'
});

test('recordLoginFailure locks the request key after the configured threshold', () => {
    clearLoginAttemptStore();
    process.env.AUTH_LOGIN_LOCKOUT_MAX_FAILURES = '2';
    process.env.AUTH_LOGIN_FAILURE_WINDOW_MS = '60000';
    process.env.AUTH_LOGIN_LOCKOUT_MS = '120000';

    const req = createRequest('user@example.com');
    recordLoginFailure(req, 'user@example.com', 1000);
    const state = recordLoginFailure(req, 'user@example.com', 2000);

    assert.equal(state.failureCount, 2);
    assert.equal(Boolean(state.lockedUntil), true);
});

test('enforceLoginLockout returns 429 while the lockout is active', () => {
    clearLoginAttemptStore();
    process.env.AUTH_LOGIN_LOCKOUT_MAX_FAILURES = '1';
    process.env.AUTH_LOGIN_FAILURE_WINDOW_MS = '60000';
    process.env.AUTH_LOGIN_LOCKOUT_MS = '120000';

    const req = createRequest('locked@example.com');
    recordLoginFailure(req, 'locked@example.com', Date.now());

    const response = {
        headers: {},
        statusCode: 200,
        body: null,
        setHeader(name, value) {
            this.headers[name] = value;
        },
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };

    let nextCalled = false;
    enforceLoginLockout(req, response, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(response.statusCode, 429);
    assert.equal(response.body.success, false);
    assert.ok(response.headers['Retry-After']);
});

test('getLoginAttemptState clears expired attempts outside the failure window', () => {
    clearLoginAttemptStore();
    process.env.AUTH_LOGIN_LOCKOUT_MAX_FAILURES = '5';
    process.env.AUTH_LOGIN_FAILURE_WINDOW_MS = '1000';
    process.env.AUTH_LOGIN_LOCKOUT_MS = '2000';

    const req = createRequest('expire@example.com');
    recordLoginFailure(req, 'expire@example.com', 1000);

    const expiredState = getLoginAttemptState('expire@example.com', '127.0.0.1', 3005);
    assert.equal(expiredState, null);
});
