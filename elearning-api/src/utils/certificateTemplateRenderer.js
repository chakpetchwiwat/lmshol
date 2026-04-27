const escapeHtml = (unsafe) => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Renders certificate HTML by injecting variables into the template.
 * 
 * @param {Object} params
 * @param {Object} params.template - The CertificateTemplate model data
 * @param {Object} params.certificate - The Certificate model data
 * @param {Object} params.metadata - Snapshot metadata from the certificate
 * @param {String} params.verificationUrl - Fully qualified verification URL
 * @returns {String} Full HTML document ready for PDF generation
 */
function renderCertificateHtml({ template, certificate, metadata, verificationUrl }) {
  const { templateHtml, templateCss } = template;
  
  // Prepare variables based on metadata snapshot or live data
  const variables = {
    learner_name: escapeHtml(metadata.learner?.name || ''),
    course_name: escapeHtml(metadata.course?.title || ''),
    issued_date: metadata.issuedAt ? new Date(metadata.issuedAt).toLocaleDateString('th-TH') : '',
    completed_date: metadata.completedAt ? new Date(metadata.completedAt).toLocaleDateString('th-TH') : '',
    certificate_no: escapeHtml(certificate.certificateNo || ''),
    signer_name: escapeHtml(metadata.signer?.name || ''),
    signer_title: escapeHtml(metadata.signer?.title || ''),
    signature_image_url: metadata.signer?.signatureImageUrl || '', // URLs don't need escaping in src
    verification_url: verificationUrl || '',
    organization_name: escapeHtml(process.env.ORGANIZATION_NAME || 'สถาบันการเรียนรู้ออนไลน์')
  };

  // Replace variables in the template HTML
  let processedHtml = templateHtml;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    processedHtml = processedHtml.replace(regex, value);
  });

  // Combine into a full document
  return `
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Certificate - ${variables.certificate_no}</title>
      <style>
        body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
        ${templateCss}
      </style>
    </head>
    <body>
      ${processedHtml}
    </body>
    </html>
  `;
}

module.exports = {
  renderCertificateHtml
};
