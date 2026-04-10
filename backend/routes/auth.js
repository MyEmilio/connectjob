const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const db = require("../db/database");
const authMiddleware = require("../middleware/auth");
const logger = require("../utils/logger");
const {
  registerValidator,
  loginValidator,
  profileValidator,
} = require("../utils/validators");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

const sign = (user) =>
  jwt.sign(
    { id: user.id || user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

// POST /api/auth/google — OAuth with Google (Emergent Auth flow)
// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
router.post("/google/session", async (req, res) => {
  try {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ error: "session_id lipsa" });

    // Verify session with Emergent Auth
    const axios = require("axios");
    const sessionRes = await axios.get(
      "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
      { headers: { "X-Session-ID": session_id }, timeout: 10000 }
    );

    const { email, name, picture, session_token } = sessionRes.data;
    if (!email) return res.status(401).json({ error: "Email lipsă din sesiunea Google" });

    // Find or create user
    let user = await db.findUserByEmail(email);
    if (!user) {
      const initials = (name || "U").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
      user = await db.createUser({
        name: name || email.split("@")[0],
        email,
        password: "",
        role: "worker",
        initials,
        google_id: email,
        avatar: picture || "",
        verified: true,
      });
      logger.info("New Google user registered via Emergent Auth", { email });
    } else if (!user.google_id) {
      await db.updateUser(user.id || user._id, {
        google_id: email,
        avatar: user.avatar || picture || "",
      });
    }

    const { password: _, ...safeUser } = user;
    logger.info("Google login via Emergent Auth successful", { email });

    // Set session_token as httpOnly cookie
    res.cookie("session_token", session_token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ token: sign(safeUser), user: safeUser });
  } catch (err) {
    logger.error("Emergent Google auth error", { error: err.response?.data || err.message });
    res.status(401).json({ error: "Autentificare Google eșuată: " + (err.response?.data?.detail || err.message) });
  }
});

// POST /api/auth/google — OAuth with Google (legacy credential flow)
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential)
      return res.status(400).json({ error: "Token Google lipsa" });
    if (!process.env.GOOGLE_CLIENT_ID)
      return res
        .status(503)
        .json({ error: "Google OAuth neconfigutat pe server" });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const {
      email,
      name,
      picture,
      sub: googleId,
      email_verified,
    } = ticket.getPayload();
    if (!email_verified)
      return res.status(401).json({ error: "Email Google neverificat" });

    let user = await db.findUserByEmail(email);
    if (!user) {
      const initials = (name || "U")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      user = await db.createUser({
        name: name || email.split("@")[0],
        email,
        password: "",
        role: "worker",
        initials,
        google_id: googleId,
        avatar: picture || "",
        verified: true,
      });
      logger.info("New Google user registered", { email });
    } else if (!user.google_id) {
      await db.updateUser(user.id || user._id, {
        google_id: googleId,
        avatar: user.avatar || picture || "",
      });
    }

    const { password: _, ...safeUser } = user;
    logger.info("Google login successful", { email });
    res.json({ token: sign(safeUser), user: safeUser });
  } catch (err) {
    logger.error("Google auth error", { error: err.message });
    res.status(401).json({ error: "Token Google invalid: " + err.message });
  }
});

// POST /api/auth/register
router.post("/register", registerValidator, async (req, res) => {
  try {
    const { name, email, password, role = "worker" } = req.body;

    if (await db.findUserByEmail(email))
      return res.status(409).json({ error: "Email deja inregistrat" });

    const hash = bcrypt.hashSync(password, 10);
    const initials = name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    const user = await db.createUser({
      name,
      email,
      password: hash,
      role,
      initials,
    });
    const { password: _, ...safeUser } = user;
    logger.info("New user registered", { email, role });
    res.json({ token: sign(safeUser), user: safeUser });
  } catch (err) {
    logger.error("Registration error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", loginValidator, async (req, res) => {
  try {
    const { email, password } = req.body;

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

// GET /api/auth/me
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: "User negasit" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    logger.error("Get user error", { userId: req.user.id, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/profile
router.put("/profile", authMiddleware, profileValidator, async (req, res) => {
  try {
    const { name, phone, bio, skills } = req.body;
    await db.updateUser(req.user.id, { name, phone, bio, skills: skills || [] });
    logger.info("Profile updated", { userId: req.user.id });
    res.json({ success: true });
  } catch (err) {
    logger.error("Profile update error", {
      userId: req.user.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
