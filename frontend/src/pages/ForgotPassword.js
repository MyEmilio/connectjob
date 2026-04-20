import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../services/api";

const T = { green:"#059669", greenDark:"#047857", text:"#1c1917", text2:"#57534e", text3:"#a8a29e", border:"#e7e5e4", bg:"#fafaf9", white:"#fff", red:"#ef4444" };

export default function ForgotPassword() {
  const { t } = useTranslation("t");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetUrl, setResetUrl] = useState("");

  const handle = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      setStatus("sent");
      if (res.data.reset_url) setResetUrl(res.data.reset_url);
    } catch (err) {
      setError(err.response?.data?.error || "Eroare la trimitere.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:T.bg, padding:16 }}>
      <div data-testid="forgot-password-page" style={{ background:T.white, borderRadius:20, padding:"36px 32px", maxWidth:420, width:"100%", boxShadow:"0 8px 32px rgba(0,0,0,0.08)", border:`1px solid ${T.border}` }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🔑</div>
          <h2 style={{ fontFamily:"Outfit,sans-serif", fontSize:22, fontWeight:800, color:T.text, margin:"0 0 6px" }}>{t("auth_reset_title")}</h2>
          <p style={{ color:T.text2, fontSize:13 }}>Introdu email-ul și îți trimitem un link de resetare</p>
        </div>

        {status === "sent" ? (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📧</div>
            <p style={{ color:T.text2, fontSize:14, marginBottom:16 }}>Dacă email-ul există în baza de date, vei primi un link de resetare.</p>
            {resetUrl && (
              <div style={{ background:"#f0fdf4", border:"1px solid #86efac", borderRadius:10, padding:12, marginBottom:16 }}>
                <div style={{ fontSize:11, color:T.text3, marginBottom:4 }}>Link de resetare (disponibil și în consolă):</div>
                <a href={resetUrl} data-testid="reset-url-link" style={{ fontSize:12, color:T.green, wordBreak:"break-all" }}>{resetUrl}</a>
              </div>
            )}
            <Link to="/login" style={{ display:"inline-block", padding:"10px 24px", borderRadius:10, background:T.green, color:"#fff", textDecoration:"none", fontWeight:700, fontSize:13 }}>Înapoi la Login</Link>
          </div>
        ) : (
          <form onSubmit={handle}>
            {error && <div style={{ background:"#fef2f2", border:`1px solid ${T.red}33`, borderRadius:10, padding:"10px 14px", marginBottom:16, color:T.red, fontSize:13 }}>⚠️ {error}</div>}
            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:12, fontWeight:700, color:T.text2, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>Email</label>
              <input data-testid="forgot-email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="email@ejemplo.com"
                style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${T.border}`, fontSize:14, outline:"none", boxSizing:"border-box" }}
                onFocus={e=>e.target.style.border=`1.5px solid ${T.green}`}
                onBlur={e=>e.target.style.border=`1.5px solid ${T.border}`}
              />
            </div>
            <button data-testid="forgot-submit-btn" type="submit" disabled={loading} style={{
              width:"100%", padding:"13px", borderRadius:12, border:"none", cursor:loading?"not-allowed":"pointer",
              background:loading?"#d1d5db":`linear-gradient(135deg,${T.green},${T.greenDark})`,
              color:"#fff", fontWeight:700, fontSize:14, marginBottom:16,
            }}>{loading ? t("auth_sending") : `📧 ${t("auth_send_reset")}`}</button>
            <p style={{ textAlign:"center", fontSize:13, color:T.text2, margin:0 }}>
              <Link to="/login" style={{ color:T.green, fontWeight:700, textDecoration:"none" }}>Înapoi la Login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
