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

// POST /api/jobs/:id/select-worker — clientul alege un prestator
router.post("/:id/select-worker", auth, async (req, res) => {
  try {
    const job = await db.findJobById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job negasit" });
    if (String(job.employer_id) !== String(req.user.id)) return res.status(403).json({ error: "Nu esti proprietarul" });
    const { worker_id } = req.body;
    if (!worker_id) return res.status(400).json({ error: "worker_id obligatoriu" });

    await db.updateJob(req.params.id, { status: "provider_chosen", selected_worker_id: worker_id });
    await db.updateApplication(req.params.id, worker_id, { status: "accepted" });

    res.json({ success: true, status: "provider_chosen" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/:id/start — incepe lucrarea
router.post("/:id/start", auth, async (req, res) => {
  try {
    const job = await db.findJobById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job negasit" });
    const isEmployer = String(job.employer_id) === String(req.user.id);
    const isWorker   = String(job.selected_worker_id) === String(req.user.id);
    if (!isEmployer && !isWorker) return res.status(403).json({ error: "Acces interzis" });
    if (job.status !== "provider_chosen") return res.status(400).json({ error: "Jobul nu e in starea corecta" });

    await db.updateJob(req.params.id, { status: "in_progress" });
    res.json({ success: true, status: "in_progress" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/:id/complete — finalizeaza lucrarea
router.post("/:id/complete", auth, async (req, res) => {
  try {
    const job = await db.findJobById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job negasit" });
    const isEmployer = String(job.employer_id) === String(req.user.id);
    const isWorker   = String(job.selected_worker_id) === String(req.user.id);
    if (!isEmployer && !isWorker) return res.status(403).json({ error: "Acces interzis" });
    if (job.status !== "in_progress") return res.status(400).json({ error: "Jobul nu e in desfasurare" });

    await db.updateJob(req.params.id, { status: "completed", active: false });
    res.json({ success: true, status: "completed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/:id/cancel — anuleaza jobul
router.post("/:id/cancel", auth, async (req, res) => {
  try {
    const job = await db.findJobById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job negasit" });
    const isEmployer = String(job.employer_id) === String(req.user.id);
    const isWorker   = String(job.selected_worker_id) === String(req.user.id);
    if (!isEmployer && !isWorker) return res.status(403).json({ error: "Acces interzis" });
    const cancellable = ["published", "in_discussion", "provider_chosen", "in_progress"];
    if (!cancellable.includes(job.status)) return res.status(400).json({ error: "Jobul nu poate fi anulat" });

    await db.updateJob(req.params.id, { status: "cancelled", active: false });
    res.json({ success: true, status: "cancelled" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/:id/dispute — raporteaza o disputa
router.post("/:id/dispute", auth, async (req, res) => {
  try {
    const job = await db.findJobById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job negasit" });
    const isEmployer = String(job.employer_id) === String(req.user.id);
    const isWorker   = String(job.selected_worker_id) === String(req.user.id);
    if (!isEmployer && !isWorker) return res.status(403).json({ error: "Acces interzis" });
    if (!["in_progress", "completed"].includes(job.status)) return res.status(400).json({ error: "Disputa posibila doar pe joburi active sau finalizate" });

    await db.updateJob(req.params.id, { status: "dispute" });
    res.json({ success: true, status: "dispute" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/my/active — joburile active ale unui employer sau worker
router.get("/my/active", auth, async (req, res) => {
  try {
    const Job = require("../models/Job");
    const query = req.user.role === "employer"
      ? { employer_id: req.user.id, status: { $in: ["published", "in_discussion", "provider_chosen", "in_progress"] } }
      : { selected_worker_id: req.user.id, status: { $in: ["provider_chosen", "in_progress"] } };
    const jobs = await Job.find(query).sort({ updated_at: -1 }).lean();
    res.json(jobs.map(j => ({ ...j, id: j._id })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
