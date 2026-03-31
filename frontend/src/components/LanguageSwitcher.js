import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../i18n/index";

const T = { border:"#e7e5e4", text:"#1c1917", text2:"#57534e", green:"#059669", bg:"#fafaf9" };

export default function LanguageSwitcher() {
  const { i18n } = useTranslation("t");
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top:0, right:0 });
  const btnRef = useRef(null);

  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setOpen(o => !o);
  };

  // Inchide la click oriunde in afara butonului
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    // timeout mic ca sa nu se inchida imediat la deschidere
    const timer = setTimeout(() => document.addEventListener("click", close), 10);
    return () => { clearTimeout(timer); document.removeEventListener("click", close); };
  }, [open]);

  const select = (code, e) => {
    e.stopPropagation(); // opreste inchiderea prin document click
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div style={{ position:"relative" }}>
      <button ref={btnRef} onClick={handleOpen} style={{
        display:"flex", alignItems:"center", gap:6, padding:"6px 12px",
        borderRadius:10, border:`1.5px solid ${T.border}`, background:"#fff",
        cursor:"pointer", fontSize:13, fontWeight:600, color:T.text,
        transition:"all 0.15s",
      }}>
        <span style={{ fontSize:16 }}>{current.flag}</span>
        <span style={{ maxWidth:60, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{current.label}</span>
        <span style={{ fontSize:10, color:T.text2, marginLeft:2 }}>{open ? "▲" : "▼"}</span>
      </button>

      {/* Dropdown — position:fixed ca sa nu fie taiat de harta Leaflet */}
      {open && (
        <div style={{
          position:"fixed",
          top: dropPos.top,
          right: dropPos.right,
          background:"#fff", border:`1.5px solid ${T.border}`,
          borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,0.18)",
          zIndex:99999, minWidth:190,
          maxHeight:"calc(100vh - 80px)", overflowY:"auto",
          animation:"fadeIn 0.15s ease",
        }}>
          {LANGUAGES.map(lang => (
            <div
              key={lang.code}
              onClick={(e) => select(lang.code, e)}
              style={{
                display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
                cursor:"pointer",
                background: lang.code === i18n.language ? `${T.green}10` : "transparent",
                borderLeft: lang.code === i18n.language ? `3px solid ${T.green}` : "3px solid transparent",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = lang.code === i18n.language ? `${T.green}10` : T.bg; }}
              onMouseLeave={e => { e.currentTarget.style.background = lang.code === i18n.language ? `${T.green}10` : "transparent"; }}
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
