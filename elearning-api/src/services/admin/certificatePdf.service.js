const path = require('path');
const fs = require('fs');
const axios = require('axios');
const sharp = require('sharp');
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

/**
 * Standardizes relative storage paths into absolute URLs
 */
const getFullUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) return url;
  
  // Case 1: Already has storage prefix
  if (url.startsWith('/storage/v1/object/public/')) {
    return `${supabaseUrl}${url}`;
  }

  // Case 2: Starts with /uploads (common in our DB)
  if (url.startsWith('/uploads/')) {
    return `${supabaseUrl}/storage/v1/object/public${url}`;
  }

  // Case 3: Starts with uploads/ (no leading slash)
  if (url.startsWith('uploads/')) {
    return `${supabaseUrl}/storage/v1/object/public/${url}`;
  }
  
  // Case 4: Just a relative path or filename
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  return `${supabaseUrl}/storage/v1/object/public/uploads/${cleanPath}`;
};

async function loadImageBuffer(imageUrl) {
  const absoluteUrl = getFullUrl(imageUrl);
  if (!absoluteUrl) return null;

  try {
    const response = await axios.get(absoluteUrl, { 
      responseType: 'arraybuffer', 
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    const imageBuffer = Buffer.from(response.data);
    const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
    const isPdfKitNativeImage = contentType.includes('image/png')
      || contentType.includes('image/jpeg')
      || contentType.includes('image/jpg')
      || /\.(png|jpe?g)(\?|$)/i.test(absoluteUrl);

    if (isPdfKitNativeImage) {
      return imageBuffer;
    }

    return await sharp(imageBuffer).png().toBuffer();
  } catch (error) {
    console.warn(`[CertificatePdf] Failed to load image: ${absoluteUrl} | Error: ${error.message}`);
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
  const stampBuffer = data.stampImageBuffer;
  const signatureHeight = 58;

  // Draw signature image first
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

  // Draw stamp overlapping the signature area
  if (stampBuffer) {
    try {
      // Position stamp to the right of the signature center
      const stampX = align === 'center' ? x + (width / 2) + 10 : x + width - 55;
      doc.image(stampBuffer, stampX, y + 5, {
        fit: [55, 55],
        align: 'center',
        valign: 'center'
      });
    } catch (error) {
      console.warn('[CertificatePdf] Failed to draw stamp image:', error.message);
    }
  }

  doc.fillColor('#111827')
     .fontSize(12)
     .text(signerName || 'LMS Administrator', x, y + signatureHeight + 8, { width, align });

  doc.fillColor('#6b7280')
     .fontSize(9)
     .text(signerTitle || 'Authorized Signer', x, y + signatureHeight + 24, { width, align });
};

const drawSignatureGroup = (doc, data, y, width, height, mode = 'right') => {
  const signers = Array.isArray(data.signers) && data.signers.length > 0
    ? data.signers.slice(0, 2)
    : [{
        name: data.signerName,
        title: data.signerTitle,
        signatureImageBuffer: data.signatureImageBuffer,
        stampImageBuffer: data.stampImageBuffer
      }];

  if (signers.length === 1) {
    const x = mode === 'center' ? (width - 240) / 2 : width - 300;
    drawSignature(doc, { ...data, ...signers[0] }, x, y, mode === 'center' ? 240 : 200, 'center');
    return;
  }

  const signatureWidth = mode === 'center' ? 220 : 180;
  const gap = mode === 'center' ? 40 : 35;
  const groupWidth = (signatureWidth * 2) + gap;
  const startX = mode === 'center'
    ? (width - groupWidth) / 2
    : Math.max(width - groupWidth - 40, width * 0.55);

  drawSignature(doc, { ...data, ...signers[0] }, startX, y, signatureWidth, 'center');
  drawSignature(doc, { ...data, ...signers[1] }, startX + signatureWidth + gap, y, signatureWidth, 'center');
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

  drawSignatureGroup(doc, data, height - 165, width, height);
};

/**
 * Template: MODERN (Template 2)
 */
const drawModern = (doc, data, width, height) => {
  // 1. Background
  doc.rect(0, 0, width, height).fill('#ffffff');
  
  // 2. Top-left accent line
  doc.rect(80, 80, 120, 5).fill('#3b82f6');
  
  const contentX = 80;
  const contentWidth = width - 160;

  // 3. Title Section
  doc.fillColor('#3b82f6')
     .fontSize(42)
     .text('CERTIFICATE', contentX, 140, { characterSpacing: 1 });
  
  doc.fillColor('#3b82f6')
     .fontSize(18)
     .text('OF COMPLETION', contentX, 185, { characterSpacing: 2 });

  // 4. Body Section
  doc.fillColor('#6b7280')
     .fontSize(14)
     .text('This is to certify that', contentX, 260);

  doc.fillColor('#111827')
     .fontSize(52)
     .text(data.learnerName || 'Learner Name', contentX, 290);
  
  // Underline for name
  doc.moveTo(contentX, 350).lineTo(contentX + 300, 350).lineWidth(0.5).stroke('#e5e7eb');

  doc.fillColor('#6b7280')
     .fontSize(14)
     .text('has successfully completed the course', contentX, 400);

  doc.fillColor('#111827')
     .fontSize(28)
     .text(data.courseTitle || 'Course Title', contentX, 430, { width: contentWidth * 0.6 });

  // 5. Metadata Box (Bottom Left)
  const boxWidth = 380;
  const boxHeight = 110;
  const boxY = height - 160;
  
  // Box background
  doc.rect(80, boxY, boxWidth, boxHeight).fill('#f8fafc');
  // Left accent border
  doc.rect(80, boxY, 4, boxHeight).fill('#3b82f6');
  
  doc.fillColor('#94a3b8').fontSize(8);
  doc.text('Certificate No', 100, boxY + 15);
  doc.text('Issue Date', 100, boxY + 45);
  doc.text('Verify', 100, boxY + 75);

  doc.fillColor('#1e293b').fontSize(11);
  doc.text(data.certificateNo || '-', 200, boxY + 15);
  doc.text(data.issuedAt || '-', 200, boxY + 45);
  doc.fontSize(8).text(data.verificationUrl || '-', 200, boxY + 75);

  // 6. Signatures (Bottom Right)
  drawSignatureGroup(doc, data, height - 200, width, height, 'right');
};

/**
 * Template: MINIMAL
 */
const drawMinimal = (doc, data, width, height) => {
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
  
  doc.moveTo(width / 4, 380).lineTo(width * 3 / 4, 380).lineWidth(0.5).stroke('#e5e7eb');

  drawSignatureGroup(doc, data, height - 165, width, height, 'center');
};

/**
 * Generates a PDF buffer using pdfkit (Multi-Template Support)
 */
async function generatePdfBuffer(_html, options = {}) {
  const data = options.fallbackData || {};
  const fontBuffer = await loadThaiFont();
  const template = getTemplateById(data.templateId);
  const signatureImageBuffer = await loadImageBuffer(data.signatureImageUrl);
  const signers = Array.isArray(data.signers)
    ? await Promise.all(data.signers.slice(0, 2).map(async (signer) => ({
        ...signer,
        signerName: signer.name,
        signerTitle: signer.title,
        signatureImageBuffer: await loadImageBuffer(signer.signatureImageUrl),
        stampImageBuffer: await loadImageBuffer(signer.stampImageUrl)
      })))
    : [];
  const renderData = {
    ...data,
    signatureImageBuffer,
    signers
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

      if (template.layout !== 'modern') {
        const footerY = height - 120;
        const leftMargin = 80;

        doc.fillColor('#333333').fontSize(11);
        doc.text(`เลขที่เกียรติบัตร: ${data.certificateNo || '-'}`, leftMargin, footerY);
        doc.text(`วันที่ออก: ${data.issuedAt || '-'}`, leftMargin, footerY + 18);

        doc.fontSize(9);
        doc.text('ตรวจสอบความถูกต้องได้ที่:', leftMargin, footerY + 45);
        doc.fillColor('#666666').text(data.verificationUrl || '-', leftMargin, footerY + 58);
      }

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
