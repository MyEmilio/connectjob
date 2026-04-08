const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const Report = require("../models/Report");
const User = require("../models/User");
const logger = require("../utils/logger");
const { reportValidator, mongoIdValidator } = require("../utils/validators");
const { body } = require("express-validator");

const router = express.Router();

// ── Admin middleware ────────────────────────────────────────
function adminOnly(req, res, next) {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Acces rezervat administratorilor" });
  next();
}

// POST /api/reports — Report a user
router.post("/", auth, reportValidator, async (req, res) => {
  try {
    const { reported_user_id, message_id, reason, details } = req.body;

    if (String(reported_user_id) === String(req.user.id))
      return res.status(400).json({ error: "Nu te poti raporta pe tine" });

    // Prevent duplicate reports same day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await Report.findOne({
      reporter_id: req.user.id,
      reported_user_id,
      created_at: { $gte: today },
    });
    if (existing)
      return res
        .status(400)
        .json({ error: "Ai raportat deja acest utilizator astazi" });

    const report = await Report.create({
      reporter_id: req.user.id,
      reported_user_id,
      message_id: message_id || null,
      reason,
      details: details || "",
    });
    logger.info("Report created", {
      reportId: report.id,
      reporterId: req.user.id,
      reportedUserId: reported_user_id,
      reason,
    });
    res.json({
      success: true,
      report_id: report.id,
      message: "Raport trimis. Echipa va analiza în 24h.",
    });
  } catch (err) {
    logger.error("Create report error", {
      userId: req.user.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/block/:userId — Block a user
router.post("/block/:userId", auth, mongoIdValidator("userId"), async (req, res) => {
  try {
    const targetId = req.params.userId;
    if (String(targetId) === String(req.user.id))
      return res.status(400).json({ error: "Nu te poti bloca pe tine" });

    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { blocked_users: targetId },
    });
    logger.info("User blocked", { userId: req.user.id, blockedId: targetId });
    res.json({
      success: true,
      message: "Utilizator blocat. Nu vei mai primi mesaje de la acesta.",
    });
  } catch (err) {
    logger.error("Block user error", {
      userId: req.user.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/unblock/:userId — Unblock a user
router.post("/unblock/:userId", auth, mongoIdValidator("userId"), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { blocked_users: new mongoose.Types.ObjectId(req.params.userId) },
    });
    logger.info("User unblocked", {
      userId: req.user.id,
      unblockedId: req.params.userId,
    });
    res.json({ success: true });
  } catch (err) {
    logger.error("Unblock user error", {
      userId: req.user.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/blocked — List of blocked users
router.get("/blocked", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("blocked_users", "name initials email")
      .lean({ virtuals: true });
    res.json(user?.blocked_users || []);
  } catch (err) {
    logger.error("Get blocked users error", {
      userId: req.user.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// ── Admin Routes ──────────────────────────────────────────────

// GET /api/reports — All reports (admin)
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
    logger.error("Get reports error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports/:id/action — Admin takes action
// body: { action: "warn" | "suspend" | "ban" | "dismiss", note }
router.post(
  "/:id/action",
  auth,
  adminOnly,
  mongoIdValidator(),
  [
    body("action")
      .isIn(["warn", "suspend", "ban", "dismiss"])
      .withMessage("Actiune invalida"),
    body("note")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Nota poate avea maxim 500 caractere"),
  ],
  async (req, res) => {
    try {
      const { action, note } = req.body;
      const report = await Report.findById(req.params.id);
      if (!report) return res.status(404).json({ error: "Raport negasit" });

      // Update report
      report.status = action === "dismiss" ? "dismissed" : "actioned";
      report.action_taken = note || action;
      await report.save();

      // Apply action to reported user
      if (action === "warn") {
        await User.findByIdAndUpdate(report.reported_user_id, {
          $inc: { warnings_count: 1 },
        });
      } else if (action === "suspend") {
        await User.findByIdAndUpdate(report.reported_user_id, {
          status: "suspended",
        });
      } else if (action === "ban") {
        await User.findByIdAndUpdate(report.reported_user_id, {
          status: "banned",
        });
      }

      logger.info("Report action taken", {
        reportId: req.params.id,
        action,
        adminId: req.user.id,
      });
      res.json({ success: true });
    } catch (err) {
      logger.error("Report action error", {
        reportId: req.params.id,
        error: err.message,
      });
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/reports/stats — Stats (admin)
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
    logger.error("Get report stats error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
