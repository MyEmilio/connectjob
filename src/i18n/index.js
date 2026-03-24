import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import es from "./locales/es";
import ca from "./locales/ca";
import en from "./locales/en";
import fr from "./locales/fr";
import de from "./locales/de";
import pt from "./locales/pt";
import it from "./locales/it";
import nl from "./locales/nl";
import ru from "./locales/ru";
import ro from "./locales/ro";
import ar from "./locales/ar";

export const LANGUAGES = [
  { code:"es", label:"Español",    flag:"🇪🇸", rtl:false },
  { code:"ca", label:"Català",     flag:"🏴󠁥󠁳󠁣󠁴󠁿", rtl:false },
  { code:"en", label:"English",    flag:"🇬🇧", rtl:false },
  { code:"fr", label:"Français",   flag:"🇫🇷", rtl:false },
  { code:"de", label:"Deutsch",    flag:"🇩🇪", rtl:false },
  { code:"pt", label:"Português",  flag:"🇵🇹", rtl:false },
  { code:"it", label:"Italiano",   flag:"🇮🇹", rtl:false },
  { code:"nl", label:"Nederlands", flag:"🇳🇱", rtl:false },
  { code:"ru", label:"Русский",    flag:"🇷🇺", rtl:false },
  { code:"ro", label:"Română",     flag:"🇷🇴", rtl:false },
  { code:"ar", label:"العربية",    flag:"🇸🇦", rtl:true  },
];

const resources = { es:{t:es}, ca:{t:ca}, en:{t:en}, fr:{t:fr}, de:{t:de}, pt:{t:pt}, it:{t:it}, nl:{t:nl}, ru:{t:ru}, ro:{t:ro}, ar:{t:ar} };

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    ns: ["t"],
    defaultNS: "t",
    fallbackLng: "es",          // Spaniola — limba principala
    lng: localStorage.getItem("jc_lang") || "es",
    interpolation: { escapeValue: false },
    detection: { order: ["localStorage"], lookupLocalStorage: "jc_lang" },
  });

// Aplica directia RTL pt araba
i18n.on("languageChanged", (lng) => {
  const isRtl = LANGUAGES.find(l => l.code === lng)?.rtl || false;
  document.documentElement.setAttribute("dir", isRtl ? "rtl" : "ltr");
  document.documentElement.setAttribute("lang", lng);
  localStorage.setItem("jc_lang", lng);
});

// Seteaza directia la pornire
const initialLang = localStorage.getItem("jc_lang") || "es";
const initialRtl  = LANGUAGES.find(l => l.code === initialLang)?.rtl || false;
document.documentElement.setAttribute("dir", initialRtl ? "rtl" : "ltr");
document.documentElement.setAttribute("lang", initialLang);

export default i18n;
