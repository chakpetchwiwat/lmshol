const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const prismaPath = path.resolve(__dirname, '../src/utils/prisma.js');
const servicePath = path.resolve(__dirname, '../src/services/admin/certificate.service.js');

const loadCertificateService = (mockPrisma) => {
  [servicePath, prismaPath].forEach((cachePath) => {
    delete require.cache[cachePath];
  });

  require.cache[prismaPath] = {
    id: prismaPath,
    filename: prismaPath,
    loaded: true,
    exports: mockPrisma
  };

  return require(servicePath);
};

test('resolveCertificateSignatureSlots resolves organization and instructor preset slots', async () => {
  const tx = {
    instructorPreset: {
      findUnique: async ({ where }) => ({
        id: where.id,
        name: 'Alex Morgan',
        role: 'Senior Instructor',
        signatureTitle: 'Lead Facilitator',
        signatureImageUrl: 'https://example.com/instructor.png'
      })
    },
    courseStaff: {
      findFirst: async () => null
    },
    course: {
      findUnique: async () => ({ instructorName: 'Fallback Instructor', instructorRole: 'Instructor' })
    }
  };

  const service = loadCertificateService({});
  const signers = await service.resolveCertificateSignatureSlots(tx, 'course-1', {
    signatureSlots: [
      {
        label: 'Signature 1',
        type: 'ORGANIZATION',
        name: 'ScaleUp Academy',
        title: 'Organization Signature',
        signatureImageUrl: 'https://example.com/org.png'
      },
      {
        label: 'Signature 2',
        type: 'INSTRUCTOR',
        instructorPresetId: 'preset-1'
      }
    ]
  });

  assert.equal(signers.length, 2);
  assert.deepEqual(signers[0], {
    type: 'ORGANIZATION',
    label: 'Signature 1',
    name: 'ScaleUp Academy',
    title: 'Organization Signature',
    signatureImageUrl: 'https://example.com/org.png',
    stampImageUrl: null
  });
  assert.deepEqual(signers[1], {
    type: 'INSTRUCTOR',
    label: 'Signature 2',
    name: 'Alex Morgan',
    title: 'Lead Facilitator',
    signatureImageUrl: 'https://example.com/instructor.png',
    instructorPresetId: 'preset-1'
  });
});
