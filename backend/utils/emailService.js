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
  newApplication: ({ employerName, workerName, jobTitle, applicationMessage, workerEmail, workerSkills, appUrl }) => ({
    subject: `[ConnectJob] Aplicare nouă pentru "${jobTitle}"`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fafaf9;padding:0;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#059669,#047857);padding:28px 24px;border-radius:12px 12px 0 0;text-align:center;">
          <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:10px;">⚡</div>
          <h1 style="color:#fff;font-size:20px;margin:0;">Aplicare Nouă!</h1>
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:6px 0 0;">Cineva vrea să lucreze pentru tine</p>
        </div>
        <!-- Body -->
        <div style="background:#fff;padding:24px;border:1px solid #e7e5e4;">
          <p style="color:#1c1917;font-size:15px;margin:0 0 16px;">Bună <strong>${employerName}</strong>,</p>
          
          <!-- Applicant Card -->
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;margin-bottom:10px;">
              <div style="width:40px;height:40px;border-radius:50%;background:#059669;color:#fff;font-size:16px;font-weight:700;text-align:center;line-height:40px;margin-right:12px;">${workerName.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2)}</div>
              <div>
                <div style="font-weight:700;color:#1c1917;font-size:15px;">${workerName}</div>
                ${workerEmail ? `<div style="font-size:12px;color:#57534e;">${workerEmail}</div>` : ""}
              </div>
            </div>
            <div style="font-size:13px;color:#1c1917;margin-bottom:6px;">A aplicat pentru: <strong style="color:#059669;">${jobTitle}</strong></div>
            ${workerSkills?.length ? `<div style="margin-top:8px;">${workerSkills.map(s=>`<span style="display:inline-block;background:#059669;color:#fff;border-radius:99px;padding:2px 10px;font-size:11px;font-weight:600;margin:2px 3px 2px 0;">${s}</span>`).join("")}</div>` : ""}
          </div>
          
          ${applicationMessage ? `
          <div style="background:#f5f5f4;border-radius:8px;padding:12px 16px;margin-bottom:16px;border-left:3px solid #059669;">
            <div style="font-size:11px;color:#a8a29e;font-weight:700;text-transform:uppercase;margin-bottom:4px;">Mesaj de la aplicant</div>
            <p style="color:#1c1917;font-size:14px;margin:0;line-height:1.6;font-style:italic;">"${applicationMessage}"</p>
          </div>
          ` : ""}
          
          <!-- Action Buttons -->
          <div style="text-align:center;margin:24px 0 16px;">
            <a href="${appUrl || '#'}" style="display:inline-block;padding:14px 36px;background:#059669;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;margin:0 6px 8px;">✅ Vezi și Acceptă</a>
            <a href="${appUrl || '#'}" style="display:inline-block;padding:14px 24px;background:#f5f5f4;color:#57534e;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;border:1px solid #e7e5e4;margin:0 6px 8px;">💬 Trimite Mesaj</a>
          </div>
          
          <p style="font-size:12px;color:#a8a29e;text-align:center;margin:0;">Răspunde rapid pentru a nu pierde candidatul!</p>
        </div>
        <!-- Footer -->
        <div style="padding:16px 24px;text-align:center;border-radius:0 0 12px 12px;">
          <p style="font-size:11px;color:#a8a29e;margin:0;">ConnectJob — Platformă de joburi România | <a href="${appUrl || '#'}" style="color:#059669;text-decoration:none;">Deschide aplicația</a></p>
        </div>
      </div>
    `,
    text: `Bună ${employerName},\n\n${workerName} a aplicat pentru jobul tău: ${jobTitle}.\n${applicationMessage ? `Mesaj: "${applicationMessage}"\n` : ""}\nIntră în aplicație pentru a accepta sau trimite un mesaj.\n\nEchipa ConnectJob`,
  }),

  // Application accepted (notify worker)
  applicationAccepted: ({ workerName, employerName, jobTitle, appUrl }) => ({
    subject: `[ConnectJob] Felicitări! Ai fost acceptat pentru "${jobTitle}"`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#059669,#047857);padding:28px 24px;border-radius:12px 12px 0 0;text-align:center;">
          <div style="font-size:48px;margin-bottom:8px;">🎉</div>
          <h1 style="color:#fff;font-size:20px;margin:0;">Ai Fost Acceptat!</h1>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e7e5e4;">
          <p style="color:#1c1917;font-size:15px;">Bună <strong>${workerName}</strong>,</p>
          <p style="color:#1c1917;font-size:14px;line-height:1.6;"><strong>${employerName}</strong> ți-a acceptat aplicarea pentru jobul: <strong style="color:#059669;">${jobTitle}</strong></p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${appUrl || '#'}" style="display:inline-block;padding:14px 36px;background:#059669;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">💬 Contactează Angajatorul</a>
          </div>
          <p style="font-size:12px;color:#a8a29e;text-align:center;">Contactează angajatorul cât mai curând pentru detalii!</p>
        </div>
        <div style="padding:12px;text-align:center;"><p style="font-size:11px;color:#a8a29e;margin:0;">ConnectJob — Platformă de joburi România</p></div>
      </div>
    `,
    text: `Bună ${workerName},\n\nFelicitări! ${employerName} ți-a acceptat aplicarea pentru jobul: ${jobTitle}.\nContactează angajatorul pentru detalii.\n\nEchipa ConnectJob`,
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
    subject: `[ConnectJob] Ai primit ${amount} RON!`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
        <div style="background:linear-gradient(135deg,#059669,#047857);padding:28px 24px;border-radius:12px 12px 0 0;text-align:center;">
          <div style="font-size:48px;margin-bottom:8px;">💰</div>
          <h1 style="color:#fff;font-size:20px;margin:0;">${amount} RON Primiți!</h1>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e7e5e4;">
          <p style="color:#1c1917;font-size:15px;">Bună <strong>${workerName}</strong>,</p>
          <p style="color:#1c1917;font-size:14px;line-height:1.6;">Plata de <strong style="color:#059669;font-size:18px;">${amount} RON</strong> pentru jobul <strong>${jobTitle}</strong> a fost eliberată din escrow.</p>
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px;margin:16px 0;text-align:center;">
            <div style="font-size:12px;color:#57534e;margin-bottom:4px;">Sumă transferată</div>
            <div style="font-size:24px;font-weight:800;color:#059669;">${amount} RON</div>
          </div>
          <p style="font-size:12px;color:#a8a29e;text-align:center;">Fondurile vor fi transferate în contul tău bancar în 2-3 zile lucrătoare.</p>
        </div>
        <div style="padding:12px;text-align:center;"><p style="font-size:11px;color:#a8a29e;margin:0;">ConnectJob — Platformă de joburi România</p></div>
      </div>
    `,
    text: `Bună ${workerName},\n\nAi primit plata de ${amount} RON pentru jobul ${jobTitle}.\nFondurile vor fi transferate în curând.\n\nEchipa ConnectJob`,
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

// ── Verification Email ──────────────────────────────────────
const sendVerificationEmail = async (email, name, verifyUrl) => {
  return sendEmail({
    to: email,
    subject: "ConnectJob — Verifică-ți email-ul",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="width:48px;height:48px;border-radius:12px;background:#059669;display:inline-flex;align-items:center;justify-content:center;font-size:24px;">⚡</div>
          <h2 style="margin:12px 0 0;color:#1c1917;">ConnectJob</h2>
        </div>
        <p>Salut <strong>${name}</strong>,</p>
        <p>Mulțumim că te-ai înregistrat pe ConnectJob! Click pe butonul de mai jos pentru a-ți verifica email-ul:</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;background:#059669;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">✅ Verifică Email-ul</a>
        </div>
        <p style="font-size:13px;color:#78716c;">Sau copiază acest link: <a href="${verifyUrl}">${verifyUrl}</a></p>
        <p style="font-size:12px;color:#a8a29e;margin-top:24px;">Link-ul expiră în 24 de ore.</p>
      </div>
    `,
    text: `Salut ${name}, verifică email-ul la: ${verifyUrl}`,
  });
};

// ── Password Reset Email ────────────────────────────────────
const sendPasswordResetEmail = async (email, name, resetUrl) => {
  return sendEmail({
    to: email,
    subject: "ConnectJob — Resetare parolă",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="width:48px;height:48px;border-radius:12px;background:#059669;display:inline-flex;align-items:center;justify-content:center;font-size:24px;">⚡</div>
          <h2 style="margin:12px 0 0;color:#1c1917;">ConnectJob</h2>
        </div>
        <p>Salut <strong>${name}</strong>,</p>
        <p>Am primit o cerere de resetare a parolei pentru contul tău. Click pe butonul de mai jos:</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:#dc2626;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">🔑 Resetează Parola</a>
        </div>
        <p style="font-size:13px;color:#78716c;">Sau copiază acest link: <a href="${resetUrl}">${resetUrl}</a></p>
        <p style="font-size:12px;color:#a8a29e;margin-top:24px;">Link-ul expiră în 1 oră. Dacă nu ai solicitat resetarea, ignoră acest email.</p>
      </div>
    `,
    text: `Salut ${name}, resetează parola la: ${resetUrl}`,
  });
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
  sendVerificationEmail,
  sendPasswordResetEmail,
};
