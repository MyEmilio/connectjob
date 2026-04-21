const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: {
      type: String,
      default: "",
      maxlength: [2000, "Mesajul poate avea maxim 2000 caractere"],
      trim: true,
    },
    read: { type: Boolean, default: false },
    // System messages (platform warnings, info banners) — sender_id is sender but rendered distinctly
    is_system: { type: Boolean, default: false },
    // File attachment
    attachment: {
      url: { type: String, default: "" },
      type: { type: String, enum: ["", "image", "document"], default: "" },
      name: { type: String, default: "" },
      size: { type: Number, default: 0 },
      mimetype: { type: String, default: "" },
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Compound index for conversation messages
messageSchema.index({ conversation_id: 1, created_at: -1 });

// Validate: must have text or attachment
messageSchema.pre("validate", async function () {
  if (!this.text && !this.attachment?.url) {
    this.invalidate("text", "El mensaje debe tener texto o archivo adjunto");
  }
});

messageSchema.set("toJSON", {
  virtuals: true,
  transform: (_, obj) => {
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model("Message", messageSchema);
