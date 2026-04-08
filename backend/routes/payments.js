const express = require("express");
const db = require("../db/database");
const auth = require("../middleware/auth");
const logger = require("../utils/logger");
const {
  paymentIntentValidator,
  mongoIdValidator,
} = require("../utils/validators");
const {
  sendPaymentReleasedEmail,
  sendPaymentDisputedEmail,
} = require("../utils/emailService");

const router = express.Router();
const COMMISSION = 0.05;

let stripe;
try {
  if (
    process.env.STRIPE_SECRET_KEY &&
    !process.env.STRIPE_SECRET_KEY.includes("ADAUGA")
  ) {
    stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  }
} catch {}

// Stripe webhook endpoint - must be before other routes
// This uses express.raw() for webhook signature verification
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripe) {
      return res.status(400).json({ error: "Stripe not configured" });
    }

    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.warn("Stripe webhook secret not configured");
      return res.status(400).json({ error: "Webhook secret not configured" });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      logger.error("Webhook signature verification failed", {
        error: err.message,
      });
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    logger.info("Stripe webhook received", { type: event.type, id: event.id });

    try {
      switch (event.type) {
        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object;
          const Payment = require("../models/Payment");
          const payment = await Payment.findOne({
            stripe_pi_id: paymentIntent.id,
          });
          if (payment) {
            payment.status = "held";
            await payment.save();
            logger.info("Payment intent succeeded", {
              paymentId: payment.id,
              stripeId: paymentIntent.id,
            });
          }
          break;
        }

        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object;
          const Payment = require("../models/Payment");
          const payment = await Payment.findOne({
            stripe_pi_id: paymentIntent.id,
          });
          if (payment) {
            payment.status = "failed";
            await payment.save();
            logger.warn("Payment intent failed", {
              paymentId: payment.id,
              stripeId: paymentIntent.id,
              error: paymentIntent.last_payment_error?.message,
            });
          }
          break;
        }

        case "charge.dispute.created": {
          const dispute = event.data.object;
          const Payment = require("../models/Payment");
          const payment = await Payment.findOne({
            stripe_pi_id: dispute.payment_intent,
          });
          if (payment) {
            payment.status = "disputed";
            await payment.save();
            logger.warn("Charge dispute created", {
              paymentId: payment.id,
              disputeId: dispute.id,
            });
          }
          break;
        }

        default:
          logger.debug("Unhandled webhook event", { type: event.type });
      }
    } catch (err) {
      logger.error("Webhook handler error", {
        type: event.type,
        error: err.message,
      });
    }

    res.json({ received: true });
  }
);

// POST /api/payments/create-intent
router.post("/create-intent", auth, paymentIntentValidator, async (req, res) => {
  try {
    const { job_id, payee_id, amount } = req.body;

    const commission = parseFloat((amount * COMMISSION).toFixed(2));
    const total = parseFloat((amount + commission).toFixed(2));

    if (!stripe) {
      const payment = await db.createPayment({
        job_id,
        payer_id: req.user.id,
        payee_id,
        amount,
        commission,
        status: "held",
        stripe_pi_id: `sim_${Date.now()}`,
        method: req.body.method || "card",
      });
      logger.info("Simulated payment created", { paymentId: payment.id });
      return res.json({
        payment_id: payment.id,
        client_secret: null,
        simulated: true,
        total,
        commission,
        message: "Mod demonstratie — configureaza Stripe pentru plati reale",
      });
    }

    const pi = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: "ron",
      capture_method: "manual",
      metadata: {
        job_id: String(job_id),
        payer_id: String(req.user.id),
        payee_id: String(payee_id),
      },
    });
    const payment = await db.createPayment({
      job_id,
      payer_id: req.user.id,
      payee_id,
      amount,
      commission,
      status: "pending",
      stripe_pi_id: pi.id,
      method: req.body.method || "card",
    });
    logger.info("Payment intent created", {
      paymentId: payment.id,
      stripeId: pi.id,
    });
    res.json({
      payment_id: payment.id,
      client_secret: pi.client_secret,
      total,
      commission,
    });
  } catch (err) {
    logger.error("Create payment error", {
      userId: req.user.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/:id/release
router.post("/:id/release", auth, mongoIdValidator(), async (req, res) => {
  try {
    const payment = await db.findPaymentById(req.params.id);
    if (!payment) return res.status(404).json({ error: "Plata negasita" });
    if (String(payment.payer_id) !== String(req.user.id))
      return res.status(403).json({ error: "Acces interzis" });
    if (
      stripe &&
      payment.stripe_pi_id &&
      !payment.stripe_pi_id.startsWith("sim_")
    ) {
      await stripe.paymentIntents.capture(payment.stripe_pi_id);
    }
    await db.updatePayment(payment.id, {
      status: "released",
      released_at: new Date(),
    });

    // Send email notification to worker
    try {
      const User = require("../models/User");
      const Job = require("../models/Job");
      const [payee, job] = await Promise.all([
        User.findById(payment.payee_id).lean(),
        Job.findById(payment.job_id).lean(),
      ]);
      if (payee?.email) {
        await sendPaymentReleasedEmail(payee.email, {
          workerName: payee.name,
          amount: payment.amount,
          jobTitle: job?.title || "Job",
        });
      }
    } catch (emailErr) {
      logger.error("Payment release email error", { error: emailErr.message });
    }

    logger.info("Payment released", {
      paymentId: req.params.id,
      userId: req.user.id,
    });
    res.json({ success: true });
  } catch (err) {
    logger.error("Release payment error", {
      paymentId: req.params.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/:id/dispute
router.post("/:id/dispute", auth, mongoIdValidator(), async (req, res) => {
  try {
    const payment = await db.findPaymentById(req.params.id);
    if (!payment) return res.status(404).json({ error: "Plata negasita" });

    await db.updatePayment(req.params.id, { status: "disputed" });

    // Send email notifications to both parties
    try {
      const User = require("../models/User");
      const Job = require("../models/Job");
      const [payer, payee, job] = await Promise.all([
        User.findById(payment.payer_id).lean(),
        User.findById(payment.payee_id).lean(),
        Job.findById(payment.job_id).lean(),
      ]);
      const disputeData = {
        amount: payment.amount,
        jobTitle: job?.title || "Job",
      };
      if (payer?.email) {
        await sendPaymentDisputedEmail(payer.email, {
          ...disputeData,
          userName: payer.name,
        });
      }
      if (payee?.email) {
        await sendPaymentDisputedEmail(payee.email, {
          ...disputeData,
          userName: payee.name,
        });
      }
    } catch (emailErr) {
      logger.error("Payment dispute email error", { error: emailErr.message });
    }

    logger.info("Payment disputed", {
      paymentId: req.params.id,
      userId: req.user.id,
    });
    res.json({
      success: true,
      message: "Disputa inregistrata. Echipa va analiza in 24h.",
    });
  } catch (err) {
    logger.error("Dispute payment error", {
      paymentId: req.params.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/my
router.get("/my", auth, async (req, res) => {
  try {
    res.json(await db.getUserPayments(req.user.id));
  } catch (err) {
    logger.error("Get payments error", {
      userId: req.user.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
