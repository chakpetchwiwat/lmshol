require('dotenv').config();

const { PRODUCTION_FRONTEND_URL, resolveCertificateFrontendUrl } = require('../src/utils/certificateUrl');

if (!process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL = PRODUCTION_FRONTEND_URL;
}

const prisma = require('../src/utils/prisma');
const certificateService = require('../src/services/admin/certificate.service');

async function main() {
  const certificateNos = process.argv.slice(2).map((value) => value.trim()).filter(Boolean);

  if (certificateNos.length === 0) {
    console.error('Usage: node scripts/regenerate_certificates_by_no.js CERT-2026-CERT-000016 CERT-2026-CERT-000017');
    process.exitCode = 1;
    return;
  }

  console.log(`[Certificate] regenerate.frontend_url | url=${resolveCertificateFrontendUrl()}`);

  for (const certificateNo of certificateNos) {
    const certificate = await prisma.certificate.findUnique({
      where: { certificateNo }
    });

    if (!certificate) {
      console.warn(`[Certificate] regenerate.skipped | no=${certificateNo} | reason=not_found`);
      continue;
    }

    const regenerated = await certificateService.generateCertificatePdfAsync(certificate.id);
    console.log(`[Certificate] regenerate.done | no=${certificateNo} | status=${regenerated?.status || 'unknown'}`);
  }
}

main()
  .catch((error) => {
    console.error('[Certificate] regenerate.failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
