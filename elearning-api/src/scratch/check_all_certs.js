const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const certs = await prisma.certificate.findMany({
    orderBy: { issuedAt: 'desc' },
    take: 20,
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { title: true } }
    }
  });
  
  console.log(`Checking last 20 certificates in the system:`);
  certs.forEach((c, i) => {
    console.log(`${i+1}. ID: ${c.id} | Status: ${c.status} | User: ${c.user.name} (${c.user.email}) | Course: ${c.course.title}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
