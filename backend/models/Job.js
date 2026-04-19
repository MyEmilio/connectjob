const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: "" },
  category:    { type: String, default: "" },
  salary:      { type: Number, required: true },
  type:        { type: String, enum: ["part-time", "full-time"], default: "part-time" },
  urgent:        { type: Boolean, default: false },
  active:        { type: Boolean, default: true },
  promoted:      { type: Boolean, default: false },
  second_job:    { type: Boolean, default: false },
  work_duration: { type: String, enum: ["ore", "zile", "permanent"], default: "zile" },
  lat:         { type: Number },
  lng:         { type: Number },
  skills:      { type: [String], default: [] },
  icon:        { type: String, default: "💼" },
  color:       { type: String, default: "#059669" },
  images:      { type: [String], default: [] },
  employer_id:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  selected_worker_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  status: {
    type: String,
    enum: ["draft", "published", "in_discussion", "provider_chosen", "in_progress", "completed", "cancelled", "dispute"],
    default: "published",
  },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

jobSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => { delete obj._id; delete obj.__v; return obj; },
});

module.exports = mongoose.model("Job", jobSchema);
