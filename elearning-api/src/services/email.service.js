const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

let transporter = null;

// Initialize Transporter
const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  
  if (!host || !user || !pass) {
    console.warn('[EmailService] SMTP credentials missing in env. Emails will be logged to console.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465 || process.env.SMTP_SECURE === 'true',
    auth: {
      user,
      pass
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100
  });

  return transporter;
};

// Load template and compile with handlebars
const compileTemplate = (templateName, data) => {
  try {
    const templatePath = path.join(__dirname, '../templates/email', `${templateName}.html`);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }
    const htmlContent = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(htmlContent);
    return template(data);
  } catch (error) {
    console.error(`[EmailService] Failed to compile template ${templateName}:`, error);
    throw error;
  }
};

/**
 * Send an email asynchronously.
 * Doesn't block execution; logs errors.
 */
const sendEmail = async ({ to, subject, templateName, data }) => {
  try {
    const clientTransporter = getTransporter();
    
    // Construct default template data (e.g. loginUrl)
    const baseDomain = process.env.FRONTEND_URL || 'http://localhost:3000';
    const mergedData = {
      loginUrl: `${baseDomain}/login`,
      actionUrl: baseDomain,
      goalUrl: `${baseDomain}/user/goals`,
      ...data
    };

    const html = compileTemplate(templateName, mergedData);
    const fromEmail = process.env.SMTP_FROM || 'drug-noreply-thairims@fda.moph.go.th';
    const fromName = process.env.SMTP_FROM_NAME || 'ThaiFDA Sikkha';

    // Path to the FDA logo inside the API assets folder
    const logoPath = path.join(__dirname, '../assets/fda-logo.webp');
    const attachments = [];
    
    if (fs.existsSync(logoPath)) {
      attachments.push({
        filename: 'fda-logo.webp',
        path: logoPath,
        cid: 'fdalogo' // Referenced as src="cid:fdalogo" in the html
      });
    }

    const prefixedSubject = subject ? `[ระบบ LMS] ${subject}` : '[ระบบ LMS]';

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: prefixedSubject,
      html,
      attachments
    };

    if (!clientTransporter) {
      console.info(`[EmailService] [Mock Send] To: ${to} | Subject: ${prefixedSubject}`);
      console.info(`[EmailService] [Mock Content Preview]:\n`, html.slice(0, 500) + '...');
      return { mock: true };
    }

    const info = await clientTransporter.sendMail(mailOptions);
    console.info(`[EmailService] Email sent successfully: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('[EmailService] Failed to send email:', error);
    // Suppress error so it doesn't crash business operations (e.g., grading or user imports)
    return null;
  }
};

module.exports = {
  sendEmail
};
