const express = require("express");
const db = require("../db/database");
const auth = require("../middleware/auth");
const logger = require("../utils/logger");
const {
  sendPaymentReleasedEmail,
  sendPaymentDisputedEmail,
} = require("../utils/emailService");
const { validate, createPaymentSchema, releasePaymentSchema } = require("../utils/validation");

const router = express.Router();
const COMMISSION = 0.03;

let stripe;
try {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
  if (key && !key.includes("ADAUGA") && key !== "sk_test_emergent") {
    stripe = require("stripe")(key);
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

        // Subscription lifecycle events
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const sub = event.data.object;
          const Subscription = require("../models/Subscription");
          const existingSub = await Subscription.findOne({
            stripe_subscription_id: sub.id,
          });
          if (existingSub) {
            if (sub.status === "canceled" || event.type === "customer.subscription.deleted") {
              existingSub.status = "cancelled";
              existingSub.cancelled_at = new Date();
              await existingSub.save();
              const UserModel = require("../models/User");
              await UserModel.findByIdAndUpdate(existingSub.user_id, { subscription_plan: "free" });
              logger.info("Subscription cancelled via webhook", { subId: sub.id });
            } else if (sub.status === "past_due") {
              existingSub.status = "past_due";
              await existingSub.save();
              logger.warn("Subscription past due", { subId: sub.id });
            }
          }
          break;
        }

        case "checkout.session.completed": {
          const session = event.data.object;
          const PaymentTransaction = require("../models/PaymentTransaction");
          const tx = await PaymentTransaction.findOne({ session_id: session.id });
          if (tx && tx.payment_status !== "paid") {
            tx.payment_status = "paid";
            await tx.save();

            if (tx.type === "subscription" && tx.plan) {
              const Subscription = require("../models/Subscription");
              const UserModel = require("../models/User");
              await Subscription.findOneAndUpdate(
                { checkout_session_id: session.id },
                { status: "active", stripe_subscription_id: session.subscription || "" },
              );
              await UserModel.findByIdAndUpdate(tx.user_id, { subscription_plan: tx.plan });
              logger.info("Subscription activated via webhook", { plan: tx.plan, userId: tx.user_id });
            }
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
router.post("/create-intent", auth, validate(createPaymentSchema), async (req, res) => {
  try {
    const { job_id, payee_id, amount } = req.validated;

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

    // Check if payee has Stripe Connect account for direct payouts
    const User = require("../models/User");
    const payee = await User.findById(payee_id).lean();
    const connectAccountId = payee?.stripe_connect_account_id;
    const hasConnect = connectAccountId && payee?.connect_onboarding_complete;

    const piParams = {
      amount: Math.round(total * 100),
      currency: "ron",
      capture_method: "manual",
      metadata: {
        job_id: String(job_id),
        payer_id: String(req.user.id),
        payee_id: String(payee_id),
      },
    };

    // If payee has Connect, use application_fee for 3% platform commission
    if (hasConnect) {
      piParams.application_fee_amount = Math.round(commission * 100);
      piParams.transfer_data = { destination: connectAccountId };
    }

    const pi = await stripe.paymentIntents.create(piParams);
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
router.post("/:id/release", auth, async (req, res) => {
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

    // Anti-evasion: increment completed_paid_jobs counter on both parties
    try {
      const User = require("../models/User");
      await Promise.all([
        User.updateOne({ _id: payment.payer_id }, { $inc: { completed_paid_jobs: 1 } }),
        User.updateOne({ _id: payment.payee_id }, { $inc: { completed_paid_jobs: 1 } }),
      ]);
    } catch (incErr) {
      logger.warn("Could not increment completed_paid_jobs", { error: incErr.message });
    }

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
router.post("/:id/dispute", auth, async (req, res) => {
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

// GET /api/payments/:id/status
// Get payment status for polling
router.get("/:id/status", auth, async (req, res) => {
  try {
    const payment = await db.findPaymentById(req.params.id);
    if (!payment) return res.status(404).json({ error: "Plata negăsită" });

    // Check if user is payer or payee
    if (
      String(payment.payer_id) !== String(req.user.id) &&
      String(payment.payee_id) !== String(req.user.id)
    ) {
      return res.status(403).json({ error: "Acces interzis" });
    }

    // If stripe is configured and we have a real payment intent, check status
    if (stripe && payment.stripe_pi_id && !payment.stripe_pi_id.startsWith("sim_")) {
      try {
        const pi = await stripe.paymentIntents.retrieve(payment.stripe_pi_id);
        
        // Update local status if changed
        let newStatus = payment.status;
        if (pi.status === "succeeded" && payment.status === "pending") {
          newStatus = "held";
          await db.updatePayment(payment.id, { status: newStatus });
        } else if (pi.status === "canceled") {
          newStatus = "failed";
          await db.updatePayment(payment.id, { status: newStatus });
        }

        return res.json({
          id: payment.id,
          status: newStatus,
          stripe_status: pi.status,
          amount: payment.amount,
          commission: payment.commission,
          created_at: payment.created_at,
        });
      } catch (stripeErr) {
        logger.error("Stripe status check error", { error: stripeErr.message });
      }
    }

    res.json({
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      commission: payment.commission,
      created_at: payment.created_at,
    });
  } catch (err) {
    logger.error("Get payment status error", {
      paymentId: req.params.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/stripe-config
// Get Stripe publishable key for frontend
router.get("/stripe-config", (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    configured: !!stripe,
  });
});

// GET /api/payments/escrow-status — tells frontend whether user must use escrow
router.get("/escrow-status", auth, async (req, res) => {
  try {
    const User = require("../models/User");
    const u = await User.findById(req.user.id).select("completed_paid_jobs rating subscription_plan").lean();
    const completed = u?.completed_paid_jobs || 0;
    const rating = u?.rating || 0;
    const isPremium = u?.subscription_plan === "premium";
    const THRESHOLD = 3;
    // Rule: escrow mandatory until 3 completed escrow-paid jobs AND rating >= 4.5
    // Premium users skip the requirement (paid tier).
    const mandatory = !isPremium && (completed < THRESHOLD || rating < 4.5);
    res.json({
      mandatory,
      completed_paid_jobs: completed,
      threshold: THRESHOLD,
      remaining: Math.max(0, THRESHOLD - completed),
      rating,
      premium_override: isPremium,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
