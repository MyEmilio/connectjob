const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    user1_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    user2_id: {
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
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Indexes for finding user's conversations
conversationSchema.index({ user1_id: 1, updated_at: -1 });
conversationSchema.index({ user2_id: 1, updated_at: -1 });

conversationSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => {
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model("Conversation", conversationSchema);
