const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema({
  user_id:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  token:      { type: String, required: true, unique: true },
  type:       { type: String, enum: ["email_verify", "password_reset"], required: true },
  expires_at: { type: Date, required: true },
  used:       { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at" } });

tokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Token", tokenSchema);
