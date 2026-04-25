// Standalone Stripe webhook handler.
// Mounted directly on the Express app BEFORE express.json() so we receive
// the raw Buffer that stripe.webhooks.constructEvent() requires for
// signature verification.
const logger = require("../utils/logger");

let stripe;
try {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
  if (key && !key.includes("ADAUGA") && key !== "sk_test_emergent") {
    stripe = require("stripe")(key);
  }
} catch {}

module.exports = async function stripeWebhookHandler(req, res) {
  if (!stripe) {
    logger.warn("Webhook hit but Stripe not configured");
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
    logger.error("Webhook signature verification failed", { error: err.message });
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  logger.info("Stripe webhook received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const Payment = require("../models/Payment");
        const payment = await Payment.findOne({ stripe_pi_id: paymentIntent.id });
        if (payment) {
          payment.status = "held";
          await payment.save();
          logger.info("Payment intent succeeded", { paymentId: payment.id, stripeId: paymentIntent.id });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        const Payment = require("../models/Payment");
        const payment = await Payment.findOne({ stripe_pi_id: paymentIntent.id });
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
        const payment = await Payment.findOne({ stripe_pi_id: dispute.payment_intent });
        if (payment) {
          payment.status = "disputed";
          await payment.save();
          logger.warn("Charge dispute created", { paymentId: payment.id, disputeId: dispute.id });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const Subscription = require("../models/Subscription");
        const existingSub = await Subscription.findOne({ stripe_subscription_id: sub.id });
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
    logger.error("Webhook handler error", { type: event.type, error: err.message });
  }

  res.json({ received: true });
};
