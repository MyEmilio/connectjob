const express = require("express");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const db      = require("../db/database");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

const sign = (user) =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

// POST /api/auth/register
router.post("/register", (req, res) => {
  const { name, email, password, role = "worker" } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Campuri obligatorii lipsa" });
  if (db.findUserByEmail(email)) return res.status(409).json({ error: "Email deja inregistrat" });

  const hash     = bcrypt.hashSync(password, 10);
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const user     = db.createUser({ name, email, password: hash, role, initials });
  const { password: _, ...safeUser } = user;
  res.json({ token: sign(safeUser), user: safeUser });
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email si parola sunt obligatorii" });

  const user = db.findUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: "Email sau parola incorecta" });

  const { password: _, ...safeUser } = user;
  res.json({ token: sign(safeUser), user: safeUser });
});

// GET /api/auth/me
router.get("/me", authMiddleware, (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: "User negasit" });
  const { password: _, ...safeUser } = user;
  safeUser.skills = JSON.parse(safeUser.skills || "[]");
  res.json(safeUser);
});

// PUT /api/auth/profile
router.put("/profile", authMiddleware, (req, res) => {
  const { name, phone, bio, skills } = req.body;
  db.updateUser(req.user.id, { name, phone, bio, skills: JSON.stringify(skills || []) });
  res.json({ success: true });
});

module.exports = router;
