const { PrismaClient } = require('@prisma/client');

const prismaOptions = {
  log: process.env.NODE_ENV === 'development'
    ? ['warn', 'error']
    : ['error'],
};

// Singleton pattern — critical for serverless (Vercel) to reuse connections
// between warm invocations and avoid exhausting the DB connection pool.
// Always use global cache regardless of environment.
if (!global.__prisma) {
  global.__prisma = new PrismaClient(prismaOptions);
}

const prisma = global.__prisma;

module.exports = prisma;
