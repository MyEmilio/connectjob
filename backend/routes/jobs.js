const express = require("express");
const db      = require("../db/database");
const auth    = require("../middleware/auth");

const router = express.Router();

// GET /api/jobs
router.get("/", (req, res) => {
  const { category, type, urgent, lat, lng, radius = 50, limit = 100, offset = 0 } = req.query;
  let jobs = db.getJobs({ category, type, urgent });

  if (lat && lng) {
    const toLat = parseFloat(lat), toLng = parseFloat(lng);
    jobs = jobs.map(j => {
      if (!j.lat || !j.lng) return { ...j, distance: null };
      const R = 6371, dLat = ((j.lat-toLat)*Math.PI)/180, dLng = ((j.lng-toLng)*Math.PI)/180;
      const a = Math.sin(dLat/2)**2 + Math.cos(toLat*Math.PI/180)*Math.cos(j.lat*Math.PI/180)*Math.sin(dLng/2)**2;
      return { ...j, distance: parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1)) };
    }).filter(j => j.distance === null || j.distance <= parseFloat(radius));
  }

  const total = jobs.length;
  const page  = jobs.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  res.json({ jobs: page, total, limit: parseInt(limit), offset: parseInt(offset) });
});

// GET /api/jobs/:id
router.get("/:id", (req, res) => {
  const job = db.findJobById(parseInt(req.params.id));
  if (!job) return res.status(404).json({ error: "Job negasit" });
  job.skills = JSON.parse(job.skills || "[]");
  res.json(job);
});

// POST /api/jobs
router.post("/", auth, (req, res) => {
  const { title, description, category, salary, type, urgent, lat, lng, skills, icon, color } = req.body;
  if (!title || !salary) return res.status(400).json({ error: "Titlu si salariu obligatorii" });
  const job = db.createJob({ title, description, category, salary, type: type||"part-time", urgent: urgent?1:0, lat, lng, employer_id: req.user.id, skills: JSON.stringify(skills||[]), icon: icon||"💼", color: color||"#059669" });
  res.json({ id: job.id, success: true });
});

// PUT /api/jobs/:id
router.put("/:id", auth, (req, res) => {
  const job = db.findJobById(parseInt(req.params.id));
  if (!job) return res.status(404).json({ error: "Job negasit" });
  if (job.employer_id !== req.user.id) return res.status(403).json({ error: "Nu esti proprietarul" });
  const { title, description, category, salary, type, urgent, lat, lng, skills, active } = req.body;
  db.updateJob(parseInt(req.params.id), { title, description, category, salary, type, urgent: urgent?1:0, lat, lng, skills: JSON.stringify(skills||[]), active: active !== undefined ? active : 1 });
  res.json({ success: true });
});

// DELETE /api/jobs/:id
router.delete("/:id", auth, (req, res) => {
  const job = db.findJobById(parseInt(req.params.id));
  if (!job) return res.status(404).json({ error: "Job negasit" });
  if (job.employer_id !== req.user.id) return res.status(403).json({ error: "Nu esti proprietarul" });
  db.updateJob(parseInt(req.params.id), { active: 0 });
  res.json({ success: true });
});

// POST /api/jobs/:id/apply
router.post("/:id/apply", auth, (req, res) => {
  try {
    db.createApplication({ job_id: parseInt(req.params.id), worker_id: req.user.id, message: req.body.message });
    res.json({ success: true });
  } catch {
    res.status(409).json({ error: "Ai aplicat deja la acest job" });
  }
});

// GET /api/jobs/:id/applications
router.get("/:id/applications", auth, (req, res) => {
  res.json(db.getApplicationsByJob(parseInt(req.params.id)));
});

module.exports = router;
