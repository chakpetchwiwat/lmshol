const PDFDocument = require('pdfkit');
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
 * Generates a PDF buffer using pdfkit (Better Thai Support)
 */
async function generatePdfBuffer(_html, options = {}) {
  const data = options.fallbackData || {};
  const fontBuffer = await loadThaiFont();

  return new Promise((resolve, reject) => {
    try {
      // 1. Create a new PDF document (A4 Landscape)
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 0
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // 2. Set Font
      if (fontBuffer) {
        doc.font(fontBuffer);
      } else {
        doc.font('Helvetica');
      }

      const width = 841.89; // A4 Landscape width
      const height = 595.28; // A4 Landscape height

      // 3. Draw Background/Border
      // Outer border
      doc.rect(20, 20, width - 40, height - 40)
         .lineWidth(2)
         .stroke('#1a1a1a');
      
      // Inner background
      doc.rect(30, 30, width - 60, height - 60)
         .fill('#f5faff');

      // 4. Draw Content
      // Header
      doc.fillColor('#1a3a5a')
         .fontSize(32)
         .text('CERTIFICATE OF COMPLETION', 0, 100, { align: 'center', width });

      doc.fillColor('#333333')
         .fontSize(16)
         .text('หนังสือรับรองฉบับนี้ ให้ไว้เพื่อแสดงว่า', 0, 160, { align: 'center', width });

      // Learner Name
      doc.fillColor('#000000')
         .fontSize(40)
         .text(data.learnerName || 'Learner Name', 0, 220, { align: 'center', width });

      // Course Info
      doc.fillColor('#333333')
         .fontSize(18)
         .text('ได้ผ่านการเรียนหลักสูตรออนไลน์', 0, 300, { align: 'center', width });

      doc.fillColor('#2a4a7a')
         .fontSize(26)
         .text(data.courseTitle || 'Course Title', 0, 340, { align: 'center', width });

      // Details Footer
      const footerY = 450;
      const leftMargin = 80;
      
      doc.fillColor('#333333').fontSize(12);
      doc.text(`เลขที่เกียรติบัตร: ${data.certificateNo || '-'}`, leftMargin, footerY);
      doc.text(`วันที่ออก: ${data.issuedAt || '-'}`, leftMargin, footerY + 20);
      
      doc.fontSize(10);
      doc.text('ตรวจสอบความถูกต้องได้ที่:', leftMargin, footerY + 50);
      doc.fillColor('#666666')
         .text(data.verificationUrl || '-', leftMargin, footerY + 65);

      // Branding
      doc.fillColor('#999999')
         .fontSize(10)
         .text('ScaleUp Learning Management System', width - 300, height - 60, { width: 250, align: 'right' });

      // 5. Finalize PDF
      doc.end();
    } catch (error) {
      console.error('[CertificatePdf] pdfkit generation failed:', error);
      reject(error);
    }
  });
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
