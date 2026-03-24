const express = require("express");
const db      = require("../db/database");
const auth    = require("../middleware/auth");

const router = express.Router();

// GET /api/messages/conversations
router.get("/conversations", auth, (req, res) => {
  res.json(db.getUserConversations(req.user.id));
});

// GET /api/messages/conversations/:id
router.get("/conversations/:id", auth, (req, res) => {
  const conv = db.findConversationById(parseInt(req.params.id));
  if (!conv) return res.status(404).json({ error: "Conversatie negasita" });
  if (conv.user1_id !== req.user.id && conv.user2_id !== req.user.id)
    return res.status(403).json({ error: "Acces interzis" });
  res.json(db.getConversationMessages(parseInt(req.params.id), req.user.id));
});

// POST /api/messages/conversations
router.post("/conversations", auth, (req, res) => {
  const { other_user_id, job_id } = req.body;
  if (!other_user_id) return res.status(400).json({ error: "other_user_id lipsa" });
  const conv = db.findOrCreateConversation(req.user.id, parseInt(other_user_id), job_id ? parseInt(job_id) : null);
  res.json({ id: conv.id });
});

// POST /api/messages/conversations/:id/send
router.post("/conversations/:id/send", auth, (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Mesaj gol" });
  const conv = db.findConversationById(parseInt(req.params.id));
  if (!conv) return res.status(404).json({ error: "Conversatie negasita" });
  if (conv.user1_id !== req.user.id && conv.user2_id !== req.user.id)
    return res.status(403).json({ error: "Acces interzis" });
  res.json(db.createMessage({ conversation_id: parseInt(req.params.id), sender_id: req.user.id, text: text.trim() }));
});

module.exports = router;
