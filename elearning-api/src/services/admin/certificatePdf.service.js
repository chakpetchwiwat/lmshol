const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const supabase = require('../../utils/supabase');

// Singleton promise to ensure chromium.executablePath() is only called once per instance
let executablePathPromise = null;

async function getExecutablePath() {
  if (executablePathPromise) return executablePathPromise;
  
  executablePathPromise = (async () => {
    try {
      return await chromium.executablePath();
    } catch (error) {
      console.error('[CertificatePdf] Failed to resolve chromium path:', error);
      executablePathPromise = null; // Reset for retry on next call
      return null;
    }
  })();
  
  return executablePathPromise;
}

/**
 * Generates a PDF buffer from HTML content using Puppeteer.
 * 
 * @param {String} html - The full HTML document
 * @param {Object} options - PDF options (orientation, format)
 * @returns {Buffer} PDF buffer
 */
async function generatePdfBuffer(html, options = {}) {
  // 1. Resolve executable path
  const executablePath = await getExecutablePath();

  const launchOptions = {
    args: executablePath ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: chromium.defaultViewport,
    executablePath: executablePath || (process.platform === 'win32' 
      ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' 
      : '/usr/bin/google-chrome'),
    headless: executablePath ? chromium.headless : 'new',
    ignoreHTTPSErrors: true,
  };

  // 2. Launch with aggressive retry to handle ETXTBSY race conditions
  let browser;
  let lastError;
  for (let i = 0; i < 5; i++) {
    try {
      browser = await puppeteer.launch(launchOptions);
      break;
    } catch (error) {
      lastError = error;
      const isBusy = error.message.includes('ETXTBSY') || error.code === 'ETXTBSY';
      if (isBusy && i < 4) {
        const delay = 1000 + (Math.random() * 1000); // Random delay 1-2s
        console.warn(`[CertificatePdf] Browser launch busy (attempt ${i + 1}/5), retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }

  if (!browser) throw lastError;

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
