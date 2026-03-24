const express = require("express");
const db      = require("../db/database");
const auth    = require("../middleware/auth");

const router = express.Router();

router.get("/my", auth, (req, res) => {
  res.json(db.getUserContracts(req.user.id));
});

router.post("/", auth, (req, res) => {
  const { job_id, worker_id, content } = req.body;
  if (!job_id || !worker_id) return res.status(400).json({ error: "Date incomplete" });
  const contract = db.createContract({ job_id: parseInt(job_id), worker_id: parseInt(worker_id), employer_id: req.user.id, content: content||"" });
  res.json({ id: contract.id, success: true });
});

router.post("/:id/sign", auth, (req, res) => {
  const { signature } = req.body;
  if (!signature) return res.status(400).json({ error: "Semnatura lipsa" });
  const contract = db.findContractById(parseInt(req.params.id));
  if (!contract) return res.status(404).json({ error: "Contract negasit" });

  const isWorker = contract.worker_id === req.user.id;
  const isEmployer = contract.employer_id === req.user.id;
  if (!isWorker && !isEmployer) return res.status(403).json({ error: "Acces interzis" });

  if (isWorker) {
    const newStatus = contract.employer_sig ? "signed_both" : "signed_worker";
    db.updateContract(contract.id, { worker_sig: signature, status: newStatus, ...(newStatus==="signed_both"?{signed_at: new Date().toISOString()}:{}) });
  }
  if (isEmployer) {
    const newStatus = contract.worker_sig ? "signed_both" : "pending";
    db.updateContract(contract.id, { employer_sig: signature, status: newStatus, ...(newStatus==="signed_both"?{signed_at: new Date().toISOString()}:{}) });
  }
  res.json({ success: true });
});

module.exports = router;
