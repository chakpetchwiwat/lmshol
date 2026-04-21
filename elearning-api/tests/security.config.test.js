const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildCorsOptions,
    getAllowedOrigins,
    getSecurityConfig,
    isOriginAllowed,
    parseTrustProxy
} = require('../src/config/security');

test('getAllowedOrigins appends localhost origins outside production and removes duplicates', () => {
    const allowedOrigins = getAllowedOrigins(
        'development',
        'https://app.example.com,http://localhost:5173'
    );

    assert.deepEqual(allowedOrigins, [
        'https://app.example.com',
        'http://localhost:5173',
        'http://localhost:3000'
    ]);
});

test('getAllowedOrigins does not inject localhost origins in production', () => {
    const allowedOrigins = getAllowedOrigins(
        'production',
        'https://app.example.com,https://admin.example.com'
    );

    assert.deepEqual(allowedOrigins, [
        'https://app.example.com',
        'https://admin.example.com'
    ]);
});

test('parseTrustProxy supports booleans, hop counts, and proxy keywords', () => {
    assert.equal(parseTrustProxy('true'), 1);
    assert.equal(parseTrustProxy('false'), false);
    assert.equal(parseTrustProxy('2'), 2);
    assert.equal(parseTrustProxy('loopback'), 'loopback');
});

test('isOriginAllowed accepts empty origin and exact allowlist matches only', () => {
    const allowlist = ['https://app.example.com'];

    assert.equal(isOriginAllowed(undefined, allowlist), true);
    assert.equal(isOriginAllowed('https://app.example.com', allowlist), true);
    assert.equal(isOriginAllowed('https://evil.example.com', allowlist), false);
});

test('buildCorsOptions rejects origins outside the configured allowlist', async () => {
    const corsOptions = buildCorsOptions({
        allowedOrigins: ['https://app.example.com']
    });

    await new Promise((resolve, reject) => {
        corsOptions.origin('https://evil.example.com', (error, allowed) => {
            try {
                assert.equal(Boolean(error), true);
                assert.equal(allowed, undefined);
                assert.match(error.message, /not allowed/);
                resolve();
            } catch (assertionError) {
                reject(assertionError);
            }
        });
    });
});

test('getSecurityConfig falls back to safe body limits and rate-limit defaults', () => {
    const config = getSecurityConfig({
        NODE_ENV: 'production',
        ALLOWED_ORIGINS: 'https://app.example.com'
    });

    assert.equal(config.bodyLimits.json, '1mb');
    assert.equal(config.bodyLimits.urlencoded, '1mb');
    assert.equal(config.defaultRateLimit.enabled, true);
    assert.equal(config.defaultRateLimit.windowMs, 900000);
    assert.equal(config.defaultRateLimit.max, 300);
    assert.deepEqual(config.allowedOrigins, ['https://app.example.com']);
});
