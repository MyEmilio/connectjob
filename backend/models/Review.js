const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  reviewer_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  target_id:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  job_id:      { type: mongoose.Schema.Types.ObjectId, ref: "Job",  default: null },
  rating:      { type: Number, required: true, min: 1, max: 5 },
  text:        { type: String, default: "" },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

reviewSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => { delete obj._id; delete obj.__v; return obj; },
});

module.exports = mongoose.model("Review", reviewSchema);
