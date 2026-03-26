const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
  user1_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  user2_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  job_id:   { type: mongoose.Schema.Types.ObjectId, ref: "Job",  default: null },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

conversationSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => { delete obj._id; delete obj.__v; return obj; },
});

module.exports = mongoose.model("Conversation", conversationSchema);
