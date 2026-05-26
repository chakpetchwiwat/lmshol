const test = require('node:test');
const assert = require('node:assert/strict');

const authHelpers = require('../src/utils/auth.helpers');
const { USER_ROLES } = require('../src/utils/constants/roles');
const { ENTITY_STATUS } = require('../src/utils/constants/statuses');

const createPrisma = (userRecord) => ({
    user: {
        findUnique: async () => userRecord
    }
});

test('getActorContext resolves actor context for admin users', async () => {
    const actor = await authHelpers.getActorContext(
        createPrisma({
            id: 'admin-1',
            role: USER_ROLES.ADMIN,
            departmentId: null,
            departmentRef: null,
            tier: null,
            createdAt: new Date('2026-04-01T00:00:00.000Z')
        }),
        { userId: 'admin-1', role: USER_ROLES.ADMIN }
    );

    assert.equal(actor.role, USER_ROLES.ADMIN);
    assert.equal(actor.effectiveRole, USER_ROLES.ADMIN);
    assert.equal(actor.isAdmin, true);
    assert.equal(actor.canAccessAdminPanel, true);
});

test('getActorContext resolves manager scope with department information', async () => {
    const actor = await authHelpers.getActorContext(
        createPrisma({
            id: 'mgr-1',
            role: USER_ROLES.MANAGER,
            departmentId: 'dept-a',
            departmentRef: { id: 'dept-a', name: 'Operations' },
            tier: { id: 'tier-1', name: 'Manager', accessAdmin: false, order: 2 },
            createdAt: new Date('2026-04-01T00:00:00.000Z')
        }),
        { userId: 'mgr-1', role: USER_ROLES.MANAGER }
    );

    assert.equal(actor.departmentId, 'dept-a');
    assert.equal(actor.department, 'Operations');
    assert.equal(actor.effectiveRole, USER_ROLES.MANAGER);
    assert.equal(actor.isManager, true);
    assert.equal(actor.canAccessAdminPanel, true);
});

test('canAccessEntity allows admin access regardless of non-published status', () => {
    const actor = { isAdmin: true };
    const entity = { isTemporary: false, status: ENTITY_STATUS.DRAFT };

    assert.equal(authHelpers.canAccessEntity(actor, entity), true);
});

test('canAccessEntity denies expired temporary content for end users', () => {
    const actor = { isAdmin: false, isManager: false, departmentId: 'dept-a', tier: null };
    const entity = {
        isTemporary: true,
        expiredAt: new Date(Date.now() - 10_000),
        status: ENTITY_STATUS.PUBLISHED,
        visibleToAll: true
    };

    assert.equal(authHelpers.canAccessEntity(actor, entity), false);
});

test('canAccessEntity allows department-scoped published content for matching users', () => {
    const actor = { isAdmin: false, isManager: false, departmentId: 'dept-a', tier: null };
    const entity = {
        status: ENTITY_STATUS.PUBLISHED,
        visibleToAll: false,
        departmentAccess: [{ departmentId: 'dept-a' }]
    };

    assert.equal(authHelpers.canAccessEntity(actor, entity), true);
});

test('buildUserManagementWhere maps manager scope to departmentId OR cohort supervisorId', () => {
    const actor = {
        id: 'mgr-123',
        isAdmin: false,
        isManager: true,
        departmentId: 'dept-abc'
    };
    
    const query = authHelpers.buildUserManagementWhere(actor);
    
    assert.equal(query.permission, 'user');
    assert.deepEqual(query.OR, [
        { departmentId: 'dept-abc' },
        {
            cohortSupervised: {
                some: {
                    supervisorId: 'mgr-123'
                }
            }
        }
    ]);
});

