const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function exportCerts() {
  try {
    const certs = await prisma.userCertificate.findMany({
      select: {
        id: true,
        title: true,
        issuer: true,
        issueDate: true,
        trainingType: true,
        trainingItem: true,
        trainingDetails: true,
        trainingVenue: true,
        trainingDays: true,
        intakeNo: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    fs.writeFileSync('scratch/db_certs.json', JSON.stringify(certs, null, 2), 'utf-8');
    console.log(`Successfully exported ${certs.length} certificates to scratch/db_certs.json`);
  } catch (err) {
    console.error("Error exporting certs:", err);
  } finally {
    await prisma.$disconnect();
  }
}

exportCerts();
