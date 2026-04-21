const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const db = require("../db/database");
const Token = require("../models/Token");
const authMiddleware = require("../middleware/auth");
const logger = require("../utils/logger");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../utils/emailService");
const { validate, loginSchema, registerSchema, resetRequestSchema, resetPasswordSchema } = require("../utils/validation");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const router = express.Router();

const sign = (user) =>
  jwt.sign(
    { id: user.id || user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

const generateToken = () => crypto.randomBytes(32).toString("hex");

// ══════════════════════════════════════════════════════════════
//  GOOGLE OAUTH — Emergent Auth flow
// ══════════════════════════════════════════════════════════════
// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
router.post("/google/session", async (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ error: "session_id lipsa" });

    const axios = require("axios");
    const sessionRes = await axios.get(
      "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
      { headers: { "X-Session-ID": session_id }, timeout: 10000 }
    );

    const { email, name, picture, session_token } = sessionRes.data;
    if (!email) return res.status(401).json({ error: "Email lipsă din sesiunea Google" });

    let user = await db.findUserByEmail(email);
    if (!user) {
      const initials = (name || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      user = await db.createUser({
        name: name || email.split("@")[0], email, password: "", role: "worker",
        initials, google_id: email, avatar: picture || "",
        verified: true, email_verified: true,
        subscription_plan: "pro", trial_used: true, trial_expires_at: trialEnd,
      });
      // Create trial subscription
      const Subscription = require("../models/Subscription");
      await Subscription.create({
        user_id: user.id, plan: "pro", status: "active",
        checkout_session_id: `trial_${user.id}`,
        current_period_start: new Date(),
        current_period_end: trialEnd,
      });
      logger.info("New Google user via Emergent Auth (with Pro trial)", { email });
    } else if (!user.google_id) {
      await db.updateUser(user.id || user._id, { google_id: email, avatar: user.avatar || picture || "", email_verified: true });
    }

    const { password: _, ...safeUser } = user;
    res.cookie("session_token", session_token, { httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ token: sign(safeUser), user: safeUser });
  } catch (err) {
    logger.error("Emergent Google auth error", { error: err.response?.data || err.message });
    res.status(401).json({ error: "Autentificare Google eșuată: " + (err.response?.data?.detail || err.response?.data?.message || err.message) });
  }
});

// Legacy Google credential flow
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Token Google lipsa" });
    if (!process.env.GOOGLE_CLIENT_ID) return res.status(503).json({ error: "Google OAuth neconfigurat" });

    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, name, picture, sub: googleId, email_verified } = ticket.getPayload();
    if (!email_verified) return res.status(401).json({ error: "Email Google neverificat" });

    let user = await db.findUserByEmail(email);
    if (!user) {
      const initials = (name || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      user = await db.createUser({ name: name || email.split("@")[0], email, password: "", role: "worker", initials, google_id: googleId, avatar: picture || "", verified: true, email_verified: true });
    } else if (!user.google_id) {
      await db.updateUser(user.id || user._id, { google_id: googleId, avatar: user.avatar || picture || "", email_verified: true });
    }

    const { password: _, ...safeUser } = user;
    res.json({ token: sign(safeUser), user: safeUser });
  } catch (err) {
    logger.error("Google auth error", { error: err.message });
    res.status(401).json({ error: "Token Google invalid: " + err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  REGISTER — cu email verification
// ══════════════════════════════════════════════════════════════
router.post("/register", validate(registerSchema), async (req, res) => {
  try {
    const { name, email, password, role } = req.validated;

    if (await db.findUserByEmail(email))
      return res.status(409).json({ error: "Email deja inregistrat" });

    const hash = bcrypt.hashSync(password, 10);
    const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const user = await db.createUser({
      name, email, password: hash, role, initials, email_verified: false,
      subscription_plan: "pro", trial_used: true, trial_expires_at: trialEnd,
    });

    // Create trial subscription record
    const Subscription = require("../models/Subscription");
    await Subscription.create({
      user_id: user.id,
      plan: "pro",
      status: "active",
      checkout_session_id: `trial_${user.id}`,
      current_period_start: new Date(),
      current_period_end: trialEnd,
    });

    // Generate verification token
    const verifyToken = generateToken();
    await Token.create({
      user_id: user.id, token: verifyToken, type: "email_verify",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Send verification email
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const verifyUrl = `${clientUrl}/verify-email?token=${verifyToken}`;
    try {
      await sendVerificationEmail(email, name, verifyUrl);
      logger.info("Verification email sent", { email });
    } catch (emailErr) {
      logger.warn("Could not send verification email", { email, error: emailErr.message });
    }

    const { password: _, ...safeUser } = user;
    logger.info("New user registered", { email, role });
    res.json({ token: sign(safeUser), user: safeUser, verify_url: verifyUrl, message: "Cont creat! Verifică email-ul pentru activare." });
  } catch (err) {
    logger.error("Registration error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  VERIFY EMAIL
// ══════════════════════════════════════════════════════════════
router.get("/verify-email/:token", async (req, res) => {
  try {
    const record = await Token.findOne({
      token: req.params.token, type: "email_verify", used: false, expires_at: { $gt: new Date() },
    });
    if (!record) return res.status(400).json({ error: "Token invalid sau expirat" });

    await db.updateUser(record.user_id, { email_verified: true });
    record.used = true;
    await record.save();

    logger.info("Email verified", { userId: record.user_id });
    res.json({ success: true, message: "Email verificat cu succes!" });
  } catch (err) {
    logger.error("Email verify error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Resend verification email
router.post("/resend-verification", authMiddleware, async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    if (user.email_verified) return res.json({ message: "Email deja verificat" });

    await Token.deleteMany({ user_id: user.id || user._id, type: "email_verify" });
    const verifyToken = generateToken();
    await Token.create({
      user_id: user.id || user._id, token: verifyToken, type: "email_verify",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const verifyUrl = `${clientUrl}/verify-email?token=${verifyToken}`;
    try {
      await sendVerificationEmail(user.email, user.name, verifyUrl);
    } catch (emailErr) {
      logger.warn("Could not resend verification email", { error: emailErr.message });
    }

    res.json({ success: true, verify_url: verifyUrl, message: "Email de verificare retrimis!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  PASSWORD RESET
// ══════════════════════════════════════════════════════════════
router.post("/forgot-password", validate(resetRequestSchema), async (req, res) => {
  try {
    const { email } = req.validated;
    const user = await db.findUserByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) return res.json({ success: true, message: "Dacă email-ul există, vei primi un link de resetare." });

    // Delete old reset tokens
    await Token.deleteMany({ user_id: user.id || user._id, type: "password_reset" });

    const resetToken = generateToken();
    await Token.create({
      user_id: user.id || user._id, token: resetToken, type: "password_reset",
      expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;
    try {
      await sendPasswordResetEmail(email, user.name, resetUrl);
      logger.info("Password reset email sent", { email });
    } catch (emailErr) {
      logger.warn("Could not send reset email", { email, error: emailErr.message });
    }

    res.json({ success: true, reset_url: resetUrl, message: "Dacă email-ul există, vei primi un link de resetare." });
  } catch (err) {
    logger.error("Forgot password error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

router.post("/reset-password", validate(resetPasswordSchema), async (req, res) => {
  try {
    const { token, password } = req.validated;

    const record = await Token.findOne({
      token, type: "password_reset", used: false, expires_at: { $gt: new Date() },
    });
    if (!record) return res.status(400).json({ error: "Token invalid sau expirat" });

    const hash = bcrypt.hashSync(password, 10);
    await db.updateUser(record.user_id, { password: hash });
    record.used = true;
    await record.save();

    logger.info("Password reset successful", { userId: record.user_id });
    res.json({ success: true, message: "Parola a fost resetată cu succes!" });
  } catch (err) {
    logger.error("Reset password error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Verify reset token validity
router.get("/verify-reset-token/:token", async (req, res) => {
  const record = await Token.findOne({
    token: req.params.token, type: "password_reset", used: false, expires_at: { $gt: new Date() },
  });
  res.json({ valid: !!record });
});

// ══════════════════════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════════════════════
router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.validated;
    const user = await db.findUserByEmail(email);
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: "Email sau parola incorecta" });

    const { password: _, ...safeUser } = user;
    logger.info("User logged in", { email });
    res.json({ token: sign(safeUser), user: safeUser });
  } catch (err) {
    logger.error("Login error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  ME + PROFILE
// ══════════════════════════════════════════════════════════════
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { name, phone, bio, skills } = req.body;
    await db.updateUser(req.user.id, { name, phone, bio, skills: skills || [] });
    logger.info("Profile updated", { userId: req.user.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  DUAL MODE — switch active role / add role
// ══════════════════════════════════════════════════════════════
const User = require("../models/User");

// POST /api/auth/switch-role  { role: "worker" | "employer" }
router.post("/switch-role", authMiddleware, async (req, res) => {
  try {
    const { role } = req.body || {};
    if (!["worker", "employer"].includes(role)) {
      return res.status(400).json({ error: "Rol inválido" });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User no encontrado" });

    // Ensure roles array includes the target role; auto-add if first switch
    if (!user.roles || user.roles.length === 0) user.roles = [user.role || "worker"];
    if (!user.roles.includes(role)) {
      // Auto-enroll user into new role (frictionless switching)
      user.roles.push(role);
    }
    user.active_role = role;
    // Legacy `role` keeps the most recently active non-admin role for older flows
    if (role !== "admin") user.role = role;
    await user.save();

    res.json({
      success: true,
      active_role: user.active_role,
      roles: user.roles,
    });
  } catch (err) {
    console.error("switch-role error:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

module.exports = router;
