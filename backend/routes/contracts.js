const express = require("express");
const db = require("../db/database");
const auth = require("../middleware/auth");
const logger = require("../utils/logger");
const {
  createContractValidator,
  signContractValidator,
} = require("../utils/validators");
const { sendContractSignedEmail } = require("../utils/emailService");

const router = express.Router();

// GET /api/contracts/my
router.get("/my", auth, async (req, res) => {
  try {
    res.json(await db.getUserContracts(req.user.id));
  } catch (err) {
    logger.error("Get contracts error", {
      userId: req.user.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contracts
router.post("/", auth, createContractValidator, async (req, res) => {
  try {
    const { job_id, worker_id, content } = req.body;
    const contract = await db.createContract({
      job_id,
      worker_id,
      employer_id: req.user.id,
      content: content || "",
    });
    logger.info("Contract created", {
      contractId: contract.id,
      userId: req.user.id,
    });
    res.json({ id: contract.id, success: true });
  } catch (err) {
    logger.error("Create contract error", {
      userId: req.user.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contracts/:id/sign
router.post("/:id/sign", auth, signContractValidator, async (req, res) => {
  try {
    const { signature } = req.body;
    const contract = await db.findContractById(req.params.id);
    if (!contract) return res.status(404).json({ error: "Contract negasit" });

    const isWorker = String(contract.worker_id) === String(req.user.id);
    const isEmployer = String(contract.employer_id) === String(req.user.id);
    if (!isWorker && !isEmployer)
      return res.status(403).json({ error: "Acces interzis" });

    let newStatus;
    if (isWorker) {
      newStatus = contract.employer_sig ? "signed_both" : "signed_worker";
      await db.updateContract(contract.id, {
        worker_sig: signature,
        status: newStatus,
        ...(newStatus === "signed_both" ? { signed_at: new Date() } : {}),
      });
    } else {
      newStatus = contract.worker_sig ? "signed_both" : "signed_employer";
      await db.updateContract(contract.id, {
        employer_sig: signature,
        status: newStatus,
        ...(newStatus === "signed_both" ? { signed_at: new Date() } : {}),
      });
    }

    // Send email notifications when both parties signed
    if (newStatus === "signed_both") {
      try {
        const User = require("../models/User");
        const Job = require("../models/Job");
        const [worker, employer, job] = await Promise.all([
          User.findById(contract.worker_id).lean(),
          User.findById(contract.employer_id).lean(),
          Job.findById(contract.job_id).lean(),
        ]);
        const jobTitle = job?.title || "Job";

        if (worker?.email) {
          await sendContractSignedEmail(worker.email, {
            userName: worker.name,
            otherPartyName: employer?.name || "Angajator",
            jobTitle,
          });
        }
        if (employer?.email) {
          await sendContractSignedEmail(employer.email, {
            userName: employer.name,
            otherPartyName: worker?.name || "Lucrător",
            jobTitle,
          });
        }
      } catch (emailErr) {
        logger.error("Contract signed email error", {
          error: emailErr.message,
        });
      }
    }

    logger.info("Contract signed", {
      contractId: req.params.id,
      userId: req.user.id,
      newStatus,
    });
    res.json({ success: true });
  } catch (err) {
    logger.error("Sign contract error", {
      contractId: req.params.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
