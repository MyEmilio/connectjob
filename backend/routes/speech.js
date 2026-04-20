const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const auth = require("../middleware/auth");
const logger = require("../utils/logger");

const router = express.Router();

// In-memory storage — audio is tiny (<1 min) so we stream to Whisper directly
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // Whisper limit
  fileFilter: (req, file, cb) => {
    const allowed = /audio\/(webm|ogg|mp3|mpeg|mp4|wav|m4a|x-m4a)/i;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported audio format"));
  },
});

// POST /api/speech/transcribe — upload audio, return transcribed text
router.post("/transcribe", auth, upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file provided" });

    const apiKey = process.env.EMERGENT_LLM_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "Speech service not configured" });
    }

    const language = (req.body.language || "").slice(0, 5); // e.g. "es", "ro", "en"

    // Build multipart form for Whisper
    const form = new FormData();
    const ext = (req.file.mimetype.split("/")[1] || "webm").split(";")[0];
    form.append("file", req.file.buffer, {
      filename: `audio.${ext}`,
      contentType: req.file.mimetype,
    });
    form.append("model", "whisper-1");
    form.append("response_format", "json");
    form.append("temperature", "0");
    if (language) form.append("language", language);

    // Try Emergent proxy first (same pattern as chat completions), fallback to OpenAI direct
    const endpoints = [
      "https://integrations.emergentagent.com/llm/audio/transcriptions",
      "https://api.openai.com/v1/audio/transcriptions",
    ];

    let text = null, lastErr = null;
    for (const url of endpoints) {
      try {
        const r = await axios.post(url, form, {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 30000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });
        text = r.data?.text || r.data?.transcript || "";
        if (text) break;
      } catch (e) {
        lastErr = e;
        logger.warn(`Whisper ${url} failed: ${e.response?.status || e.message}`);
      }
    }

    if (!text) {
      return res.status(502).json({
        error: "Transcription failed",
        detail: lastErr?.response?.data?.error?.message || lastErr?.message,
      });
    }

    res.json({ text: text.trim(), language: language || null });
  } catch (err) {
    logger.error("Speech transcribe error:", err.message);
    res.status(500).json({ error: err.message || "Transcription error" });
  }
});

module.exports = router;
