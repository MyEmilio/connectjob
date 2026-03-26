const express = require("express");
const db      = require("../db/database");
const auth    = require("../middleware/auth");

const router = express.Router();
const COMMISSION = 0.05;

let stripe;
try {
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes("ADAUGA")) {
    stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  }
} catch {}

// POST /api/payments/create-intent
router.post("/create-intent", auth, async (req, res) => {
  try {
    const { job_id, payee_id, amount } = req.body;
    if (!job_id || !amount) return res.status(400).json({ error: "Date incomplete" });

    const commission = parseFloat((amount * COMMISSION).toFixed(2));
    const total      = parseFloat((amount + commission).toFixed(2));

    if (!stripe) {
      const payment = await db.createPayment({
        job_id, payer_id: req.user.id, payee_id,
        amount, commission, status: "held",
        stripe_pi_id: `sim_${Date.now()}`,
        method: req.body.method || "card",
      });
      return res.json({ payment_id: payment.id, client_secret: null, simulated: true, total, commission, message: "Mod demonstratie — configureaza Stripe pentru plati reale" });
    }

    const pi = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), currency: "ron",
      capture_method: "manual",
      metadata: { job_id: String(job_id), payer_id: String(req.user.id), payee_id: String(payee_id) },
    });
    const payment = await db.createPayment({
      job_id, payer_id: req.user.id, payee_id,
      amount, commission, status: "pending",
      stripe_pi_id: pi.id,
      method: req.body.method || "card",
    });
    res.json({ payment_id: payment.id, client_secret: pi.client_secret, total, commission });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/:id/release
router.post("/:id/release", auth, async (req, res) => {
  try {
    const payment = await db.findPaymentById(req.params.id);
    if (!payment) return res.status(404).json({ error: "Plata negasita" });
    if (String(payment.payer_id) !== String(req.user.id)) return res.status(403).json({ error: "Acces interzis" });
    if (stripe && payment.stripe_pi_id && !payment.stripe_pi_id.startsWith("sim_")) {
      await stripe.paymentIntents.capture(payment.stripe_pi_id);
    }
    await db.updatePayment(payment.id, { status: "released", released_at: new Date() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/:id/dispute
router.post("/:id/dispute", auth, async (req, res) => {
  try {
    await db.updatePayment(req.params.id, { status: "disputed" });
    res.json({ success: true, message: "Disputa inregistrata. Echipa va analiza in 24h." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/my
router.get("/my", auth, async (req, res) => {
  try {
    res.json(await db.getUserPayments(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
