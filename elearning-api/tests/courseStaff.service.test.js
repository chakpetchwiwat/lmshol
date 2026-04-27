const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const prismaPath = path.resolve(__dirname, '../src/utils/prisma.js');
const servicePath = path.resolve(__dirname, '../src/services/courseStaff.service.js');
const permissionsPath = path.resolve(__dirname, '../src/utils/coursePermissions.js');
const visibilityPath = path.resolve(__dirname, '../src/services/user/user.visibility.js');

const loadCourseStaffService = (mockPrisma) => {
  [servicePath, permissionsPath, visibilityPath, prismaPath].forEach((cachePath) => {
    delete require.cache[cachePath];
  });

  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: mockPrisma
  };

  return require(servicePath);
};

const createTx = (overrides = {}) => ({
  course: {
    findUnique: async () => ({ id: 'course-1' })
  },
  user: {
    findUnique: async () => ({ id: 'user-1' })
  },
  courseStaff: {
    findFirst: async () => null,
    updateMany: async () => ({ count: 0 }),
    create: async (input) => ({
      id: 'staff-1',
      ...input.data,
      user: { name: 'User One' }
    }),
    update: async (input) => ({
      id: input.where.id,
      userId: 'user-1',
      courseId: 'course-1',
      role: input.data.role || 'instructor',
      isPrimary: input.data.isPrimary,
      user: { name: 'User One' }
    }),
    count: async () => 1,
    delete: async () => ({ id: 'staff-1' })
  },
  ...overrides
});

test('assignCourseStaff assigns first owner successfully', async () => {
  const tx = createTx();
  const service = loadCourseStaffService({
    $transaction: async (callback) => callback(tx)
  });

  const result = await service.assignCourseStaff('course-1', {
    userId: 'owner-1',
    role: 'owner',
    isPrimary: true
  });

  assert.equal(result.role, 'owner');
  assert.equal(result.isPrimary, false);
});

test('assignCourseStaff prevents a second owner', async () => {
  const tx = createTx({
    courseStaff: {
      ...createTx().courseStaff,
      findFirst: async () => ({ id: 'existing-owner' })
    }
  });
  const service = loadCourseStaffService({
    $transaction: async (callback) => callback(tx)
  });

  await assert.rejects(
    () => service.assignCourseStaff('course-1', { userId: 'owner-2', role: 'owner' }),
    /Course already has an owner/
  );
});

test('assignCourseStaff assigns instructor successfully', async () => {
  const tx = createTx();
  const service = loadCourseStaffService({
    $transaction: async (callback) => callback(tx)
  });

  const result = await service.assignCourseStaff('course-1', {
    userId: 'instructor-1',
    role: 'instructor',
    isPrimary: true
  });

  assert.equal(result.role, 'instructor');
  assert.equal(result.isPrimary, true);
});

test('assignCourseStaff switches primary instructor and unsets previous primary', async () => {
  const calls = [];
  const tx = createTx({
    courseStaff: {
      ...createTx().courseStaff,
      updateMany: async (input) => {
        calls.push(input);
        return { count: 1 };
      }
    }
  });
  const service = loadCourseStaffService({
    $transaction: async (callback) => callback(tx)
  });

  await service.assignCourseStaff('course-1', {
    userId: 'instructor-2',
    role: 'instructor',
    isPrimary: true
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].where, {
    courseId: 'course-1',
    role: 'instructor',
    isPrimary: true
  });
  assert.deepEqual(calls[0].data, { isPrimary: false });
});

test('updateCourseStaff prevents trainer from keeping isPrimary true', async () => {
  const tx = createTx({
    courseStaff: {
      ...createTx().courseStaff,
      findFirst: async () => ({
        id: 'staff-1',
        role: 'instructor',
        isPrimary: true
      })
    }
  });
  const service = loadCourseStaffService({
    $transaction: async (callback) => callback(tx)
  });

  const result = await service.updateCourseStaff('course-1', 'staff-1', {
    role: 'trainer'
  });

  assert.equal(result.role, 'trainer');
  assert.equal(result.isPrimary, false);
});

test('deleteCourseStaff prevents deleting the last owner', async () => {
  const tx = createTx({
    courseStaff: {
      ...createTx().courseStaff,
      findFirst: async () => ({ id: 'owner-staff', role: 'owner' }),
      count: async () => 1
    }
  });
  const service = loadCourseStaffService({
    $transaction: async (callback) => callback(tx)
  });

  await assert.rejects(
    () => service.deleteCourseStaff('course-1', 'owner-staff'),
    /Cannot delete last owner/
  );
});

test('assignCourseStaff returns clear duplicate assignment error', async () => {
  const service = loadCourseStaffService({
    $transaction: async () => {
      const error = new Error('Unique constraint failed');
      error.code = 'P2002';
      error.meta = { target: ['courseId', 'userId', 'role'] };
      throw error;
    }
  });

  await assert.rejects(
    () => service.assignCourseStaff('course-1', { userId: 'user-1', role: 'trainer' }),
    /User is already assigned to this course with this role/
  );
});
