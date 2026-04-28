const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const axios = require('axios');
const supabase = require('../../utils/supabase');

// Font caching to avoid re-downloading within the same instance
let sarabunFontBuffer = null;

/**
 * Downloads the Sarabun font from Google Fonts (or similar CDN)
 */
async function loadThaiFont() {
  if (sarabunFontBuffer) return sarabunFontBuffer;
  
  try {
    // We use a direct TTF link for Sarabun
    const fontUrl = 'https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Regular.ttf';
    const response = await axios.get(fontUrl, { responseType: 'arraybuffer' });
    sarabunFontBuffer = response.data;
    return sarabunFontBuffer;
  } catch (error) {
    console.error('[CertificatePdf] Failed to download Thai font:', error.message);
    return null;
  }
}

/**
 * Generates a PDF buffer using pdf-lib (Native, No Browser)
 * 
 * @param {String} _html - Ignored in native mode, but kept for signature compatibility
 * @param {Object} options - PDF data and options
 * @returns {Buffer} PDF buffer
 */
async function generatePdfBuffer(_html, options = {}) {
  const data = options.fallbackData || {};
  
  try {
    // 1. Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // 2. Load and embed font
    const fontBytes = await loadThaiFont();
    let font;
    if (fontBytes) {
      font = await pdfDoc.embedFont(fontBytes);
    } else {
      // Fallback to standard font if Thai font fails (will mojibake, but won't crash)
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    // 3. Add a page (A4 Landscape)
    // A4 is 595.28 x 841.89 points. Landscape is 841.89 x 595.28
    const page = pdfDoc.addPage([841.89, 595.28]);
    const { width, height } = page.getSize();

    // 4. Draw Background/Border
    // Outer border
    page.drawRectangle({
      x: 20,
      y: 20,
      width: width - 40,
      height: height - 40,
      borderColor: rgb(0.1, 0.1, 0.1),
      borderWidth: 2,
    });
    
    // Inner light blue background
    page.drawRectangle({
      x: 30,
      y: 30,
      width: width - 60,
      height: height - 60,
      color: rgb(0.96, 0.98, 1.0), // Light bluish
    });

    // 5. Draw Content
    const drawText = (text, size, x, y, color = rgb(0, 0, 0)) => {
      if (!text) return;
      page.drawText(String(text), {
        x,
        y,
        size,
        font,
        color,
      });
    };

    // Helper to center text
    const drawCenteredText = (text, size, y, color = rgb(0, 0, 0)) => {
      if (!text) return;
      const textWidth = font.widthOfTextAtSize(String(text), size);
      drawText(text, size, (width - textWidth) / 2, y, color);
    };

    // Header
    drawCenteredText('CERTIFICATE OF COMPLETION', 32, height - 120, rgb(0.1, 0.2, 0.4));
    drawCenteredText('หนังสือรับรองฉบับนี้ให้ไว้เพื่อแสดงว่า', 16, height - 170);

    // Learner Name
    drawCenteredText(data.learnerName || 'Learner Name', 36, height - 240, rgb(0.1, 0.1, 0.1));

    // Course Info
    drawCenteredText(`ได้ผ่านการเรียนหลักสูตรออนไลน์`, 18, height - 300);
    drawCenteredText(data.courseTitle || 'Course Title', 24, height - 350, rgb(0.2, 0.3, 0.5));

    // Details Footer
    const footerY = 150;
    drawText(`เลขที่เกียรติบัตร: ${data.certificateNo || '-'}`, 12, 80, footerY);
    drawText(`วันที่ออก: ${data.issuedAt || '-'}`, 12, 80, footerY - 25);
    
    // Verification
    drawText('ตรวจสอบความถูกต้องได้ที่:', 10, 80, footerY - 60);
    drawText(data.verificationUrl || '-', 9, 80, footerY - 75, rgb(0.3, 0.3, 0.3));

    // Branding
    drawText('ScaleUp Learning Management System', 10, width - 280, 60, rgb(0.5, 0.5, 0.5));

    // 6. Serialize the PDF document to bytes (Uint8Array)
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('[CertificatePdf] Native generation failed:', error);
    throw error;
  }
}

/**
 * Uploads the certificate PDF buffer to Supabase Storage.
 */
async function uploadCertificatePdf({ buffer, userId, certificateId }) {
  const bucketName = 'uploads';
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

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return publicUrl;
}

module.exports = {
  generatePdfBuffer,
  uploadCertificatePdf
};
