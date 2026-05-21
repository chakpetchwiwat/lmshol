const test = require('node:test');
const assert = require('node:assert/strict');
const authHelpers = require('../src/utils/auth.helpers');

test('buildVisibilityWhere hides expired temporary content for non-admin users', () => {
    const referenceDate = new Date('2026-04-12T00:00:00.000Z');
    const where = authHelpers.buildVisibilityWhere(
        { isAdmin: false, departmentId: 'dept-a' },
        { status: 'PUBLISHED', referenceDate }
    );

    assert.deepEqual(where.AND[0], { status: 'PUBLISHED' });
    assert.deepEqual(where.AND[1], {
        OR: [
            { isTemporary: false },
            { expiredAt: null },
            { expiredAt: { gt: referenceDate } }
        ]
    });
});

test('canAccessEntity blocks expired temporary courses and categories', () => {
    const actor = { isAdmin: false, departmentId: 'dept-a', tier: null };
    const referenceDate = new Date('2026-04-12T00:00:00.000Z');
    const entity = {
        isTemporary: true,
        expiredAt: '2026-04-11T23:59:59.999Z',
        status: 'PUBLISHED',
        visibleToAll: true
    };

    assert.equal(authHelpers.canAccessEntity(actor, entity, referenceDate), false);
});

test('buildGoalVisibilityWhere hides expired goals for end users', () => {
    const actor = { isAdmin: false, departmentId: 'dept-a' };
    const referenceDate = new Date('2026-04-12T00:00:00.000Z');
    const where = authHelpers.buildGoalVisibilityWhere(actor, { referenceDate });

    assert.deepEqual(where, {
        AND: [
            { status: 'ACTIVE' },
            {
                OR: [
                    { expiryDate: null },
                    { expiryDate: { gt: referenceDate } }
                ]
            },
            {
                OR: [
                    { scope: 'GLOBAL' },
                    { scope: 'DEPARTMENT', departmentId: 'dept-a' },
                    {
                        targetDepartments: {
                            some: { departmentId: 'dept-a' }
                        }
                    }
                ]
            }
        ]
    });
});

test('canAccessGoal allows expired goals only for admin panel style lookups', () => {
    const referenceDate = new Date('2026-04-12T00:00:00.000Z');
    const goal = {
        status: 'ACTIVE',
        scope: 'DEPARTMENT',
        departmentId: 'dept-a',
        expiryDate: '2026-04-11T23:59:59.999Z'
    };

    assert.equal(
        authHelpers.canAccessGoal(
            { isAdmin: false, departmentId: 'dept-a' },
            goal,
            { referenceDate }
        ),
        false
    );

    assert.equal(
        authHelpers.canAccessGoal(
            { isAdmin: true, departmentId: null },
            goal,
            { referenceDate, includeExpired: true, includeAllScopes: true }
        ),
        true
    );
});
