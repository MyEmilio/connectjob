const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    job_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    payer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    payee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Suma este obligatorie"],
      min: [0.01, "Suma minima este 0.01"],
      max: [100000, "Suma maxima este 100000"],
    },
    commission: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "held", "released", "disputed", "refunded", "failed"],
        message: "Status invalid",
      },
      default: "pending",
    },
    stripe_pi_id: {
      type: String,
      default: "",
      index: true,
    },
    method: {
      type: String,
      enum: {
        values: ["card", "transfer"],
        message: "Metoda de plata invalida",
      },
      default: "card",
    },
    released_at: { type: Date },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Indexes
paymentSchema.index({ payer_id: 1, created_at: -1 });
paymentSchema.index({ payee_id: 1, created_at: -1 });
paymentSchema.index({ status: 1, created_at: -1 });

paymentSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => {
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model("Payment", paymentSchema);
