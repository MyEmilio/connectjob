const mongoose = require("mongoose");

const paymentTransactionSchema = new mongoose.Schema(
  {
    session_id: { type: String, required: true, unique: true, index: true },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["subscription", "job_payment", "connect_payout"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "ron" },
    payment_status: {
      type: String,
      enum: ["initiated", "pending", "paid", "failed", "expired", "refunded"],
      default: "initiated",
    },
    plan: { type: String, enum: ["free", "pro", "premium", ""], default: "" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

paymentTransactionSchema.index({ user_id: 1, created_at: -1 });
paymentTransactionSchema.index({ payment_status: 1 });

paymentTransactionSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => {
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model("PaymentTransaction", paymentTransactionSchema);
