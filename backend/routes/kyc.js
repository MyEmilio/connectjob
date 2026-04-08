const express = require("express");
const multer = require("multer");
const path = require("path");
const rateLimit = require("express-rate-limit");
const db = require("../db/database");
const auth = require("../middleware/auth");
const logger = require("../utils/logger");
const { sendOtpValidator, verifyOtpValidator } = require("../utils/validators");
const {
  isCloudinaryConfigured,
  kycUploader,
} = require("../utils/cloudinary");

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Limita de SMS depasita. Incearca din nou dupa o ora." },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

// Fallback local storage if Cloudinary not configured
const localStorage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads"),
  filename: (req, file, cb) =>
    cb(null, `${req.user.id}_${Date.now()}${path.extname(file.originalname)}`),
});
const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const localFileFilter = (req, file, cb) => {
  ALLOWED_MIME.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Tip fisier nepermis. Acceptat: JPG, PNG, WEBP, PDF"));
};
const localUpload = multer({
  storage: localStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: localFileFilter,
});

let twilio;
try {
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    !process.env.TWILIO_ACCOUNT_SID.startsWith("ADAUGA")
  ) {
    twilio = require("twilio")(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
} catch {}

// POST /api/kyc/send-otp
router.post(
  "/send-otp",
  otpLimiter,
  auth,
  sendOtpValidator,
  async (req, res) => {
    try {
      const { phone } = req.body;

      const code = String(Math.floor(100000 + Math.random() * 900000));
      await db.saveOtp(phone, code);
      await db.updateUser(req.user.id, { phone });

      if (twilio) {
        await twilio.messages.create({
          body: `Codul tau ConnectJob: ${code} (valid 10 minute)`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone,
        });
        logger.info("OTP sent via Twilio", { userId: req.user.id, phone });
        res.json({ success: true });
      } else {
        logger.info("OTP generated (demo mode)", {
          userId: req.user.id,
          phone,
        });
        res.json({
          success: true,
          demo_code: code,
          message: "Mod demo — configureaza Twilio pentru SMS real",
        });
      }
    } catch (err) {
      logger.error("Send OTP error", {
        userId: req.user.id,
        error: err.message,
      });
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/kyc/verify-otp
router.post("/verify-otp", auth, verifyOtpValidator, async (req, res) => {
  try {
    const { phone, code } = req.body;
    const ok = await db.verifyOtp(phone, code);
    if (!ok) return res.status(400).json({ error: "Cod invalid sau expirat" });
    logger.info("OTP verified", { userId: req.user.id, phone });
    res.json({ success: true });
  } catch (err) {
    logger.error("Verify OTP error", {
      userId: req.user.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/kyc/upload-document
router.post("/upload-document", auth, (req, res) => {
  // Use Cloudinary if configured, otherwise local storage
  const uploader = isCloudinaryConfigured() ? kycUploader : localUpload;

  uploader.single("document")(req, res, (err) => {
    if (err) {
      logger.error("Document upload error", {
        userId: req.user.id,
        error: err.message,
      });
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) return res.status(400).json({ error: "Fisier lipsa" });

    // Cloudinary returns path in req.file.path, local returns filename
    const fileUrl = isCloudinaryConfigured()
      ? req.file.path
      : `/uploads/${req.file.filename}`;

    logger.info("Document uploaded", {
      userId: req.user.id,
      cloudinary: isCloudinaryConfigured(),
      file: fileUrl,
    });
    res.json({
      success: true,
      filename: req.file.filename || req.file.originalname,
      url: fileUrl,
    });
  });
});

// POST /api/kyc/complete
router.post("/complete", auth, async (req, res) => {
  try {
    await db.updateUser(req.user.id, { verified: true });
    logger.info("KYC completed", { userId: req.user.id });
    res.json({ success: true, message: "Identitate verificata!" });
  } catch (err) {
    logger.error("KYC complete error", {
      userId: req.user.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
