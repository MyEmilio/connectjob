const express = require("express");
const db      = require("../db/database");
const auth    = require("../middleware/auth");

const router = express.Router();

router.get("/:userId", (req, res) => {
  const reviews = db.getUserReviews(parseInt(req.params.userId));
  const avg = reviews.length ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1) : 0;
  res.json({ reviews, average: parseFloat(avg), total: reviews.length });
});

router.post("/", auth, (req, res) => {
  const { target_id, job_id, rating, text } = req.body;
  if (!target_id || !rating) return res.status(400).json({ error: "Date incomplete" });
  if (parseInt(target_id) === req.user.id) return res.status(400).json({ error: "Nu te poti evalua singur" });
  db.createReview({ reviewer_id: req.user.id, target_id: parseInt(target_id), job_id: job_id ? parseInt(job_id) : null, rating: parseInt(rating), text });
  res.json({ success: true });
});

module.exports = router;
