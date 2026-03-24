import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../i18n/index";

const T = { border:"#e7e5e4", text:"#1c1917", text2:"#57534e", green:"#059669", bg:"#fafaf9" };

export default function LanguageSwitcher() {
  const { i18n } = useTranslation("t");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  // Inchide dropdown-ul la click afara
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position:"relative" }}>
      {/* Buton principal */}
      <button onClick={() => setOpen(o => !o)} style={{
        display:"flex", alignItems:"center", gap:6, padding:"6px 12px",
        borderRadius:10, border:`1.5px solid ${T.border}`, background:"#fff",
        cursor:"pointer", fontSize:13, fontWeight:600, color:T.text,
        transition:"all 0.15s",
      }}>
        <span style={{ fontSize:16 }}>{current.flag}</span>
        <span style={{ maxWidth:60, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{current.label}</span>
        <span style={{ fontSize:10, color:T.text2, marginLeft:2 }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 6px)", right:0,
          background:"#fff", border:`1.5px solid ${T.border}`,
          borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,0.12)",
          zIndex:9999, minWidth:180, overflow:"hidden",
          animation:"fadeIn 0.15s ease",
        }}>
          {LANGUAGES.map(lang => (
            <div
              key={lang.code}
              onClick={() => select(lang.code)}
              style={{
                display:"flex", alignItems:"center", gap:10, padding:"9px 14px",
                cursor:"pointer",
                background: lang.code === i18n.language ? `${T.green}10` : "transparent",
                borderLeft: lang.code === i18n.language ? `3px solid ${T.green}` : "3px solid transparent",
                transition:"all 0.1s",
              }}
              onMouseEnter={e => { if (lang.code !== i18n.language) e.currentTarget.style.background = T.bg; }}
              onMouseLeave={e => { if (lang.code !== i18n.language) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize:18 }}>{lang.flag}</span>
              <span style={{
                fontSize:13, fontWeight: lang.code === i18n.language ? 700 : 500,
                color: lang.code === i18n.language ? T.green : T.text,
              }}>
                {lang.label}
              </span>
              {lang.code === i18n.language && (
                <span style={{ marginLeft:"auto", color:T.green, fontSize:12 }}>✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
