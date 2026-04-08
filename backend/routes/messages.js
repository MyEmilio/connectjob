const express = require("express");
const db = require("../db/database");
const auth = require("../middleware/auth");
const logger = require("../utils/logger");
const {
  messageValidator,
  createConversationValidator,
  mongoIdValidator,
} = require("../utils/validators");

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
      const { text } = req.body;
      const conv = await db.findConversationById(req.params.id);
      if (!conv) return res.status(404).json({ error: "Conversatie negasita" });
      if (
        String(conv.user1_id) !== String(req.user.id) &&
        String(conv.user2_id) !== String(req.user.id)
      )
        return res.status(403).json({ error: "Acces interzis" });
      const msg = await db.createMessage({
        conversation_id: req.params.id,
        sender_id: req.user.id,
        text: text.trim(),
      });
      logger.debug("Message sent", {
        conversationId: req.params.id,
        senderId: req.user.id,
      });
      res.json(msg);
    } catch (err) {
      logger.error("Send message error", {
        conversationId: req.params.id,
        error: err.message,
      });
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
