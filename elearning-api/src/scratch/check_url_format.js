const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cert = await prisma.certificate.findFirst({
    where: { status: 'VALID' },
    orderBy: { issuedAt: 'desc' }
  });
  console.log('PDF URL in DB:', cert?.pdfUrl);
}

main().catch(console.error).finally(() => prisma.$disconnect());
