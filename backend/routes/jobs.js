const express = require("express");
const db = require("../db/database");
const auth = require("../middleware/auth");
const logger = require("../utils/logger");
const {
  createJobValidator,
  updateJobValidator,
  mongoIdValidator,
  applyJobValidator,
} = require("../utils/validators");

const router = express.Router();

// GET /api/jobs
router.get("/", async (req, res) => {
  try {
    const {
      category,
      type,
      urgent,
      second_job,
      work_duration,
      lat,
      lng,
      radius = 50,
      limit = 100,
      offset = 0,
    } = req.query;
    let jobs = await db.getJobs({
      category,
      type,
      urgent,
      second_job,
      work_duration,
    });

    if (lat && lng) {
      const toLat = parseFloat(lat),
        toLng = parseFloat(lng);
      jobs = jobs
        .map((j) => {
          if (!j.lat || !j.lng) return { ...j, distance: null };
          const R = 6371,
            dLat = ((j.lat - toLat) * Math.PI) / 180,
            dLng = ((j.lng - toLng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((toLat * Math.PI) / 180) *
              Math.cos((j.lat * Math.PI) / 180) *
              Math.sin(dLng / 2) ** 2;
          return {
            ...j,
            distance: parseFloat(
              (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1)
            ),
          };
        })
        .filter((j) => j.distance === null || j.distance <= parseFloat(radius));
    }

    const total = jobs.length;
    const page = jobs.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );
    res.json({
      jobs: page,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    logger.error("Get jobs error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id
router.get("/:id", mongoIdValidator(), async (req, res) => {
  try {
    const job = await db.findJobById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job negasit" });
    res.json(job);
  } catch (err) {
    logger.error("Get job error", { jobId: req.params.id, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs
router.post("/", auth, createJobValidator, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      salary,
      type,
      urgent,
      lat,
      lng,
      skills,
      icon,
      color,
    } = req.body;

    const job = await db.createJob({
      title,
      description,
      category,
      salary,
      type: type || "part-time",
      urgent: !!urgent,
      lat,
      lng,
      employer_id: req.user.id,
      skills: skills || [],
      icon: icon || "💼",
      color: color || "#059669",
    });
    logger.info("Job created", { jobId: job.id, userId: req.user.id });
    res.json({ id: job.id, success: true });
  } catch (err) {
    logger.error("Create job error", {
      userId: req.user.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/jobs/:id
router.put("/:id", auth, updateJobValidator, async (req, res) => {
  try {
    const job = await db.findJobById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job negasit" });
    if (String(job.employer_id) !== String(req.user.id))
      return res.status(403).json({ error: "Nu esti proprietarul" });
    const {
      title,
      description,
      category,
      salary,
      type,
      urgent,
      lat,
      lng,
      skills,
      active,
    } = req.body;
    await db.updateJob(req.params.id, {
      title,
      description,
      category,
      salary,
      type,
      urgent: !!urgent,
      lat,
      lng,
      skills: skills || [],
      active: active !== undefined ? active : true,
    });
    logger.info("Job updated", { jobId: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (err) {
    logger.error("Update job error", {
      jobId: req.params.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/jobs/:id
router.delete("/:id", auth, mongoIdValidator(), async (req, res) => {
  try {
    const job = await db.findJobById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job negasit" });
    if (String(job.employer_id) !== String(req.user.id))
      return res.status(403).json({ error: "Nu esti proprietarul" });
    await db.updateJob(req.params.id, { active: false });
    logger.info("Job deleted", { jobId: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (err) {
    logger.error("Delete job error", {
      jobId: req.params.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/:id/promote — Admin promotes/demotes a job
router.post("/:id/promote", auth, mongoIdValidator(), async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res
        .status(403)
        .json({ error: "Acces rezervat administratorilor" });
    const job = await db.findJobById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job negasit" });
    const newState =
      req.body.promoted !== undefined ? !!req.body.promoted : !job.promoted;
    await db.updateJob(req.params.id, { promoted: newState });
    logger.info("Job promotion changed", {
      jobId: req.params.id,
      promoted: newState,
    });
    res.json({ success: true, promoted: newState });
  } catch (err) {
    logger.error("Promote job error", {
      jobId: req.params.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/:id/apply
router.post("/:id/apply", auth, applyJobValidator, async (req, res) => {
  try {
    await db.createApplication({
      job_id: req.params.id,
      worker_id: req.user.id,
      message: req.body.message,
    });
    logger.info("Job application created", {
      jobId: req.params.id,
      workerId: req.user.id,
    });
    res.json({ success: true });
  } catch (err) {
    if (err.message === "DUPLICATE")
      return res.status(409).json({ error: "Ai aplicat deja la acest job" });
    logger.error("Apply job error", {
      jobId: req.params.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id/applications
router.get("/:id/applications", auth, mongoIdValidator(), async (req, res) => {
  try {
    res.json(await db.getApplicationsByJob(req.params.id));
  } catch (err) {
    logger.error("Get applications error", {
      jobId: req.params.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
