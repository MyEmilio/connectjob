const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  reporter_id:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reported_user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message_id:       { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
  reason:           { type: String, enum: ["limbaj_ofensiv", "rasism", "hartuire", "spam", "frauda", "altele"], required: true },
  details:          { type: String, default: "" },
  status:           { type: String, enum: ["pending", "reviewed", "actioned", "dismissed"], default: "pending" },
  action_taken:     { type: String, default: "" },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

reportSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => { delete obj._id; delete obj.__v; return obj; },
});

module.exports = mongoose.model("Report", reportSchema);
