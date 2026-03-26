const mongoose = require("mongoose");

const contractSchema = new mongoose.Schema({
  job_id:      { type: mongoose.Schema.Types.ObjectId, ref: "Job",  required: true },
  worker_id:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  employer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content:     { type: String, default: "" },
  status:      { type: String, enum: ["pending", "signed_worker", "signed_employer", "signed_both"], default: "pending" },
  worker_sig:  { type: String, default: "" },
  employer_sig:{ type: String, default: "" },
  signed_at:   { type: Date },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

contractSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => { delete obj._id; delete obj.__v; return obj; },
});

module.exports = mongoose.model("Contract", contractSchema);
