const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  job_id:       { type: mongoose.Schema.Types.ObjectId, ref: "Job",  required: true },
  payer_id:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  payee_id:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount:       { type: Number, required: true },
  commission:   { type: Number, required: true },
  status:       { type: String, enum: ["pending", "held", "released", "disputed", "refunded"], default: "pending" },
  stripe_pi_id: { type: String, default: "" },
  method:       { type: String, default: "card" },
  released_at:  { type: Date },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

paymentSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => { delete obj._id; delete obj.__v; return obj; },
});

module.exports = mongoose.model("Payment", paymentSchema);
