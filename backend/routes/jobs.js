const express = require("express");
const db      = require("../db/database");
const auth    = require("../middleware/auth");

const router = express.Router();

// GET /api/jobs
router.get("/", async (req, res) => {
  try {
    const { category, type, urgent, second_job, work_duration, lat, lng, radius = 50, limit = 100, offset = 0 } = req.query;
    let jobs = await db.getJobs({ category, type, urgent, second_job, work_duration });

    if (lat && lng) {
      const toLat = parseFloat(lat), toLng = parseFloat(lng);
      jobs = jobs.map(j => {
        if (!j.lat || !j.lng) return { ...j, distance: null };
        const R = 6371, dLat = ((j.lat - toLat) * Math.PI) / 180, dLng = ((j.lng - toLng) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toLat * Math.PI / 180) * Math.cos(j.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return { ...j, distance: parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1)) };
      }).filter(j => j.distance === null || j.distance <= parseFloat(radius));
    }

    const total = jobs.length;
    const page  = jobs.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    res.json({ jobs: page, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/my/applications — aplicatiile proprii ale unui worker
router.get("/my/applications", auth, async (req, res) => {
  try {
    res.json(await db.getApplicationsByWorker(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id
router.get("/:id", async (req, res) => {
  try {
    const job = await db.findJobById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job negasit" });
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, category, salary, type, urgent, second_job, work_duration, lat, lng, skills, icon, color, images } = req.body;
    if (!title || !salary) return res.status(400).json({ error: "Titlu si salariu obligatorii" });
    // Validate images: max 5, each max ~500KB base64
    const safeImages = Array.isArray(images) ? images.slice(0, 5).filter(img => typeof img === "string" && img.length < 700000) : [];
    const job = await db.createJob({
      title, description, category, salary,
      type: type || "part-time",
      urgent: !!urgent,
      second_job: !!second_job,
      work_duration: work_duration || "zile",
      lat, lng,
      employer_id: req.user.id,
      skills: skills || [],
      icon: icon || "💼",
      color: color || "#059669",
      images: safeImages,
    });
    res.json({ id: job.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/jobs/:id
router.put("/:id", auth, async (req, res) => {
  try {
    const job = await db.findJobById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job negasit" });
    if (String(job.employer_id) !== String(req.user.id)) return res.status(403).json({ error: "Nu esti proprietarul" });
    const { title, description, category, salary, type, urgent, second_job, work_duration, lat, lng, skills, active } = req.body;
    await db.updateJob(req.params.id, { title, description, category, salary, type, urgent: !!urgent, second_job: !!second_job, work_duration: work_duration || "zile", lat, lng, skills: skills || [], active: active !== undefined ? active : true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/jobs/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    const job = await db.findJobById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job negasit" });
    if (String(job.employer_id) !== String(req.user.id)) return res.status(403).json({ error: "Nu esti proprietarul" });
    await db.updateJob(req.params.id, { active: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/:id/promote — Admin promovează / demovează un anunț
router.post("/:id/promote", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Acces rezervat administratorilor" });
    const job = await db.findJobById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job negasit" });
    const newState = req.body.promoted !== undefined ? !!req.body.promoted : !job.promoted;
    await db.updateJob(req.params.id, { promoted: newState });
    res.json({ success: true, promoted: newState });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/:id/apply
router.post("/:id/apply", auth, async (req, res) => {
  try {
    await db.createApplication({ job_id: req.params.id, worker_id: req.user.id, message: req.body.message });
    res.json({ success: true });
  } catch (err) {
    if (err.message === "DUPLICATE") return res.status(409).json({ error: "Ai aplicat deja la acest job" });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id/applications
router.get("/:id/applications", auth, async (req, res) => {
  try {
    res.json(await db.getApplicationsByJob(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
