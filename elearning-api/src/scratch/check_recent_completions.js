const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const recentCompletions = await prisma.userCourse.findMany({
    where: {
      status: 'COMPLETED',
      updatedAt: {
        gte: new Date('2026-04-30T08:00:00Z'), // 15:00 ICT
        lte: new Date('2026-04-30T08:40:00Z')  // 15:40 ICT
      }
    },
    include: {
      user: { select: { name: true } },
      course: { select: { title: true } }
    },
    orderBy: { updatedAt: 'asc' }
  });
  
  console.log(`Found ${recentCompletions.length} completions between 15:00 and 15:40:`);
  recentCompletions.forEach(c => {
    console.log(`User: ${c.user.name} | Course: ${c.course.title} | FinishedAt: ${c.updatedAt}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
