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

/**
 * Extended Prisma Client for Row Level Security (RLS)
 * Automatically injects the current user ID and role into the DB session.
 * Note: SET LOCAL is only effective within a transaction. 
 * For non-transactional queries, this provides a baseline but RLS is most 
 * reliable when used with prisma.$transaction().
 */
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

module.exports = prisma;
