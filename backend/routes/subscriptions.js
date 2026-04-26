const express = require("express");
const auth = require("../middleware/auth");
const logger = require("../utils/logger");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const PaymentTransaction = require("../models/PaymentTransaction");

const router = express.Router();

// Plan definitions — prices in RON
// Commission rates per plan (Standard tier — users #301+):
//   free → 7%, pro → 5%, premium → 3%
// Founders (#1-100) pay 0% regardless of plan.
// Early Adopters (#101-300) pay 3% flat regardless of plan.
const PLANS = {
  free: {
    name: "Free",
    price: 0,
    interval: null,
    commission_pct: 7,
    feature_keys: ["plan_feat_3apps", "plan_feat_chat_basic", "plan_feat_profile_simple", "plan_feat_view_jobs"],
    limits: { daily_applications: 3, chat_moderation: true, promoted_jobs: 0 },
  },
  pro: {
    name: "Pro",
    price: 49.99,
    interval: "month",
    commission_pct: 5,
    feature_keys: ["plan_feat_unlimited_apps", "plan_feat_chat_translate", "plan_feat_profile_highlight", "plan_feat_stats", "plan_feat_chat_relaxed"],
    limits: { daily_applications: -1, chat_moderation: false, promoted_jobs: 3 },
  },
  premium: {
    name: "Premium",
    price: 99.99,
    interval: "month",
    commission_pct: 3,
    feature_keys: ["plan_feat_all_pro", "plan_feat_promoted", "plan_feat_priority", "plan_feat_badge", "plan_feat_no_moderation", "plan_feat_zero_commission"],
    limits: { daily_applications: -1, chat_moderation: false, promoted_jobs: 10 },
  },
};

let stripe;
try {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
  // sk_test_emergent only works with Python emergentintegrations, not native Stripe SDK
  if (key && !key.includes("ADAUGA") && key !== "sk_test_emergent") {
    stripe = require("stripe")(key);
  }
} catch (err) {
  logger.warn("Stripe not initialized for subscriptions", { error: err.message });
}

// GET /api/subscriptions/plans — list available plans
router.get("/plans", (req, res) => {
  const plans = Object.entries(PLANS).map(([key, plan]) => ({
    id: key,
    name: plan.name,
    price: plan.price,
    interval: plan.interval,
    commission_pct: plan.commission_pct,
    feature_keys: plan.feature_keys,
    limits: plan.limits,
    stripe_configured: !!stripe,
  }));
  res.json({ plans });
});

// GET /api/subscriptions/my — get current user subscription
router.get("/my", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    let plan = user.subscription_plan || "free";

    // Auto-downgrade if trial expired
    const isTrial = user.trial_used && user.trial_expires_at;
    const trialExpired = isTrial && new Date(user.trial_expires_at) < new Date();
    if (trialExpired && plan !== "free") {
      // Check if user has a paid (non-trial) subscription active
      const paidSub = await Subscription.findOne({
        user_id: req.user.id,
        status: "active",
        checkout_session_id: { $not: /^trial_/ },
      });
      if (!paidSub) {
        plan = "free";
        await User.findByIdAndUpdate(req.user.id, { subscription_plan: "free" });
        await Subscription.updateMany(
          { user_id: req.user.id, checkout_session_id: /^trial_/, status: "active" },
          { status: "expired" }
        );
        logger.info("Trial expired, downgraded to free", { userId: req.user.id });
      }
    }

    const subscription = await Subscription.findOne({
      user_id: req.user.id,
      status: { $in: ["active", "pending"] },
    })
      .sort({ created_at: -1 })
      .lean({ virtuals: true });

    const planDetails = PLANS[plan] || PLANS.free;

    // Check daily application reset
    let dailyApps = user.daily_applications || 0;
    const resetDate = user.daily_applications_reset
      ? new Date(user.daily_applications_reset)
      : new Date(0);
    const now = new Date();
    if (resetDate.toDateString() !== now.toDateString()) {
      dailyApps = 0;
      await User.findByIdAndUpdate(req.user.id, {
        daily_applications: 0,
        daily_applications_reset: now,
      });
    }

    // Trial info
    const trialInfo = isTrial
      ? {
          active: !trialExpired && plan !== "free",
          expires_at: user.trial_expires_at,
          days_remaining: trialExpired
            ? 0
            : Math.max(0, Math.ceil((new Date(user.trial_expires_at) - now) / (1000 * 60 * 60 * 24))),
        }
      : null;

    res.json({
      plan,
      plan_details: planDetails,
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            current_period_end: subscription.current_period_end,
            is_trial: subscription.checkout_session_id?.startsWith("trial_") || false,
          }
        : null,
      trial: trialInfo,
      trial_eligible: !user.trial_used,
      daily_applications_used: dailyApps,
      daily_applications_limit: planDetails.limits.daily_applications,
    });
  } catch (err) {
    logger.error("Get subscription error", { userId: req.user.id, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions/start-trial — start 7-day Pro trial for existing users
router.post("/start-trial", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.trial_used) {
      return res.status(400).json({ error: "Ai folosit deja perioada de proba gratuita." });
    }

    if (user.subscription_plan !== "free") {
      return res.status(400).json({ error: "Ai deja un abonament activ." });
    }

    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    user.subscription_plan = "pro";
    user.trial_used = true;
    user.trial_expires_at = trialEnd;
    await user.save();

    await Subscription.create({
      user_id: req.user.id,
      plan: "pro",
      status: "active",
      checkout_session_id: `trial_${req.user.id}`,
      current_period_start: new Date(),
      current_period_end: trialEnd,
    });

    logger.info("Pro trial started", { userId: req.user.id, expiresAt: trialEnd });
    res.json({
      success: true,
      plan: "pro",
      trial_expires_at: trialEnd,
      days_remaining: 7,
      message: "Perioada de proba Pro (7 zile) activata cu succes!",
    });
  } catch (err) {
    logger.error("Start trial error", { userId: req.user.id, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions/checkout — create checkout session for plan upgrade
router.post("/checkout", auth, async (req, res) => {
  try {
    const { plan, origin_url } = req.body;

    if (!plan || !PLANS[plan]) {
      return res.status(400).json({ error: "Plan invalid" });
    }

    if (plan === "free") {
      return res.status(400).json({ error: "Planul Free nu necesita plata" });
    }

    const planData = PLANS[plan];

    if (!stripe) {
      // Simulated mode — instantly upgrade
      const sessionId = `sim_sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await Subscription.create({
        user_id: req.user.id,
        plan,
        status: "active",
        checkout_session_id: sessionId,
        current_period_start: new Date(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      await User.findByIdAndUpdate(req.user.id, { subscription_plan: plan });

      await PaymentTransaction.create({
        session_id: sessionId,
        user_id: req.user.id,
        type: "subscription",
        amount: planData.price,
        currency: "ron",
        payment_status: "paid",
        plan,
        metadata: { simulated: true },
      });

      logger.info("Simulated subscription created", { userId: req.user.id, plan });

      return res.json({
        simulated: true,
        session_id: sessionId,
        plan,
        message: `Plan ${planData.name} activat (mod demo). Configureaza Stripe pentru plati reale.`,
      });
    }

    // Real Stripe checkout
    const baseUrl = origin_url || process.env.CLIENT_URL;
    const successUrl = `${baseUrl}?subscription_success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}?subscription_cancelled=true`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "ron",
            product_data: {
              name: `ConnectJob ${planData.name}`,
              description: planData.features.join(", "),
            },
            unit_amount: Math.round(planData.price * 100),
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: String(req.user.id),
        plan,
      },
    });

    await PaymentTransaction.create({
      session_id: session.id,
      user_id: req.user.id,
      type: "subscription",
      amount: planData.price,
      currency: "ron",
      payment_status: "initiated",
      plan,
      metadata: { stripe_session_id: session.id },
    });

    logger.info("Stripe subscription checkout created", {
      userId: req.user.id,
      plan,
      sessionId: session.id,
    });

    res.json({
      url: session.url,
      session_id: session.id,
    });
  } catch (err) {
    logger.error("Subscription checkout error", { userId: req.user.id, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/subscriptions/checkout/status/:sessionId — poll checkout status
router.get("/checkout/status/:sessionId", auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const tx = await PaymentTransaction.findOne({ session_id: sessionId }).lean({ virtuals: true });
    if (!tx) return res.status(404).json({ error: "Sesiune negasita" });

    if (String(tx.user_id) !== String(req.user.id)) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    // If already processed, return cached status
    if (tx.payment_status === "paid") {
      return res.json({ status: "complete", payment_status: "paid", plan: tx.plan });
    }

    // If simulated, return immediately
    if (sessionId.startsWith("sim_")) {
      return res.json({ status: "complete", payment_status: "paid", plan: tx.plan });
    }

    // Poll Stripe for real status
    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === "paid" && tx.payment_status !== "paid") {
          // Update transaction
          await PaymentTransaction.findOneAndUpdate(
            { session_id: sessionId },
            { payment_status: "paid" }
          );

          // Activate subscription
          await Subscription.findOneAndUpdate(
            { checkout_session_id: sessionId },
            { status: "active" },
            { upsert: false }
          ) || await Subscription.create({
            user_id: req.user.id,
            plan: tx.plan,
            status: "active",
            checkout_session_id: sessionId,
            stripe_subscription_id: session.subscription || "",
            current_period_start: new Date(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          });

          await User.findByIdAndUpdate(req.user.id, { subscription_plan: tx.plan });

          return res.json({ status: "complete", payment_status: "paid", plan: tx.plan });
        }

        if (session.status === "expired") {
          await PaymentTransaction.findOneAndUpdate(
            { session_id: sessionId },
            { payment_status: "expired" }
          );
          return res.json({ status: "expired", payment_status: "expired" });
        }

        return res.json({ status: session.status, payment_status: session.payment_status });
      } catch (stripeErr) {
        logger.error("Stripe session check error", { error: stripeErr.message });
      }
    }

    res.json({ status: tx.payment_status, payment_status: tx.payment_status, plan: tx.plan });
  } catch (err) {
    logger.error("Checkout status error", { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions/cancel — cancel subscription
router.post("/cancel", auth, async (req, res) => {
  try {
    const sub = await Subscription.findOne({
      user_id: req.user.id,
      status: "active",
    });

    if (!sub) {
      return res.status(400).json({ error: "Nu ai un abonament activ" });
    }

    // If Stripe sub, cancel there
    if (stripe && sub.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(sub.stripe_subscription_id);
      } catch (stripeErr) {
        logger.error("Stripe cancel error", { error: stripeErr.message });
      }
    }

    sub.status = "cancelled";
    sub.cancelled_at = new Date();
    await sub.save();

    await User.findByIdAndUpdate(req.user.id, { subscription_plan: "free" });

    logger.info("Subscription cancelled", { userId: req.user.id });
    res.json({ success: true, message: "Abonament anulat. Ai fost trecut pe planul Free." });
  } catch (err) {
    logger.error("Cancel subscription error", { userId: req.user.id, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions/connect/onboard — start Stripe Connect onboarding for workers
router.post("/connect/onboard", auth, async (req, res) => {
  try {
    const { origin_url } = req.body;
    const user = await User.findById(req.user.id);

    if (!stripe) {
      // Simulated mode
      const fakeAccountId = `acct_sim_${Date.now()}`;
      user.stripe_connect_account_id = fakeAccountId;
      user.connect_onboarding_complete = true;
      await user.save();

      logger.info("Simulated Connect onboarding", { userId: req.user.id });
      return res.json({
        simulated: true,
        message: "Cont Connect simulat creat. Configureaza Stripe pentru contul real.",
      });
    }

    // Create or retrieve Connect account
    let accountId = user.stripe_connect_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "standard",
        email: user.email,
        metadata: { user_id: String(user.id) },
      });
      accountId = account.id;
      user.stripe_connect_account_id = accountId;
      await user.save();
    }

    const baseUrl = origin_url || process.env.CLIENT_URL;
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}?connect_refresh=true`,
      return_url: `${baseUrl}?connect_complete=true`,
      type: "account_onboarding",
    });

    res.json({ url: accountLink.url });
  } catch (err) {
    logger.error("Connect onboarding error", { userId: req.user.id, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/subscriptions/connect/status — check Connect status
router.get("/connect/status", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();

    if (!user.stripe_connect_account_id) {
      return res.json({ connected: false, onboarding_complete: false });
    }

    if (!stripe) {
      return res.json({
        connected: true,
        onboarding_complete: user.connect_onboarding_complete || false,
        simulated: true,
      });
    }

    try {
      const account = await stripe.accounts.retrieve(user.stripe_connect_account_id);
      const complete = account.charges_enabled && account.payouts_enabled;

      if (complete !== user.connect_onboarding_complete) {
        await User.findByIdAndUpdate(req.user.id, {
          connect_onboarding_complete: complete,
        });
      }

      return res.json({
        connected: true,
        onboarding_complete: complete,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      });
    } catch (stripeErr) {
      return res.json({
        connected: true,
        onboarding_complete: user.connect_onboarding_complete,
        error: stripeErr.message,
      });
    }
  } catch (err) {
    logger.error("Connect status error", { userId: req.user.id, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Export PLANS for use in other modules
router.PLANS = PLANS;

module.exports = router;
