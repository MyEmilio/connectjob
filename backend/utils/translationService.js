const axios = require("axios");
const logger = require("./logger");

const LLM_PROXY = "https://integrations.emergentagent.com/llm/chat/completions";
const LANG_NAMES = {
  ro:"Romanian", en:"English", es:"Spanish", fr:"French", de:"German",
  it:"Italian", pt:"Portuguese", nl:"Dutch", ru:"Russian", ar:"Arabic", ca:"Catalan",
};

const translationCache = new Map();
const MAX_CACHE = 500;

function cacheKey(text, targetLang) {
  return `${targetLang}:${text.slice(0,120)}`;
}

async function translateText(text, targetLang, sourceLang) {
  if (!text || !targetLang) return text;
  if (sourceLang === targetLang) return text;

  const key = cacheKey(text, targetLang);
  if (translationCache.has(key)) return translationCache.get(key);

  const apiKey = process.env.EMERGENT_LLM_KEY;
  if (!apiKey) { logger.warn("EMERGENT_LLM_KEY not set, skipping translation"); return text; }

  try {
    const targetName = LANG_NAMES[targetLang] || targetLang;
    const res = await axios.post(LLM_PROXY, {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `Translate to ${targetName}. Return ONLY the translation. Keep emojis, numbers, names unchanged. If already in ${targetName}, return as-is.` },
        { role: "user", content: text },
      ],
      max_tokens: 500,
      temperature: 0.1,
    }, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      timeout: 10000,
    });

    const translated = res.data.choices?.[0]?.message?.content?.trim();
    if (translated) {
      if (translationCache.size >= MAX_CACHE) {
        const firstKey = translationCache.keys().next().value;
        translationCache.delete(firstKey);
      }
      translationCache.set(key, translated);
      return translated;
    }
    return text;
  } catch (err) {
    logger.error("Translation error", { error: err.message, targetLang });
    return text;
  }
}

function detectLanguage(text) {
  if (!text || text.length < 3) return "en";
  const patterns = {
    ro: /[ăîâșț]/i,
    es: /[ñ¿¡]/,
    fr: /[àâçéèêëïîôùûü]/i,
    de: /[äöüß]/i,
    pt: /[ãõç]/i,
    ru: /[а-яА-ЯёЁ]/,
    ar: /[\u0600-\u06FF]/,
    nl: /\b(de|het|een|van|en|dit|dat)\b/i,
    it: /\b(il|la|di|che|non|con|gli|una)\b/i,
    ca: /\b(el|la|de|que|amb|pel|els|les)\b/i,
  };
  for (const [lang, regex] of Object.entries(patterns)) {
    if (regex.test(text)) return lang;
  }
  return "en";
}

function isTranslationConfigured() {
  return !!process.env.EMERGENT_LLM_KEY;
}

module.exports = { translateText, detectLanguage, isTranslationConfigured, LANG_NAMES };
