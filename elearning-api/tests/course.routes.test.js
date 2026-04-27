const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const routesPath = path.resolve(__dirname, '../src/routes/course.routes.js');
const controllerPath = path.resolve(__dirname, '../src/controllers/course.controller.js');
const authPath = path.resolve(__dirname, '../src/middleware/auth.js');
const permissionsPath = path.resolve(__dirname, '../src/utils/coursePermissions.js');

const loadRoutes = () => {
  [routesPath, controllerPath, authPath, permissionsPath].forEach((cachePath) => {
    delete require.cache[cachePath];
  });

  const noop = (req, res, next) => next();

  require.cache[controllerPath] = {
    id: controllerPath,
    filename: controllerPath,
    loaded: true,
    exports: {
      getCourseDetails: noop,
      getCourseStaff: noop,
      assignCourseStaff: noop,
      updateCourseStaff: noop,
      deleteCourseStaff: noop
    }
  };

  require.cache[authPath] = {
    id: authPath,
    filename: authPath,
    loaded: true,
    exports: {
      verifyToken: noop
    }
  };

  require.cache[permissionsPath] = {
    id: permissionsPath,
    filename: permissionsPath,
    loaded: true,
    exports: {
      COURSE_MANAGEMENT_ACCESS: { FULL: 'full' },
      canManageCourse: async () => ({ access: 'full' })
    }
  };

  return require(routesPath);
};

const findRoute = (router, pathPattern, method) => router.stack.find((layer) => (
  layer.route?.path === pathPattern && layer.route?.methods?.[method]
));

test('CourseStaff mutation routes include authorization middleware', () => {
  const router = loadRoutes();

  assert.equal(findRoute(router, '/:courseId/staff', 'post').route.stack.length, 2);
  assert.equal(findRoute(router, '/:courseId/staff/:staffId', 'patch').route.stack.length, 2);
  assert.equal(findRoute(router, '/:courseId/staff/:staffId', 'delete').route.stack.length, 2);
});

test('CourseStaff GET route does not use staff mutation authorization middleware', () => {
  const router = loadRoutes();

  assert.equal(findRoute(router, '/:courseId/staff', 'get').route.stack.length, 1);
});
