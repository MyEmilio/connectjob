const logger = require("./logger");

// Regex patterns for detecting contact info sharing
const PATTERNS = {
  // Phone numbers: international and local formats
  phone: [
    /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g,
    /\b0\d{9}\b/g, // Romanian format: 0722123456
    /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g,
    /(?:tel|telefon|phone|nr|numar|suna|apel)[\s.:;-]*\+?\d[\d\s.-]{6,}/gi,
  ],
  // Email addresses
  email: [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    /[a-zA-Z0-9._%+-]+\s*(?:\[at\]|@|la)\s*[a-zA-Z0-9.-]+\s*(?:\[dot\]|\.)\s*[a-zA-Z]{2,}/gi,
    /(?:email|mail|scrie-mi)[\s.:;-]*[a-zA-Z0-9._%+-]+@/gi,
  ],
  // URLs and websites
  url: [
    /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi,
    /www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
    /[a-zA-Z0-9.-]+\.(?:com|ro|net|org|eu|io|info|biz)\b/gi,
  ],
  // Social media handles
  social: [
    /(?:facebook|fb|insta|instagram|whatsapp|telegram|viber|tiktok|linkedin|twitter|snap|snapchat)[\s.:;/@-]*[a-zA-Z0-9._]{2,}/gi,
    /@[a-zA-Z0-9._]{3,}/g,
  ],
  // Obfuscation attempts (writing digits as words or splitting)
  obfuscated: [
    /\b(?:zero|unu|doi|trei|patru|cinci|sase|sapte|opt|noua)(?:\s+(?:zero|unu|doi|trei|patru|cinci|sase|sapte|opt|noua)){5,}\b/gi,
    /\d\s+\d\s+\d\s+\d\s+\d\s+\d/g, // spaced digits: 0 7 2 2 1 2 3
  ],
};

// Words/phrases that indicate intent to share contact info
const INTENT_PHRASES = [
  /(?:da-mi|dami|trimite-mi|scrie-mi)\s+(?:numarul|nr|telefonul|emailul|mailul)/gi,
  /(?:contacteaza-ma|suna-ma|scrie-mi)\s+(?:pe|la)\s+/gi,
  /(?:numarul\s+meu|mailul\s+meu|emailul\s+meu)\s+(?:este|e)\s/gi,
];

/**
 * Moderates a message for contact information sharing
 * @param {string} text - The message text to check
 * @param {string} userPlan - The user's subscription plan
 * @returns {{ allowed: boolean, reason: string|null, category: string|null }}
 */
function moderateMessage(text, userPlan = "free") {
  // Premium users bypass moderation
  if (userPlan === "premium") {
    return { allowed: true, reason: null, category: null };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return { allowed: true, reason: null, category: null };
  }

  // Check each pattern category
  for (const [category, patterns] of Object.entries(PATTERNS)) {
    for (const pattern of patterns) {
      // Reset lastIndex for global regexes
      pattern.lastIndex = 0;
      if (pattern.test(trimmed)) {
        logger.info("Chat moderation blocked message", {
          category,
          textPreview: trimmed.substring(0, 50),
        });
        return {
          allowed: false,
          reason: getBlockReason(category),
          category,
        };
      }
    }
  }

  // Check intent phrases (only for free users)
  if (userPlan === "free") {
    for (const pattern of INTENT_PHRASES) {
      pattern.lastIndex = 0;
      if (pattern.test(trimmed)) {
        return {
          allowed: false,
          reason: "Partajarea datelor de contact nu este permisa in planul Free. Upgrade la Pro sau Premium pentru a comunica liber.",
          category: "intent",
        };
      }
    }
  }

  return { allowed: true, reason: null, category: null };
}

function getBlockReason(category) {
  const reasons = {
    phone: "Numere de telefon nu sunt permise in chat. Foloseste sistemul de plata integrat pentru siguranta ta.",
    email: "Adresele de email nu sunt permise in chat. Comunicarea ramane sigura prin platforma.",
    url: "Link-urile externe nu sunt permise in chat. Toate tranzactiile trebuie sa ramana pe platforma.",
    social: "Conturile de social media nu sunt permise in chat. Protejeaza-ti datele personale.",
    obfuscated: "Mesajul pare sa contina informatii de contact ascunse. Te rugam sa folosesti platforma pentru comunicare.",
  };
  return reasons[category] || "Mesajul contine informatii de contact care nu sunt permise.";
}

module.exports = { moderateMessage };
