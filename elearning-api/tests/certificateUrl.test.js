const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildCertificateVerificationUrl,
  normalizeBaseUrl,
  resolveCertificateFrontendUrl
} = require('../src/utils/certificateUrl');

test('normalizeBaseUrl trims trailing slashes', () => {
  assert.equal(normalizeBaseUrl('https://lms-scaleup.vercel.app///'), 'https://lms-scaleup.vercel.app');
});

test('resolveCertificateFrontendUrl uses configured frontend URL when present', () => {
  assert.equal(
    resolveCertificateFrontendUrl({ FRONTEND_URL: 'https://training.example.com/' }),
    'https://training.example.com'
  );
});

test('resolveCertificateFrontendUrl uses production LMS URL on Vercel without FRONTEND_URL', () => {
  assert.equal(
    resolveCertificateFrontendUrl({ VERCEL: '1', VERCEL_ENV: 'production' }),
    'https://lms-scaleup.vercel.app'
  );
});

test('resolveCertificateFrontendUrl uses production LMS URL when NODE_ENV is production', () => {
  assert.equal(
    resolveCertificateFrontendUrl({ NODE_ENV: 'production' }),
    'https://lms-scaleup.vercel.app'
  );
});

test('buildCertificateVerificationUrl uses one slash before the verify route', () => {
  assert.equal(
    buildCertificateVerificationUrl('daa8d196-d146-4e9c-8e76-835996f5463e', {
      FRONTEND_URL: 'https://lms-scaleup.vercel.app/'
    }),
    'https://lms-scaleup.vercel.app/certificates/verify/daa8d196-d146-4e9c-8e76-835996f5463e'
  );
});
