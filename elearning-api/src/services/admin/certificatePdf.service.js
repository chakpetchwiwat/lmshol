const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const supabase = require('../../utils/supabase');

/**
 * Generates a PDF buffer from HTML content using Puppeteer.
 * 
 * @param {String} html - The full HTML document
 * @param {Object} options - PDF options (orientation, format)
 * @returns {Buffer} PDF buffer
 */
async function generatePdfBuffer(html, options = {}) {
  // 1. Resolve executable path and browser options
  const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL;
  
  const launchOptions = {
    args: isLocal ? ['--no-sandbox', '--disable-setuid-sandbox'] : chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: isLocal 
      ? (process.platform === 'win32' 
          ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' 
          : '/usr/bin/google-chrome')
      : await chromium.executablePath(),
    headless: isLocal ? 'new' : chromium.headless,
    ignoreHTTPSErrors: true,
  };

  const browser = await puppeteer.launch(launchOptions);

  try {
    const page = await browser.newPage();
    
    // Set viewport size if needed, but A4 format usually takes care of it
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: options.orientation === 'LANDSCAPE',
      printBackground: true,
      margin: {
        top: options.marginTop || '0px',
        right: options.marginRight || '0px',
        bottom: options.marginBottom || '0px',
        left: options.marginLeft || '0px'
      }
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

/**
 * Uploads the certificate PDF buffer to Supabase Storage.
 * 
 * @param {Object} params
 * @param {Buffer} params.buffer - The PDF buffer
 * @param {String} params.userId - User ID for the folder path
 * @param {String} params.certificateId - Certificate ID for the filename
 * @returns {String} Public URL or storage path
 */
async function uploadCertificatePdf({ buffer, userId, certificateId }) {
  const bucketName = 'secure-documents';
  const filePath = `certificates/${userId}/${certificateId}.pdf`;

  const { error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, buffer, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (error) {
    throw new Error(`Failed to upload to Supabase Storage: ${error.message}`);
  }

  // NOTE: We return only the file path for security. 
  // Access will be granted via temporary signed URLs.
  return filePath;
}

module.exports = {
  generatePdfBuffer,
  uploadCertificatePdf
};
