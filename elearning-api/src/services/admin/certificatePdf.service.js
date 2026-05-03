const path = require('path');
const fs = require('fs');
const axios = require('axios');
const supabase = require('../../utils/supabase');
const { getTemplateById } = require('../../config/certificateTemplates');

const PDFDocument = require('pdfkit');

/**
 * Loads the Sarabun font from local assets
 */
async function loadThaiFont() {
  try {
    const fontPath = path.join(__dirname, '../../assets/fonts/Sarabun-Regular.ttf');
    if (fs.existsSync(fontPath)) {
      return fontPath; // pdfkit can take a file path directly
    }
    
    // Fallback if local file is missing (unlikely after download)
    console.warn('[CertificatePdf] Local font not found, falling back to network...');
    const fontUrl = 'https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Regular.ttf';
    const response = await axios.get(fontUrl, { responseType: 'arraybuffer' });
    return response.data;
  } catch (error) {
    console.error('[CertificatePdf] Failed to load Thai font:', error.message);
    return null;
  }
}

async function loadImageBuffer(imageUrl) {
  if (!imageUrl) return null;

  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 10000 });
    return Buffer.from(response.data);
  } catch (error) {
    console.warn('[CertificatePdf] Failed to load signature image:', error.message);
    return null;
  }
}

/**
 * Helper to draw a border with optional accent color
 */
const drawBorder = (doc, width, height, color, thickness = 2, padding = 20) => {
  doc.rect(padding, padding, width - (padding * 2), height - (padding * 2))
     .lineWidth(thickness)
     .stroke(color);
};

const drawSignature = (doc, data, x, y, width, align = 'center') => {
  const signerName = data.signerName || '';
  const signerTitle = data.signerTitle || '';
  const signatureBuffer = data.signatureImageBuffer;
  const signatureHeight = 58;

  if (signatureBuffer) {
    try {
      doc.image(signatureBuffer, x, y, {
        fit: [width, signatureHeight],
        align,
        valign: 'center'
      });
    } catch (error) {
      console.warn('[CertificatePdf] Failed to draw signature image:', error.message);
      doc.moveTo(x + width * 0.18, y + signatureHeight).lineTo(x + width * 0.82, y + signatureHeight).lineWidth(0.7).stroke('#9ca3af');
    }
  } else {
    doc.moveTo(x + width * 0.18, y + signatureHeight).lineTo(x + width * 0.82, y + signatureHeight).lineWidth(0.7).stroke('#9ca3af');
  }

  doc.fillColor('#111827')
     .fontSize(12)
     .text(signerName || 'LMS Administrator', x, y + signatureHeight + 8, { width, align });

  doc.fillColor('#6b7280')
     .fontSize(9)
     .text(signerTitle || 'Authorized Signer', x, y + signatureHeight + 24, { width, align });
};

/**
 * Template: CLASSIC
 */
const drawClassic = (doc, data, width, height) => {
  // Background
  doc.rect(30, 30, width - 60, height - 60).fill('#fdfdfd');
  
  // Elegant border
  drawBorder(doc, width, height, '#1a3a5a', 3, 20); // Outer
  drawBorder(doc, width, height, '#d4af37', 1, 30); // Inner (Gold)

  doc.fillColor('#1a3a5a')
     .fontSize(32)
     .text('CERTIFICATE OF COMPLETION', 0, 100, { align: 'center', width });

  doc.fillColor('#333333')
     .fontSize(16)
     .text('หนังสือรับรองฉบับนี้ ให้ไว้เพื่อแสดงว่า', 0, 160, { align: 'center', width });

  doc.fillColor('#000000')
     .fontSize(44)
     .text(data.learnerName || 'Learner Name', 0, 220, { align: 'center', width });

  doc.fillColor('#333333')
     .fontSize(18)
     .text('ได้ผ่านการเรียนหลักสูตรออนไลน์', 0, 300, { align: 'center', width });

  doc.fillColor('#1a3a5a')
     .fontSize(28)
     .text(data.courseTitle || 'Course Title', 0, 340, { align: 'center', width });

  drawSignature(doc, data, width - 280, height - 165, 180, 'center');
};

/**
 * Template: MODERN
 */
const drawModern = (doc, data, width, height) => {
  // Side bar
  doc.rect(0, 0, 150, height).fill('#1f2937');
  doc.rect(150, 0, 10, height).fill('#3b82f6');
  
  const contentX = 200;
  const contentWidth = width - contentX - 50;

  doc.fillColor('#3b82f6')
     .fontSize(38)
     .text('CERTIFICATE', contentX, 100);
  
  doc.fillColor('#1f2937')
     .fontSize(18)
     .text('OF COMPLETION', contentX, 140);

  doc.fillColor('#666666')
     .fontSize(14)
     .text('This is to certify that', contentX, 200);

  doc.fillColor('#000000')
     .fontSize(48)
     .text(data.learnerName || 'Learner Name', contentX, 230);

  doc.fillColor('#666666')
     .fontSize(14)
     .text('has successfully completed the course', contentX, 310);

  doc.fillColor('#1f2937')
     .fontSize(24)
     .text(data.courseTitle || 'Course Title', contentX, 340, { width: contentWidth });

  drawSignature(doc, data, width - 280, height - 165, 190, 'center');
};

/**
 * Template: MINIMAL
 */
const drawMinimal = (doc, data, width, height) => {
  // Soft background
  doc.rect(0, 0, width, height).fill('#ffffff');

  doc.fillColor('#4b5563')
     .fontSize(24)
     .text('CERTIFICATE OF ACHIEVEMENT', 0, 120, { align: 'center', width, characterSpacing: 2 });

  doc.fillColor('#999999')
     .fontSize(14)
     .text('PRESENTED TO', 0, 180, { align: 'center', width, characterSpacing: 1 });

  doc.fillColor('#111827')
     .fontSize(52)
     .text(data.learnerName || 'Learner Name', 0, 220, { align: 'center', width });

  doc.fillColor('#999999')
     .fontSize(14)
     .text('FOR COMPLETING', 0, 300, { align: 'center', width, characterSpacing: 1 });

  doc.fillColor('#374151')
     .fontSize(22)
     .text(data.courseTitle || 'Course Title', 0, 330, { align: 'center', width });
  
  // Thin decorative line
  doc.moveTo(width / 4, 380).lineTo(width * 3 / 4, 380).lineWidth(0.5).stroke('#e5e7eb');

  drawSignature(doc, data, (width - 220) / 2, height - 165, 220, 'center');
};

/**
 * Generates a PDF buffer using pdfkit (Multi-Template Support)
 */
async function generatePdfBuffer(_html, options = {}) {
  const data = options.fallbackData || {};
  const fontBuffer = await loadThaiFont();
  const template = getTemplateById(data.templateId);
  const signatureImageBuffer = await loadImageBuffer(data.signatureImageUrl);
  const renderData = {
    ...data,
    signatureImageBuffer
  };

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: template.orientation?.toLowerCase() || 'landscape',
        margin: 0
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      if (fontBuffer) doc.font(fontBuffer);
      else doc.font('Helvetica');

      const { width, height } = doc.page;

      // Draw Template Layout
      switch (template.layout) {
        case 'modern': drawModern(doc, renderData, width, height); break;
        case 'minimal': drawMinimal(doc, renderData, width, height); break;
        default: drawClassic(doc, renderData, width, height); break;
      }

      // Shared Footer Details
      const footerY = height - 120;
      const leftMargin = 80;
      
      doc.fillColor('#333333').fontSize(11);
      doc.text(`เลขที่เกียรติบัตร: ${data.certificateNo || '-'}`, leftMargin, footerY);
      doc.text(`วันที่ออก: ${data.issuedAt || '-'}`, leftMargin, footerY + 18);
      
      doc.fontSize(9);
      doc.text('ตรวจสอบความถูกต้องได้ที่:', leftMargin, footerY + 45);
      doc.fillColor('#666666').text(data.verificationUrl || '-', leftMargin, footerY + 58);

      // Branding
      doc.fillColor('#999999')
         .fontSize(9)
         .text('ScaleUp Learning Management System', width - 300, height - 50, { width: 250, align: 'right' });

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
  const filePath = `certificates/${userId}/${certificateId}/${Date.now()}.pdf`;

  const { error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, buffer, {
      contentType: 'application/pdf',
      cacheControl: '60',
      upsert: false
    });

  if (error) throw new Error(`Failed to upload to Supabase Storage: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  return publicUrl;
}

module.exports = {
  generatePdfBuffer,
  uploadCertificatePdf
};
