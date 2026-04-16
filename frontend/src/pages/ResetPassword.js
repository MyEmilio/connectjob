import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api";

const T = { green:"#059669", greenDark:"#047857", text:"#1c1917", text2:"#57534e", text3:"#a8a29e", border:"#e7e5e4", bg:"#fafaf9", white:"#fff", red:"#ef4444" };

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("form");
  const [validToken, setValidToken] = useState(null);

  useEffect(() => {
    if (!token) { setValidToken(false); return; }
    api.get(`/auth/verify-reset-token/${token}`)
      .then(r => setValidToken(r.data.valid))
      .catch(() => setValidToken(false));
  }, [token]);

  const handle = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError("Parolele nu coincid"); return; }
    if (password.length < 8) { setError("Parola trebuie să aibă cel puțin 8 caractere"); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setStatus("success");
    } catch (err) {
      setError(err.response?.data?.error || "Eroare la resetare.");
    } finally { setLoading(false); }
  };

  if (validToken === null) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:T.bg }}>
      <div style={{ width:40, height:40, border:`3px solid ${T.green}`, borderTop:"3px solid transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
    </div>
  );

  if (validToken === false) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:T.bg, padding:16 }}>
      <div style={{ background:T.white, borderRadius:20, padding:"36px 32px", maxWidth:420, width:"100%", textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.08)", border:`1px solid ${T.border}` }}>
        <div style={{ fontSize:56, marginBottom:12 }}>❌</div>
        <h2 style={{ fontFamily:"Outfit,sans-serif", fontSize:22, fontWeight:800, color:T.red }}>Token Invalid</h2>
        <p style={{ color:T.text2, fontSize:14, marginBottom:24 }}>Link-ul de resetare este invalid sau a expirat.</p>
        <Link to="/forgot-password" style={{ display:"inline-block", padding:"12px 28px", borderRadius:10, background:T.green, color:"#fff", textDecoration:"none", fontWeight:700 }}>Solicită un nou link</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:T.bg, padding:16 }}>
      <div data-testid="reset-password-page" style={{ background:T.white, borderRadius:20, padding:"36px 32px", maxWidth:420, width:"100%", boxShadow:"0 8px 32px rgba(0,0,0,0.08)", border:`1px solid ${T.border}` }}>
        {status === "success" ? (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:56, marginBottom:12 }}>✅</div>
            <h2 style={{ fontFamily:"Outfit,sans-serif", fontSize:22, fontWeight:800, color:T.text }}>Parola Resetată!</h2>
            <p style={{ color:T.text2, fontSize:14, marginBottom:24 }}>Parola ta a fost schimbată cu succes.</p>
            <button data-testid="reset-go-login" onClick={() => navigate("/login")} style={{ padding:"12px 28px", borderRadius:10, background:T.green, color:"#fff", border:"none", cursor:"pointer", fontWeight:700, fontSize:14 }}>Autentifică-te</button>
          </div>
        ) : (
          <>
            <div style={{ textAlign:"center", marginBottom:24 }}>
              <div style={{ fontSize:48, marginBottom:8 }}>🔐</div>
              <h2 style={{ fontFamily:"Outfit,sans-serif", fontSize:22, fontWeight:800, color:T.text, margin:"0 0 6px" }}>Parolă Nouă</h2>
              <p style={{ color:T.text2, fontSize:13 }}>Introdu noua parolă</p>
            </div>
            <form onSubmit={handle}>
              {error && <div style={{ background:"#fef2f2", border:`1px solid ${T.red}33`, borderRadius:10, padding:"10px 14px", marginBottom:16, color:T.red, fontSize:13 }}>⚠️ {error}</div>}
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, fontWeight:700, color:T.text2, textTransform:"uppercase", display:"block", marginBottom:6 }}>Parolă nouă</label>
                <input data-testid="reset-password-input" type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 caractere, 1 majusculă, 1 cifră"
                  style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${T.border}`, fontSize:14, outline:"none", boxSizing:"border-box" }}/>
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={{ fontSize:12, fontWeight:700, color:T.text2, textTransform:"uppercase", display:"block", marginBottom:6 }}>Confirmă parola</label>
                <input data-testid="reset-confirm-input" type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder={t("auth_repeat_password")}
                  style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${T.border}`, fontSize:14, outline:"none", boxSizing:"border-box" }}/>
              </div>
              <button data-testid="reset-submit-btn" type="submit" disabled={loading} style={{
                width:"100%", padding:"13px", borderRadius:12, border:"none", cursor:loading?"not-allowed":"pointer",
                background:loading?"#d1d5db":`linear-gradient(135deg,${T.green},${T.greenDark})`,
                color:"#fff", fontWeight:700, fontSize:14,
              }}>{loading ? "Se resetează..." : "🔑 Resetează Parola"}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
