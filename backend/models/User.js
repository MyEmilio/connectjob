const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  email:         { type: String, required: true, unique: true, lowercase: true },
  password:      { type: String, required: true },
  role:          { type: String, enum: ["worker", "employer"], default: "worker" },
  initials:      { type: String, default: "" },
  phone:         { type: String, default: "" },
  bio:           { type: String, default: "" },
  skills:        { type: [String], default: [] },
  rating:        { type: Number, default: 0 },
  reviews_count: { type: Number, default: 0 },
  verified:      { type: Boolean, default: false },
  avatar:        { type: String, default: "" },
}, { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } });

userSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => { delete obj._id; delete obj.__v; return obj; },
});

module.exports = mongoose.model("User", userSchema);
