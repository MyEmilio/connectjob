const mongoose = require("mongoose");

const contractSchema = new mongoose.Schema(
  {
    job_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    worker_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    employer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      default: "",
      maxlength: [10000, "Contractul poate avea maxim 10000 caractere"],
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "signed_worker", "signed_employer", "signed_both"],
        message: "Status invalid",
      },
      default: "pending",
    },
    worker_sig: {
      type: String,
      default: "",
      maxlength: 500,
    },
    employer_sig: {
      type: String,
      default: "",
      maxlength: 500,
    },
    signed_at: { type: Date },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Indexes
contractSchema.index({ worker_id: 1, created_at: -1 });
contractSchema.index({ employer_id: 1, created_at: -1 });
contractSchema.index({ status: 1 });

contractSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => {
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model("Contract", contractSchema);
