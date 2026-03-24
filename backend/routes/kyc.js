const express = require("express");
const multer  = require("multer");
const path    = require("path");
const db      = require("../db/database");
const auth    = require("../middleware/auth");

const router  = express.Router();
const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads"),
  filename: (req, file, cb) => cb(null, `${req.user.id}_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

let twilio;
try {
  if (process.env.TWILIO_ACCOUNT_SID && !process.env.TWILIO_ACCOUNT_SID.startsWith("ADAUGA")) {
    twilio = require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
} catch {}

router.post("/send-otp", auth, async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Telefon lipsa" });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  db.saveOtp(phone, code);
  db.updateUser(req.user.id, { phone });

  if (twilio) {
    try {
      await twilio.messages.create({ body: `Codul tau JoobConnect: ${code} (valid 10 minute)`, from: process.env.TWILIO_PHONE_NUMBER, to: phone });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Eroare Twilio: " + err.message });
    }
  } else {
    res.json({ success: true, demo_code: code, message: "Mod demo — configureaza Twilio pentru SMS real" });
  }
});

router.post("/verify-otp", auth, (req, res) => {
  const { phone, code } = req.body;
  if (!db.verifyOtp(phone, code)) return res.status(400).json({ error: "Cod invalid sau expirat" });
  res.json({ success: true });
});

router.post("/upload-document", auth, upload.single("document"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Fisier lipsa" });
  res.json({ success: true, filename: req.file.filename });
});

router.post("/complete", auth, (req, res) => {
  db.updateUser(req.user.id, { verified: 1 });
  res.json({ success: true, message: "Identitate verificata!" });
});

module.exports = router;
