const express = require("express");
const db      = require("../db/database");
const auth    = require("../middleware/auth");

const router = express.Router();

// GET /api/contracts/my
router.get("/my", auth, async (req, res) => {
  try {
    res.json(await db.getUserContracts(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/contracts/:id — un contract specific (ambele parti au acces)
router.get("/:id", auth, async (req, res) => {
  try {
    const contract = await db.findContractById(req.params.id);
    if (!contract) return res.status(404).json({ error: "Contract negasit" });
    const isParty = String(contract.worker_id) === String(req.user.id) ||
                    String(contract.employer_id) === String(req.user.id);
    if (!isParty && req.user.role !== "admin")
      return res.status(403).json({ error: "Acces interzis" });
    res.json(contract);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contracts
router.post("/", auth, async (req, res) => {
  try {
    const { job_id, worker_id, content } = req.body;
    if (!job_id || !worker_id) return res.status(400).json({ error: "Date incomplete" });
    const contract = await db.createContract({
      job_id,
      worker_id,
      employer_id: req.user.id,
      content: content || "",
    });
    res.json({ id: contract.id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contracts/:id/sign
router.post("/:id/sign", auth, async (req, res) => {
  try {
    const { signature } = req.body;
    if (!signature) return res.status(400).json({ error: "Semnatura lipsa" });
    const contract = await db.findContractById(req.params.id);
    if (!contract) return res.status(404).json({ error: "Contract negasit" });

    const isWorker   = String(contract.worker_id)   === String(req.user.id);
    const isEmployer = String(contract.employer_id) === String(req.user.id);
    if (!isWorker && !isEmployer) return res.status(403).json({ error: "Acces interzis" });

    if (isWorker) {
      const newStatus = contract.employer_sig ? "signed_both" : "signed_worker";
      await db.updateContract(contract.id, {
        worker_sig: signature,
        status: newStatus,
        ...(newStatus === "signed_both" ? { signed_at: new Date() } : {}),
      });
    } else {
      const newStatus = contract.worker_sig ? "signed_both" : "signed_employer";
      await db.updateContract(contract.id, {
        employer_sig: signature,
        status: newStatus,
        ...(newStatus === "signed_both" ? { signed_at: new Date() } : {}),
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
