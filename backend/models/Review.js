const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    reviewer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    target_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    job_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    rating: {
      type: Number,
      required: [true, "Rating-ul este obligatoriu"],
      min: [1, "Rating-ul minim este 1"],
      max: [5, "Rating-ul maxim este 5"],
    },
    text: {
      type: String,
      default: "",
      maxlength: [500, "Comentariul poate avea maxim 500 caractere"],
      trim: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Index for fetching user reviews
reviewSchema.index({ target_id: 1, created_at: -1 });

// Prevent duplicate reviews for same job
reviewSchema.index(
  { reviewer_id: 1, target_id: 1, job_id: 1 },
  { unique: true, sparse: true }
);

reviewSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => {
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model("Review", reviewSchema);
