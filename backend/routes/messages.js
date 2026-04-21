const express = require("express");
const db = require("../db/database");
const auth = require("../middleware/auth");
const logger = require("../utils/logger");
const {
  messageValidator,
  createConversationValidator,
  mongoIdValidator,
} = require("../utils/validators");
const { sendPushNotification, notifications } = require("../utils/pushService");
const { moderateMessage, applyStrike, isUserBanned } = require("../utils/chatModerationService");
const User = require("../models/User");

const router = express.Router();

// GET /api/messages/conversations
router.get("/conversations", auth, async (req, res) => {
  try {
    res.json(await db.getUserConversations(req.user.id));
  } catch (err) {
    logger.error("Get conversations error", {
      userId: req.user.id,
      error: err.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/conversations/:id
router.get(
  "/conversations/:id",
  auth,
  mongoIdValidator(),
  async (req, res) => {
    try {
      const conv = await db.findConversationById(req.params.id);
      if (!conv) return res.status(404).json({ error: "Conversatie negasita" });
      if (
        String(conv.user1_id) !== String(req.user.id) &&
        String(conv.user2_id) !== String(req.user.id)
      )
        return res.status(403).json({ error: "Acces interzis" });
      res.json(await db.getConversationMessages(req.params.id, req.user.id));
    } catch (err) {
      logger.error("Get conversation error", {
        conversationId: req.params.id,
        error: err.message,
      });
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/messages/conversations
router.post(
  "/conversations",
  auth,
  createConversationValidator,
  async (req, res) => {
    try {
      const { other_user_id, job_id } = req.body;
      const conv = await db.findOrCreateConversation(
        req.user.id,
        other_user_id,
        job_id || null
      );
      logger.info("Conversation created/found", {
        conversationId: conv.id,
        userId: req.user.id,
      });
      res.json({ id: conv.id });
    } catch (err) {
      logger.error("Create conversation error", {
        userId: req.user.id,
        error: err.message,
      });
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/messages/conversations/:id/send
router.post(
  "/conversations/:id/send",
  auth,
  mongoIdValidator(),
  messageValidator,
  async (req, res) => {
    try {
      const { text, attachment } = req.body;
      const conv = await db.findConversationById(req.params.id);
      if (!conv) return res.status(404).json({ error: "Conversatie negasita" });
      if (
        String(conv.user1_id) !== String(req.user.id) &&
        String(conv.user2_id) !== String(req.user.id)
      )
        return res.status(403).json({ error: "Acces interzis" });

      // Chat moderation — check text for contact info sharing / evasion (AI-powered)
      if (text && text.trim()) {
        const sender = await User.findById(req.user.id).lean();

        // First: check if user is currently banned from chat
        const banStatus = isUserBanned(sender);
        if (banStatus.banned) {
          return res.status(403).json({
            error: banStatus.permanent
              ? "Tu cuenta ha sido suspendida permanentemente por evadir la plataforma."
              : `Tu cuenta está temporalmente suspendida hasta ${new Date(banStatus.until).toLocaleString("es-ES")}.`,
            moderation: true,
            banned: true,
            permanent: banStatus.permanent,
          });
        }

        const modResult = await moderateMessage(text.trim(), sender?.subscription_plan || "free");
        if (!modResult.allowed) {
          // Apply strike
          const strike = await applyStrike(req.user.id, modResult.category);
          return res.status(403).json({
            error: modResult.reason,
            moderation: true,
            category: modResult.category,
            strike: {
              count: strike.strikes,
              banned: strike.banned,
              permanent: strike.permanent,
              banUntil: strike.banUntil,
            },
          });
        }
      }

      const msgData = {
        conversation_id: req.params.id,
        sender_id: req.user.id,
        text: (text || "").trim(),
      };
      if (attachment?.url) {
        msgData.attachment = {
          url: attachment.url,
          type: attachment.type || "image",
          name: attachment.name || "",
          size: attachment.size || 0,
          mimetype: attachment.mimetype || "",
        };
      }

      const msg = await db.createMessage(msgData);

      // Send push notification to recipient
      try {
        const senderUser = await User.findById(req.user.id).lean();
        const recipientId = String(conv.user1_id) === String(req.user.id)
          ? conv.user2_id
          : conv.user1_id;

        const notifPayload = notifications.newMessage(
          senderUser.name,
          text.trim(),
          req.params.id
        );
        await sendPushNotification(recipientId, notifPayload);
      } catch (notifErr) {
        logger.error("Message notification error", { error: notifErr.message });
      }

      logger.debug("Message sent", {
        conversationId: req.params.id,
        senderId: req.user.id,
      });
      res.json(msg);
    } catch (err) {
      console.error("Send message error stack:", err);
      logger.error("Send message error", {
        conversationId: req.params.id,
        error: err.message,
      });
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
