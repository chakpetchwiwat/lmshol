const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const certCount = await prisma.userCertificate.count();
    console.log(`Total UserCertificate (External Training) count in DB: ${certCount}`);
    
    const certsWithDays = await prisma.userCertificate.count({
      where: { trainingDays: { not: null, not: "" } }
    });
    console.log(`UserCertificate with trainingDays in DB: ${certsWithDays}`);

    const certsWithIntake = await prisma.userCertificate.count({
      where: { intakeNo: { not: null, not: "" } }
    });
    console.log(`UserCertificate with intakeNo in DB: ${certsWithIntake}`);

    // Sample of 3 records
    const samples = await prisma.userCertificate.findMany({
      take: 3,
      select: {
        id: true,
        title: true,
        issuer: true,
        issueDate: true,
        trainingDays: true,
        intakeNo: true,
        user: { select: { name: true } }
      }
    });
    console.log(`Sample certificates in DB:`, JSON.stringify(samples, null, 2));

  } catch (err) {
    console.error("Error checking DB:", err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
