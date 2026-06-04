const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'kae.np2463@gmail.com' }
  });
  console.log("USER FROM DB:", JSON.stringify(user, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
