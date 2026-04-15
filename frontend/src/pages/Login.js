import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import LanguageSwitcher from "../components/LanguageSwitcher";

const T = {
  green:"#059669", greenDark:"#047857", dark:"#0f172a", dark2:"#1e293b",
  text:"#1c1917", text2:"#57534e", text3:"#a8a29e",
  border:"#e7e5e4", bg:"#fafaf9", red:"#ef4444", white:"#ffffff",
};

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const { t } = useTranslation("t");
  const navigate = useNavigate();
  const [form, setForm]     = useState({ email:"", password:"" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || t("error_generic"));
    } finally { setLoading(false); }
  };

  const handleGoogle = async (credentialResponse) => {
    setError(""); setLoading(true);
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || t("error_generic"));
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:`linear-gradient(135deg,${T.bg} 0%,#f0fdf4 100%)`, padding:"16px" }}>

      {/* Language switcher top-right */}
      <div style={{ position:"fixed", top:16, right:16, zIndex:100 }}>
        <LanguageSwitcher/>
      </div>

      <div style={{ width:"100%", maxWidth:420 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ width:64, height:64, borderRadius:18, background:`linear-gradient(135deg,${T.green},#34d399)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 12px", boxShadow:`0 8px 24px ${T.green}44` }}>⚡</div>
          <h1 style={{ fontFamily:"Outfit,sans-serif", fontSize:28, fontWeight:800, color:T.dark, margin:"0 0 4px" }}>ConnectJob</h1>
          <p style={{ color:T.text2, fontSize:14, margin:0 }}>{t("login_subtitle")}</p>
        </div>

        <div style={{ background:T.white, borderRadius:20, padding:"28px 28px 24px", boxShadow:"0 8px 32px rgba(0,0,0,0.08)", border:`1px solid ${T.border}` }}>

          {error && (
            <div style={{ background:"#fef2f2", border:`1px solid ${T.red}33`, borderRadius:10, padding:"10px 14px", marginBottom:16, color:T.red, fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handle}>
            {/* Email */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:T.text2, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>{t("login_email")}</label>
              <input
                type="email" required value={form.email}
                onChange={e => setForm(f=>({...f, email:e.target.value}))}
                placeholder="correo@ejemplo.com"
                style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${T.border}`, fontSize:14, outline:"none", boxSizing:"border-box", transition:"border 0.2s" }}
                onFocus={e=>e.target.style.border=`1.5px solid ${T.green}`}
                onBlur={e=>e.target.style.border=`1.5px solid ${T.border}`}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:700, color:T.text2, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>{t("login_password")}</label>
              <div style={{ position:"relative" }}>
                <input
                  type={showPass?"text":"password"} required value={form.password}
                  onChange={e => setForm(f=>({...f, password:e.target.value}))}
                  placeholder="••••••••"
                  style={{ width:"100%", padding:"11px 42px 11px 14px", borderRadius:10, border:`1.5px solid ${T.border}`, fontSize:14, outline:"none", boxSizing:"border-box", transition:"border 0.2s" }}
                  onFocus={e=>e.target.style.border=`1.5px solid ${T.green}`}
                  onBlur={e=>e.target.style.border=`1.5px solid ${T.border}`}
                />
                <button type="button" onClick={()=>setShowPass(p=>!p)} style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:T.text3 }}>{showPass?"🙈":"👁️"}</button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              width:"100%", padding:"13px", borderRadius:12, border:"none", cursor:loading?"not-allowed":"pointer",
              background:loading?"#d1d5db":`linear-gradient(135deg,${T.green},${T.greenDark})`,
              color:T.white, fontWeight:700, fontSize:15, fontFamily:"DM Sans,sans-serif",
              boxShadow:loading?"none":`0 4px 16px ${T.green}44`, transition:"all 0.2s",
              marginBottom:16,
            }}>
              {loading ? <span>⏳ {t("login_loading")}</span> : `🔑 ${t("login_btn")}`}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <div style={{ flex:1, height:1, background:T.border }}/>
            <span style={{ fontSize:12, color:T.text3, whiteSpace:"nowrap" }}>{t("or_google") || "o continúa con"}</span>
            <div style={{ flex:1, height:1, background:T.border }}/>
          </div>

          {/* Google OAuth */}
          <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
            {process.env.REACT_APP_GOOGLE_CLIENT_ID ? (
              <GoogleLogin
                onSuccess={handleGoogle}
                onError={() => setError(t("error_generic"))}
                useOneTap={false}
                theme="outline"
                size="large"
                width={360}
                text="signin_with"
                shape="rectangular"
                locale={localStorage.getItem("jc_lang") || "es"}
              />
            ) : (
              <div style={{ width:"100%", padding:"11px", borderRadius:10, border:`1.5px dashed ${T.border}`, textAlign:"center", color:T.text3, fontSize:13 }}>
                🔧 Google OAuth — pendiente de configurar CLIENT_ID
              </div>
            )}
          </div>

          <p style={{ textAlign:"center", margin:0, fontSize:13, color:T.text2 }}>
            {t("login_no_account")}{" "}
            <Link to="/register" style={{ color:T.green, fontWeight:700, textDecoration:"none" }}>
              {t("login_register")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
