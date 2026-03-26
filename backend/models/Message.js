const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  conversation_id: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
  sender_id:       { type: mongoose.Schema.Types.ObjectId, ref: "User",         required: true },
  text:            { type: String, required: true },
  read:            { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

messageSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => { delete obj._id; delete obj.__v; return obj; },
});

module.exports = mongoose.model("Message", messageSchema);
