const mongoose = require("mongoose");

const providerProfileSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    stripe_connect_account_id: { type: String, default: "" },
    connect_onboarding_complete: { type: Boolean, default: false },
    business_name: { type: String, default: "", maxlength: 200 },
    service_categories: { type: [String], default: [] },
    hourly_rate: { type: Number, default: 0, min: 0 },
    availability: {
      type: String,
      enum: ["full_time", "part_time", "weekends", "flexible"],
      default: "flexible",
    },
    total_earnings: { type: Number, default: 0, min: 0 },
    completed_jobs: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

providerProfileSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => {
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model("ProviderProfile", providerProfileSchema);
