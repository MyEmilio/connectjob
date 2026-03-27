const express = require("express");
const mongoose = require("mongoose");
const auth     = require("../middleware/auth");
const Report   = require("../models/Report");
const User     = require("../models/User");

const router = express.Router();

// ── Middleware admin ────────────────────────────────────────
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Acces rezervat administratorilor" });
  next();
}

// POST /api/reports — Raporteaza un utilizator
router.post("/", auth, async (req, res) => {
  try {
    const { reported_user_id, message_id, reason, details } = req.body;
    if (!reported_user_id || !reason) return res.status(400).json({ error: "Date incomplete" });
    if (String(reported_user_id) === String(req.user.id)) return res.status(400).json({ error: "Nu te poti raporta pe tine" });

    // Previne raportari duplicate in aceeasi zi
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const existing = await Report.findOne({
      reporter_id: req.user.id,
      reported_user_id,
      created_at: { $gte: today },
    });
    if (existing) return res.status(400).json({ error: "Ai raportat deja acest utilizator astazi" });

    const report = await Report.create({
      reporter_id: req.user.id,
      reported_user_id,
      message_id: message_id || null,
      reason,
      details: details || "",
    });
    res.json({ success: true, report_id: report.id, message: "Raport trimis. Echipa va analiza în 24h." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/block/:userId — Blocheaza un utilizator
router.post("/block/:userId", auth, async (req, res) => {
  try {
    const targetId = req.params.userId;
    if (String(targetId) === String(req.user.id)) return res.status(400).json({ error: "Nu te poti bloca pe tine" });

    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { blocked_users: targetId },
    });
    res.json({ success: true, message: "Utilizator blocat. Nu vei mai primi mesaje de la acesta." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/unblock/:userId — Deblocheaza un utilizator
router.post("/unblock/:userId", auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { blocked_users: mongoose.Types.ObjectId(req.params.userId) },
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/blocked — Lista utilizatorilor blocati de mine
router.get("/blocked", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("blocked_users", "name initials email").lean({ virtuals: true });
    res.json(user?.blocked_users || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Rute Admin ──────────────────────────────────────────────

// GET /api/reports — Toate rapoartele (admin)
router.get("/", auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const reports = await Report.find(filter)
      .populate("reporter_id", "name email initials")
      .populate("reported_user_id", "name email initials status warnings_count")
      .sort({ created_at: -1 })
      .lean({ virtuals: true });

    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/:id/action — Admin ia o actiune
// body: { action: "warn" | "suspend" | "ban" | "dismiss", note }
router.post("/:id/action", auth, adminOnly, async (req, res) => {
  try {
    const { action, note } = req.body;
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: "Raport negasit" });

    // Actualizeaza raportul
    report.status       = action === "dismiss" ? "dismissed" : "actioned";
    report.action_taken = note || action;
    await report.save();

    // Aplica actiunea pe contul utilizatorului raportat
    if (action === "warn") {
      await User.findByIdAndUpdate(report.reported_user_id, { $inc: { warnings_count: 1 } });
    } else if (action === "suspend") {
      await User.findByIdAndUpdate(report.reported_user_id, { status: "suspended" });
    } else if (action === "ban") {
      await User.findByIdAndUpdate(report.reported_user_id, { status: "banned" });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/stats — Statistici (admin)
router.get("/stats", auth, adminOnly, async (req, res) => {
  try {
    const [total, pending, actioned, banned, suspended] = await Promise.all([
      Report.countDocuments(),
      Report.countDocuments({ status: "pending" }),
      Report.countDocuments({ status: "actioned" }),
      User.countDocuments({ status: "banned" }),
      User.countDocuments({ status: "suspended" }),
    ]);
    res.json({ total, pending, actioned, banned, suspended });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
