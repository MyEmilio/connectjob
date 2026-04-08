const nodemailer = require("nodemailer");
const logger = require("./logger");

// Create transporter (Gmail SMTP)
let transporter = null;

const initTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.warn("Email service not configured: EMAIL_USER or EMAIL_PASS missing");
    return null;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Use App Password for Gmail
    },
  });

  return transporter;
};

// Check if email is configured
const isEmailConfigured = () => {
  return !!(
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS &&
    !process.env.EMAIL_USER.includes("ADAUGA")
  );
};

// Send email helper
const sendEmail = async ({ to, subject, html, text }) => {
  const transport = initTransporter();
  
  if (!transport) {
    logger.info("Email not sent (not configured)", { to, subject });
    return { simulated: true, message: "Email service not configured" };
  }

  try {
    const result = await transport.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
      text,
    });
    logger.info("Email sent successfully", { to, subject, messageId: result.messageId });
    return { success: true, messageId: result.messageId };
  } catch (error) {
    logger.error("Email send error", { to, subject, error: error.message });
    throw error;
  }
};

// Email templates
const templates = {
  // New application received (notify employer)
  newApplication: ({ employerName, workerName, jobTitle, applicationMessage }) => ({
    subject: `[ConnectJob] Aplicare noua pentru "${jobTitle}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Aplicare noua primita!</h2>
        <p>Buna ${employerName},</p>
        <p><strong>${workerName}</strong> a aplicat pentru jobul tau: <strong>${jobTitle}</strong></p>
        ${applicationMessage ? `<p><em>Mesaj: "${applicationMessage}"</em></p>` : ""}
        <p>Intra in aplicatie pentru a vedea detalii si a raspunde aplicantului.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Echipa ConnectJob</p>
      </div>
    `,
    text: `Buna ${employerName},\n\n${workerName} a aplicat pentru jobul tau: ${jobTitle}.\n${applicationMessage ? `Mesaj: "${applicationMessage}"\n` : ""}\nIntra in aplicatie pentru a vedea detalii.\n\nEchipa ConnectJob`,
  }),

  // Application accepted (notify worker)
  applicationAccepted: ({ workerName, employerName, jobTitle }) => ({
    subject: `[ConnectJob] Aplicarea ta a fost acceptata!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Felicitari! Ai fost acceptat!</h2>
        <p>Buna ${workerName},</p>
        <p><strong>${employerName}</strong> ti-a acceptat aplicarea pentru jobul: <strong>${jobTitle}</strong></p>
        <p>Contacteaza angajatorul pentru detalii despre urmatoarele etape.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Echipa ConnectJob</p>
      </div>
    `,
    text: `Buna ${workerName},\n\nFelicitari! ${employerName} ti-a acceptat aplicarea pentru jobul: ${jobTitle}.\n\nContacteaza angajatorul pentru detalii.\n\nEchipa ConnectJob`,
  }),

  // Application rejected (notify worker)
  applicationRejected: ({ workerName, employerName, jobTitle }) => ({
    subject: `[ConnectJob] Actualizare aplicare`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Actualizare aplicare</h2>
        <p>Buna ${workerName},</p>
        <p>Din pacate, aplicarea ta pentru jobul <strong>${jobTitle}</strong> de la <strong>${employerName}</strong> nu a fost acceptata.</p>
        <p>Nu te descuraja! Continua sa aplici la alte joburi potrivite pentru tine.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Echipa ConnectJob</p>
      </div>
    `,
    text: `Buna ${workerName},\n\nDin pacate, aplicarea ta pentru jobul ${jobTitle} de la ${employerName} nu a fost acceptata.\n\nContinua sa aplici la alte joburi!\n\nEchipa ConnectJob`,
  }),

  // Contract signed by both parties
  contractSigned: ({ userName, otherPartyName, jobTitle }) => ({
    subject: `[ConnectJob] Contract semnat pentru "${jobTitle}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Contract finalizat!</h2>
        <p>Buna ${userName},</p>
        <p>Contractul pentru jobul <strong>${jobTitle}</strong> a fost semnat de ambele parti.</p>
        <p>Colaborarea cu <strong>${otherPartyName}</strong> poate incepe!</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Echipa ConnectJob</p>
      </div>
    `,
    text: `Buna ${userName},\n\nContractul pentru jobul ${jobTitle} a fost semnat de ambele parti.\nColaborarea cu ${otherPartyName} poate incepe!\n\nEchipa ConnectJob`,
  }),

  // Payment released (notify worker)
  paymentReleased: ({ workerName, amount, jobTitle }) => ({
    subject: `[ConnectJob] Plata primita: ${amount} RON`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Ai primit plata!</h2>
        <p>Buna ${workerName},</p>
        <p>Plata de <strong>${amount} RON</strong> pentru jobul <strong>${jobTitle}</strong> a fost eliberata.</p>
        <p>Fondurile vor fi transferate in contul tau in curand.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Echipa ConnectJob</p>
      </div>
    `,
    text: `Buna ${workerName},\n\nAi primit plata de ${amount} RON pentru jobul ${jobTitle}.\nFondurile vor fi transferate in curand.\n\nEchipa ConnectJob`,
  }),

  // Payment disputed (notify both parties)
  paymentDisputed: ({ userName, amount, jobTitle }) => ({
    subject: `[ConnectJob] Disputa deschisa pentru plata`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Disputa deschisa</h2>
        <p>Buna ${userName},</p>
        <p>A fost deschisa o disputa pentru plata de <strong>${amount} RON</strong> asociata jobului <strong>${jobTitle}</strong>.</p>
        <p>Echipa noastra va analiza situatia si va reveni cu o decizie in maxim 24 ore.</p>
        <hr style="border: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Echipa ConnectJob</p>
      </div>
    `,
    text: `Buna ${userName},\n\nA fost deschisa o disputa pentru plata de ${amount} RON asociata jobului ${jobTitle}.\n\nEchipa va analiza situatia in maxim 24 ore.\n\nEchipa ConnectJob`,
  }),
};

// Send templated emails
const sendNewApplicationEmail = async (employerEmail, data) => {
  const { subject, html, text } = templates.newApplication(data);
  return sendEmail({ to: employerEmail, subject, html, text });
};

const sendApplicationAcceptedEmail = async (workerEmail, data) => {
  const { subject, html, text } = templates.applicationAccepted(data);
  return sendEmail({ to: workerEmail, subject, html, text });
};

const sendApplicationRejectedEmail = async (workerEmail, data) => {
  const { subject, html, text } = templates.applicationRejected(data);
  return sendEmail({ to: workerEmail, subject, html, text });
};

const sendContractSignedEmail = async (email, data) => {
  const { subject, html, text } = templates.contractSigned(data);
  return sendEmail({ to: email, subject, html, text });
};

const sendPaymentReleasedEmail = async (workerEmail, data) => {
  const { subject, html, text } = templates.paymentReleased(data);
  return sendEmail({ to: workerEmail, subject, html, text });
};

const sendPaymentDisputedEmail = async (email, data) => {
  const { subject, html, text } = templates.paymentDisputed(data);
  return sendEmail({ to: email, subject, html, text });
};

module.exports = {
  sendEmail,
  isEmailConfigured,
  sendNewApplicationEmail,
  sendApplicationAcceptedEmail,
  sendApplicationRejectedEmail,
  sendContractSignedEmail,
  sendPaymentReleasedEmail,
  sendPaymentDisputedEmail,
};
