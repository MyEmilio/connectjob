const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  phone:      { type: String, required: true },
  code:       { type: String, required: true },
  expires_at: { type: Date,   required: true },
  used:       { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at" } });

// Index TTL — MongoDB sterge automat dupa expirare
otpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

otpSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => { delete obj._id; delete obj.__v; return obj; },
});

module.exports = mongoose.model("OtpCode", otpSchema);
