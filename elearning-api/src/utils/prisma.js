const { PrismaClient } = require('@prisma/client');
const { getContext } = require('./context');

const prismaOptions = {
  log: process.env.NODE_ENV === 'development'
    ? ['warn', 'error']
    : ['error'],
};

// Singleton pattern — prevents connection leaks in dev (nodemon restarts)
const prismaInstance = global.prisma || new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prismaInstance;
}

// Temporarily disabled RLS extension for debugging 500 errors
/*
const prisma = prismaInstance.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        const { userId, role } = getContext();
        if (userId) {
          return prismaInstance.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET LOCAL app.current_user_id = '${userId}'`);
            await tx.$executeRawUnsafe(`SET LOCAL app.current_user_role = '${role || 'user'}'`);
            return query(args);
          });
        }
        return query(args);
      },
    },
  },
});
*/

const prisma = prismaInstance;

module.exports = prisma;
