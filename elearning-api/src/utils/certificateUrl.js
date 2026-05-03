const PRODUCTION_FRONTEND_URL = 'https://lms-scaleup.vercel.app';
const LOCAL_FRONTEND_URL = 'http://localhost:5173';

function normalizeBaseUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim().replace(/\/+$/, '');
}

function isDeploymentEnv(env = process.env) {
  return (
    env.NODE_ENV === 'production' ||
    env.VERCEL === '1' ||
    Boolean(env.VERCEL_ENV)
  );
}

function resolveCertificateFrontendUrl(env = process.env) {
  const configuredUrl = normalizeBaseUrl(env.FRONTEND_URL);

  if (configuredUrl) return configuredUrl;

  return isDeploymentEnv(env) ? PRODUCTION_FRONTEND_URL : LOCAL_FRONTEND_URL;
}

function buildCertificateVerificationUrl(token, env = process.env) {
  const frontendUrl = resolveCertificateFrontendUrl(env);
  return `${frontendUrl}/certificates/verify/${token}`;
}

module.exports = {
  PRODUCTION_FRONTEND_URL,
  LOCAL_FRONTEND_URL,
  normalizeBaseUrl,
  isDeploymentEnv,
  resolveCertificateFrontendUrl,
  buildCertificateVerificationUrl
};
