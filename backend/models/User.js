const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Numele este obligatoriu"],
      maxlength: [100, "Numele poate avea maxim 100 caractere"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email-ul este obligatoriu"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Format email invalid"],
    },
    password: {
      type: String,
      default: "",
    },
    google_id: { type: String, default: "" },
    role: {
      type: String,
      enum: {
        values: ["worker", "employer", "admin"],
        message: "Rol invalid",
      },
      default: "worker",
    },
    initials: {
      type: String,
      default: "",
      maxlength: 5,
    },
    phone: {
      type: String,
      default: "",
      maxlength: 20,
    },
    bio: {
      type: String,
      default: "",
      maxlength: [500, "Bio poate avea maxim 500 caractere"],
    },
    skills: { type: [String], default: [] },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviews_count: { type: Number, default: 0, min: 0 },
    verified: { type: Boolean, default: false },
    email_verified: { type: Boolean, default: false },
    avatar: { type: String, default: "", maxlength: 500 },
    status: {
      type: String,
      enum: {
        values: ["active", "suspended", "banned"],
        message: "Status invalid",
      },
      default: "active",
    },
    warnings_count: { type: Number, default: 0, min: 0 },
    blocked_users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Subscription & Stripe
    subscription_plan: {
      type: String,
      enum: ["free", "pro", "premium"],
      default: "free",
    },
    stripe_customer_id: { type: String, default: "" },
    stripe_connect_account_id: { type: String, default: "" },
    connect_onboarding_complete: { type: Boolean, default: false },
    // Trial
    trial_used: { type: Boolean, default: false },
    trial_expires_at: { type: Date, default: null },
    daily_applications: { type: Number, default: 0, min: 0 },
    daily_applications_reset: { type: Date, default: Date.now },
    // Notification preferences
    favorite_categories: { type: [String], default: [] },
    push_subscription: { type: mongoose.Schema.Types.Mixed, default: null },
    notify_new_jobs: { type: Boolean, default: true },
    notify_messages: { type: Boolean, default: true },
    notify_applications: { type: Boolean, default: true },
    // Online presence — touched by auth middleware (throttled ~60s)
    last_seen: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });
userSchema.index({ last_seen: -1 });

userSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => {
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model("User", userSchema);
