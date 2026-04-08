const express = require("express");
const db = require("../db/database");
const auth = require("../middleware/auth");
const logger = require("../utils/logger");
const { reviewValidator, mongoIdValidator } = require("../utils/validators");

const router = express.Router();

// GET /api/reviews/:userId
router.get("/:userId", mongoIdValidator("userId"), async (req, res) => {
  try {
    const reviews = await db.getUserReviews(req.params.userId);
    const avg = reviews.length
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : 0;
    res.json({ reviews, average: parseFloat(avg), total: reviews.length });
  } catch (err) {
    logger.error("Get reviews error", {
      userId: req.params.userId,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews
router.post("/", auth, reviewValidator, async (req, res) => {
  try {
    const { target_id, job_id, rating, text } = req.body;

    if (String(target_id) === String(req.user.id))
      return res.status(400).json({ error: "Nu te poti evalua singur" });
    await db.createReview({
      reviewer_id: req.user.id,
      target_id,
      job_id: job_id || null,
      rating: parseInt(rating),
      text,
    });
    logger.info("Review created", {
      reviewerId: req.user.id,
      targetId: target_id,
    });
    res.json({ success: true });
  } catch (err) {
    logger.error("Create review error", {
      userId: req.user.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
