const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
  job_id:    { type: mongoose.Schema.Types.ObjectId, ref: "Job",  required: true },
  worker_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message:   { type: String, default: "" },
  status:    { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

applicationSchema.index({ job_id: 1, worker_id: 1 }, { unique: true });

applicationSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => { delete obj._id; delete obj.__v; return obj; },
});

module.exports = mongoose.model("Application", applicationSchema);
