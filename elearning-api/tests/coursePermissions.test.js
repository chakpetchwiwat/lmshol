const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const prismaPath = path.resolve(__dirname, '../src/utils/prisma.js');
const permissionsPath = path.resolve(__dirname, '../src/utils/coursePermissions.js');

const loadPermissions = (roles, options = {}) => {
  delete require.cache[permissionsPath];
  delete require.cache[prismaPath];

  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: {
      user: {
        findUnique: async () => ({
          id: 'manager-1',
          role: options.userRole || 'manager',
          departmentId: options.departmentId || 'dept-a',
          departmentRef: { id: options.departmentId || 'dept-a', name: 'Department A' },
          tier: null,
          createdAt: new Date('2026-04-01T00:00:00.000Z')
        })
      },
      course: {
        findUnique: async () => ({
          visibleToAll: options.visibleToAll ?? false,
          departmentAccess: options.departmentAccess || [{ departmentId: 'dept-a' }]
        })
      },
      courseStaff: {
        findMany: async () => roles.map((role) => ({ role }))
      }
    }
  };

  return require(permissionsPath);
};

test('canManageCourse returns FULL for owner plus instructor', async () => {
  const { COURSE_MANAGEMENT_ACCESS, canManageCourse } = loadPermissions(['instructor', 'owner']);
  const result = await canManageCourse({ userId: 'user-1', role: 'user' }, 'course-1');

  assert.equal(result.access, COURSE_MANAGEMENT_ACCESS.FULL);
  assert.equal(result.role, 'owner');
});

test('canManageCourse returns LIMITED for instructor only', async () => {
  const { COURSE_MANAGEMENT_ACCESS, canManageCourse } = loadPermissions(['instructor']);
  const result = await canManageCourse({ userId: 'user-1', role: 'user' }, 'course-1');

  assert.equal(result.access, COURSE_MANAGEMENT_ACCESS.LIMITED);
});

test('canManageCourse returns READ_ONLY for trainer only', async () => {
  const { COURSE_MANAGEMENT_ACCESS, canManageCourse } = loadPermissions(['trainer']);
  const result = await canManageCourse({ userId: 'user-1', role: 'user' }, 'course-1');

  assert.equal(result.access, COURSE_MANAGEMENT_ACCESS.READ_ONLY);
  assert.equal(result.allowed, false);
});

test('canManageCourse returns FULL for manager without staff role', async () => {
  const { COURSE_MANAGEMENT_ACCESS, canManageCourse } = loadPermissions([]);
  const result = await canManageCourse({ userId: 'manager-1', role: 'manager' }, 'course-1');

  assert.equal(result.access, COURSE_MANAGEMENT_ACCESS.FULL);
});

test('canManageCourse denies manager outside course department scope', async () => {
  const { COURSE_MANAGEMENT_ACCESS, canManageCourse } = loadPermissions([], {
    departmentId: 'dept-a',
    departmentAccess: [{ departmentId: 'dept-b' }]
  });
  const result = await canManageCourse({ userId: 'manager-1', role: 'manager' }, 'course-1');

  assert.equal(result.access, COURSE_MANAGEMENT_ACCESS.NONE);
});
