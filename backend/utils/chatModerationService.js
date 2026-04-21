const logger = require("./logger");
const axios = require("axios");
const User = require("../models/User");

// ── Fast regex pre-filter (catches obvious cases before hitting LLM) ──
const FAST_PATTERNS = [
  /\+?\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g, // phone numbers
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,              // email
  /https?:\/\/\S+/gi,                                              // urls
  /www\.\S+\.\S+/gi,                                               // www urls
  /\b(?:whatsapp|telegram|viber|instagram|facebook|signal|snap|snapchat)\b[\s:@]+[\w.@]+/gi,
];

const SYSTEM_PROMPT = `You are an expert chat moderator for ConnectJob, a job marketplace.
Your task: detect if a user is trying to share contact info, evade the platform, or propose off-platform payments.
Block messages that:
- Share or request phone numbers (even in words like "siete dos dos cinco" or "șapte doi doi cinci")
- Share or request email addresses (even obfuscated like "nume at gmail punct com")
- Link to external services (WhatsApp, Telegram, Signal, Instagram DMs)
- Propose payment outside the platform (cash, bank transfer, crypto, meeting outside escrow)
- Reveal physical address or meeting point meant to bypass the platform
Allow: normal job discussions, scheduling, skill descriptions, even friendly chat.
Respond ONLY in JSON: {"block": boolean, "category": "phone"|"email"|"url"|"social"|"off_platform_payment"|"address_reveal"|"other"|null, "confidence": 0-1, "reason_short": "spanish text max 100 chars"}`;

const STRIKE_ACTIONS = {
  1: { warn: true, banHours: 0 },     // warning only
  2: { warn: true, banHours: 24 },    // 24h freeze
  3: { warn: true, banHours: 7 * 24 },// 7 days
  4: { warn: true, banHours: -1 },    // permanent
};

/**
 * Moderates a message using fast regex + AI (GPT-4o-mini via Emergent LLM Key)
 * @param {string} text
 * @param {string} userPlan
 * @returns {{ allowed:boolean, reason:string|null, category:string|null, aiChecked:boolean }}
 */
async function moderateMessage(text, userPlan = "free") {
  // Premium users bypass moderation entirely
  if (userPlan === "premium") {
    return { allowed: true, reason: null, category: null, aiChecked: false };
  }

  const trimmed = (text || "").trim();
  if (!trimmed || trimmed.length < 3) {
    return { allowed: true, reason: null, category: null, aiChecked: false };
  }

  // Stage 1: Fast regex pre-filter (blocks 80% of cases instantly, no API cost)
  for (const pattern of FAST_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(trimmed)) {
      logger.info("Chat moderation (regex) blocked message", { textPreview: trimmed.substring(0, 80) });
      return {
        allowed: false,
        reason: "No se permite compartir datos de contacto o enlaces externos en el chat. Usa el sistema de pago integrado para tu seguridad.",
        category: "regex_hit",
        aiChecked: false,
      };
    }
  }

  // Stage 2: AI moderation for nuanced cases (words, obfuscation, intent)
  const apiKey = process.env.EMERGENT_LLM_KEY;
  if (!apiKey) {
    return { allowed: true, reason: null, category: null, aiChecked: false };
  }

  try {
    const endpoint = "https://integrations.emergentagent.com/llm/chat/completions";
    const resp = await axios.post(
      endpoint,
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: trimmed.slice(0, 500) },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
        max_tokens: 150,
      },
      { headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, timeout: 8000 }
    );

    const raw = resp.data?.choices?.[0]?.message?.content || "{}";
    let parsed = {};
    try { parsed = JSON.parse(raw); } catch { /* ignore */ }

    if (parsed.block === true && (parsed.confidence ?? 0) >= 0.6) {
      logger.info("Chat moderation (AI) blocked message", {
        category: parsed.category,
        confidence: parsed.confidence,
        textPreview: trimmed.substring(0, 80),
      });
      return {
        allowed: false,
        reason: parsed.reason_short || "Este mensaje intenta evadir la plataforma. No se permite.",
        category: parsed.category || "ai_blocked",
        aiChecked: true,
      };
    }
    return { allowed: true, reason: null, category: null, aiChecked: true };
  } catch (err) {
    // If AI fails, fail-open (don't block user on infra hiccup)
    logger.warn("AI moderation skipped:", err.message);
    return { allowed: true, reason: null, category: null, aiChecked: false };
  }
}

/**
 * Apply a strike to a user after a moderation hit. Returns the action taken.
 * @param {string} userId
 * @param {string} category - what triggered the strike
 * @returns {Promise<{strikes:number, banUntil:Date|null, banned:boolean, permanent:boolean}>}
 */
async function applyStrike(userId, category) {
  const user = await User.findById(userId);
  if (!user) return { strikes: 0, banUntil: null, banned: false, permanent: false };

  const now = new Date();
  user.moderation_strikes = (user.moderation_strikes || 0) + 1;
  user.moderation_last_strike_at = now;

  const tier = Math.min(user.moderation_strikes, 4);
  const action = STRIKE_ACTIONS[tier];
  let banned = false, permanent = false;

  if (action.banHours > 0) {
    user.moderation_ban_until = new Date(now.getTime() + action.banHours * 3600 * 1000);
    banned = true;
  } else if (action.banHours === -1) {
    user.moderation_ban_until = new Date("2099-12-31");
    user.status = "banned";
    banned = true;
    permanent = true;
  }

  await user.save();
  logger.warn(`Moderation strike ${tier} applied`, { userId: String(userId), category, banned, permanent });

  return {
    strikes: user.moderation_strikes,
    banUntil: user.moderation_ban_until,
    banned,
    permanent,
  };
}

/**
 * Check if a user is currently banned from sending messages.
 */
function isUserBanned(user) {
  if (!user) return { banned: false };
  if (user.status === "banned") return { banned: true, permanent: true, until: null };
  if (user.moderation_ban_until && new Date(user.moderation_ban_until) > new Date()) {
    return { banned: true, permanent: false, until: user.moderation_ban_until };
  }
  return { banned: false };
}

module.exports = { moderateMessage, applyStrike, isUserBanned };
