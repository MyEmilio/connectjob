const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    job_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    worker_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      default: "",
      maxlength: [1000, "Mesajul poate avea maxim 1000 caractere"],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "accepted", "rejected"],
        message: "Status invalid",
      },
      default: "pending",
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Unique compound index to prevent duplicate applications
applicationSchema.index({ job_id: 1, worker_id: 1 }, { unique: true });

// Index for finding applications by job
applicationSchema.index({ job_id: 1, status: 1 });

// Index for finding user's applications
applicationSchema.index({ worker_id: 1, created_at: -1 });

applicationSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => {
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model("Application", applicationSchema);
