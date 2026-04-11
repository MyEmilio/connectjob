import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../services/api";

const T = { green:"#059669", text:"#1c1917", text2:"#57534e", border:"#e7e5e4", bg:"#fafaf9", white:"#fff", red:"#ef4444" };

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setMsg("Token de verificare lipsă."); return; }
    api.get(`/auth/verify-email/${token}`)
      .then(r => { setStatus("success"); setMsg(r.data.message || "Email verificat!"); })
      .catch(e => { setStatus("error"); setMsg(e.response?.data?.error || "Token invalid sau expirat."); });
  }, [token]);

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:T.bg, padding:16 }}>
      <div data-testid="verify-email-page" style={{ background:T.white, borderRadius:20, padding:"36px 32px", maxWidth:420, width:"100%", textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.08)", border:`1px solid ${T.border}` }}>
        {status === "loading" && (
          <>
            <div style={{ width:48, height:48, border:`3px solid ${T.green}`, borderTop:"3px solid transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 16px" }}/>
            <p style={{ color:T.text2, fontSize:14 }}>Se verifică email-ul...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div style={{ fontSize:56, marginBottom:12 }}>✅</div>
            <h2 style={{ fontFamily:"Outfit,sans-serif", fontSize:22, fontWeight:800, color:T.text, margin:"0 0 8px" }}>Email Verificat!</h2>
            <p style={{ color:T.text2, fontSize:14, marginBottom:24 }}>{msg}</p>
            <Link to="/login" data-testid="verify-email-login-btn" style={{ display:"inline-block", padding:"12px 28px", borderRadius:10, background:T.green, color:"#fff", textDecoration:"none", fontWeight:700, fontSize:14 }}>Autentifică-te</Link>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize:56, marginBottom:12 }}>❌</div>
            <h2 style={{ fontFamily:"Outfit,sans-serif", fontSize:22, fontWeight:800, color:T.red, margin:"0 0 8px" }}>Verificare Eșuată</h2>
            <p style={{ color:T.text2, fontSize:14, marginBottom:24 }}>{msg}</p>
            <Link to="/login" style={{ display:"inline-block", padding:"12px 28px", borderRadius:10, border:`1px solid ${T.border}`, color:T.text2, textDecoration:"none", fontWeight:600, fontSize:14 }}>Înapoi la Login</Link>
          </>
        )}
      </div>
    </div>
  );
}
