const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: {
        values: ["free", "pro", "premium"],
        message: "Plan invalid",
      },
      default: "free",
    },
    status: {
      type: String,
      enum: {
        values: ["active", "cancelled", "past_due", "expired", "pending"],
        message: "Status invalid",
      },
      default: "active",
    },
    stripe_customer_id: { type: String, default: "" },
    stripe_subscription_id: { type: String, default: "" },
    checkout_session_id: { type: String, default: "", index: true },
    current_period_start: { type: Date },
    current_period_end: { type: Date },
    cancelled_at: { type: Date },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

subscriptionSchema.index({ user_id: 1, status: 1 });

subscriptionSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => {
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model("Subscription", subscriptionSchema);
