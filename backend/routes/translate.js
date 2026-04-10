const express = require("express");
const router = express.Router();
const { translateText, detectLanguage, isTranslationConfigured } = require("../utils/translationService");
const authMiddleware = require("../middleware/auth");

// POST /api/translate — traduce text în limba utilizatorului
router.post("/", authMiddleware, async (req, res) => {
  const { text, target_lang, source_lang } = req.body;
  if (!text || !target_lang) return res.status(400).json({ error: "text and target_lang required" });

  const detected = source_lang || detectLanguage(text);
  if (detected === target_lang) {
    return res.json({ translated: text, source_lang: detected, target_lang, same_language: true });
  }

  const translated = await translateText(text, target_lang, detected);
  res.json({ translated, source_lang: detected, target_lang, same_language: false });
});

// POST /api/translate/batch — traduce mai multe mesaje
router.post("/batch", authMiddleware, async (req, res) => {
  const { messages, target_lang } = req.body;
  if (!messages?.length || !target_lang) return res.status(400).json({ error: "messages and target_lang required" });

  const results = await Promise.all(
    messages.map(async (msg) => {
      const detected = detectLanguage(msg.text);
      if (detected === target_lang) {
        return { id: msg.id, translated: msg.text, source_lang: detected, same_language: true };
      }
      const translated = await translateText(msg.text, target_lang, detected);
      return { id: msg.id, translated, source_lang: detected, same_language: false };
    })
  );
  res.json(results);
});

// GET /api/translate/status — starea serviciului
router.get("/status", (req, res) => {
  res.json({ configured: isTranslationConfigured(), model: "gpt-4o-mini", languages: 11 });
});

module.exports = router;
