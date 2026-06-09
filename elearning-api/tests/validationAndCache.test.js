const test = require('node:test');
const assert = require('node:assert/strict');

// 1. Mock getRedisClient before requiring cache.helpers
const security = require('../src/config/security');

let mockRedis = null;
const originalGetRedisClient = security.getRedisClient;
security.getRedisClient = async () => mockRedis;

const cacheHelpers = require('../src/utils/cache.helpers');
const { validateBodySchema, courseSchema, categorySchema, competencySchema } = require('../src/utils/validation.helpers');

test('validateBodySchema middleware - valid input calls next', () => {
    let calledNext = false;
    const req = {
        body: {
            title: 'คอร์สเรียนทดสอบความถูกต้อง',
            points: 10
        }
    };
    const res = {
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            this.jsonData = data;
            return this;
        }
    };
    const next = () => {
        calledNext = true;
    };

    const middleware = validateBodySchema(courseSchema);
    middleware(req, res, next);

    assert.equal(calledNext, true);
    assert.equal(res.statusCode, undefined);
});

test('validateBodySchema middleware - invalid input returns 400 with Thai errors', () => {
    let calledNext = false;
    const req = {
        body: {
            title: '', // Required but empty
            points: -5 // Must be at least 0
        }
    };
    const res = {
        statusCode: null,
        jsonData: null,
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            this.jsonData = data;
            return this;
        }
    };
    const next = () => {
        calledNext = true;
    };

    const middleware = validateBodySchema(courseSchema);
    middleware(req, res, next);

    assert.equal(calledNext, false);
    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.success, false);
    assert.equal(res.jsonData.message, 'ข้อมูลนำเข้าไม่ถูกต้อง');
    
    const errors = res.jsonData.errors;
    assert.ok(errors.length >= 2);
    
    const titleError = errors.find(e => e.field === 'title');
    assert.ok(titleError);
    assert.equal(titleError.message, 'กรุณาระบุชื่อคอร์สเรียน');

    const pointsError = errors.find(e => e.field === 'points');
    assert.ok(pointsError);
    assert.equal(pointsError.message, 'ฟิลด์ points ต้องมีค่าอย่างน้อย 0');
});

test('validateBodySchema middleware - validation of categories', () => {
    const req = { body: { name: '' } };
    const res = {
        statusCode: null,
        status: function(code) { this.statusCode = code; return this; },
        json: function(data) { this.jsonData = data; return this; }
    };
    const next = () => {};

    validateBodySchema(categorySchema)(req, res, next);
    assert.equal(res.statusCode, 400);
    assert.equal(res.jsonData.errors[0].message, 'กรุณาระบุชื่อหมวดหมู่');
});

test('validateBodySchema middleware - validation of competencies', () => {
    const req = { body: { code: '', name: 'สมรรถนะ A', categoryId: '' } };
    const res = {
        statusCode: null,
        status: function(code) { this.statusCode = code; return this; },
        json: function(data) { this.jsonData = data; return this; }
    };
    const next = () => {};

    validateBodySchema(competencySchema)(req, res, next);
    assert.equal(res.statusCode, 400);
    const codeErr = res.jsonData.errors.find(e => e.field === 'code');
    const catErr = res.jsonData.errors.find(e => e.field === 'categoryId');
    assert.ok(codeErr);
    assert.ok(catErr);
    assert.equal(codeErr.message, 'กรุณาระบุรหัสสมรรถนะหลัก (Code)');
    assert.equal(catErr.message, 'กรุณาระบุรหัสหมวดหมู่สมรรถนะ');
});

test('getCachedData - falls back to fetchFn when Redis client is not available', async () => {
    mockRedis = null; // Disabled Redis
    
    let dbCallCount = 0;
    const fetchFn = async () => {
        dbCallCount++;
        return { source: 'database' };
    };

    const result = await cacheHelpers.getCachedData('test:fallback', fetchFn);
    
    assert.deepEqual(result, { source: 'database' });
    assert.equal(dbCallCount, 1);
});

test('getCachedData - caches and returns data from Redis when available', async () => {
    const cacheStore = {};
    mockRedis = {
        get: async (key) => cacheStore[key] || null,
        setEx: async (key, ttl, value) => {
            cacheStore[key] = value;
        }
    };

    let dbCallCount = 0;
    const fetchFn = async () => {
        dbCallCount++;
        return { data: 'some_lookup_value' };
    };

    // First call (cache miss)
    const firstResult = await cacheHelpers.getCachedData('test:key', fetchFn);
    assert.deepEqual(firstResult, { data: 'some_lookup_value' });
    assert.equal(dbCallCount, 1);
    assert.equal(JSON.parse(cacheStore['test:key']).data, 'some_lookup_value');

    // Second call (cache hit)
    const secondResult = await cacheHelpers.getCachedData('test:key', fetchFn);
    assert.deepEqual(secondResult, { data: 'some_lookup_value' });
    assert.equal(dbCallCount, 1); // Should not increment dbCallCount
});

test('evictCache - deletes keys and patterns correctly', async () => {
    const cacheStore = {
        'categories:list': '["a", "b"]',
        'categories:123': '{"id": 123}',
        'competencies:tree': '[]'
    };

    mockRedis = {
        get: async (key) => cacheStore[key] || null,
        keys: async (pattern) => {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            return Object.keys(cacheStore).filter(k => regex.test(k));
        },
        del: async (keys) => {
            const keysArr = Array.isArray(keys) ? keys : [keys];
            for (const k of keysArr) {
                delete cacheStore[k];
            }
        }
    };

    // Evict categories:* wildcard pattern
    await cacheHelpers.evictCache('categories:*');
    assert.equal(cacheStore['categories:list'], undefined);
    assert.equal(cacheStore['categories:123'], undefined);
    // competencies:tree should still be intact
    assert.equal(cacheStore['competencies:tree'], '[]');

    // Evict specific key
    await cacheHelpers.evictCache('competencies:tree');
    assert.equal(cacheStore['competencies:tree'], undefined);
});
