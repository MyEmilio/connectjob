const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reported_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    reason: {
      type: String,
      enum: {
        values: [
          "limbaj_ofensiv",
          "rasism",
          "hartuire",
          "spam",
          "frauda",
          "altele",
        ],
        message: "Motiv de raportare invalid",
      },
      required: [true, "Motivul este obligatoriu"],
    },
    details: {
      type: String,
      default: "",
      maxlength: [1000, "Detaliile pot avea maxim 1000 caractere"],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "reviewed", "actioned", "dismissed"],
        message: "Status invalid",
      },
      default: "pending",
    },
    action_taken: {
      type: String,
      default: "",
      maxlength: 500,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Indexes
reportSchema.index({ status: 1, created_at: -1 });
reportSchema.index({ reported_user_id: 1, created_at: -1 });

reportSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => {
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model("Report", reportSchema);
