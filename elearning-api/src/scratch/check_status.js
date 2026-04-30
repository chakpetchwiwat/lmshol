const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'test@scaleup.co.th' } });
  if (!user) {
    console.log('User not found');
    return;
  }
  
  const certs = await prisma.certificate.findMany({
    where: { userId: user.id },
    orderBy: { issuedAt: 'asc' },
    include: { course: { select: { title: true } } }
  });
  
  console.log(`Found ${certs.length} certificates for ${user.name}`);
  certs.forEach((c, i) => {
    console.log(`${i+1}. ID: ${c.id} | Status: ${c.status} | Course: ${c.course.title} | PDF: ${c.pdfUrl}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
