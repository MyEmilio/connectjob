const express = require("express");
const db      = require("../db/database");
const auth    = require("../middleware/auth");

const router = express.Router();

// GET /api/messages/conversations
router.get("/conversations", auth, async (req, res) => {
  try {
    res.json(await db.getUserConversations(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/conversations/:id
router.get("/conversations/:id", auth, async (req, res) => {
  try {
    const conv = await db.findConversationById(req.params.id);
    if (!conv) return res.status(404).json({ error: "Conversatie negasita" });
    if (String(conv.user1_id) !== String(req.user.id) && String(conv.user2_id) !== String(req.user.id))
      return res.status(403).json({ error: "Acces interzis" });
    res.json(await db.getConversationMessages(req.params.id, req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/conversations
router.post("/conversations", auth, async (req, res) => {
  try {
    const { other_user_id, job_id } = req.body;
    if (!other_user_id) return res.status(400).json({ error: "other_user_id lipsa" });
    const conv = await db.findOrCreateConversation(req.user.id, other_user_id, job_id || null);
    res.json({ id: conv.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/conversations/:id/send
router.post("/conversations/:id/send", auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Mesaj gol" });
    const conv = await db.findConversationById(req.params.id);
    if (!conv) return res.status(404).json({ error: "Conversatie negasita" });
    if (String(conv.user1_id) !== String(req.user.id) && String(conv.user2_id) !== String(req.user.id))
      return res.status(403).json({ error: "Acces interzis" });
    res.json(await db.createMessage({ conversation_id: req.params.id, sender_id: req.user.id, text: text.trim() }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
