import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const [form, setForm]     = useState({ email:"", password:"" });
  const [error, setError]   = useState(location.state?.error || "");
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

        <div data-testid="login-form" style={{ background:T.white, borderRadius:20, padding:"28px 28px 24px", boxShadow:"0 8px 32px rgba(0,0,0,0.08)", border:`1px solid ${T.border}` }}>

          {error && (
            <div data-testid="login-error" style={{ background:"#fef2f2", border:`1px solid ${T.red}33`, borderRadius:10, padding:"10px 14px", marginBottom:16, color:T.red, fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handle}>
            {/* Email */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:T.text2, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>{t("login_email")}</label>
              <input
                data-testid="login-email"
                type="email" required value={form.email}
                onChange={e => setForm(f=>({...f, email:e.target.value}))}
                placeholder="email@ejemplo.com"
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
                  data-testid="login-password"
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

            <button data-testid="login-submit-btn" type="submit" disabled={loading} style={{
              width:"100%", padding:"13px", borderRadius:12, border:"none", cursor:loading?"not-allowed":"pointer",
              background:loading?"#d1d5db":`linear-gradient(135deg,${T.green},${T.greenDark})`,
              color:T.white, fontWeight:700, fontSize:15, fontFamily:"DM Sans,sans-serif",
              boxShadow:loading?"none":`0 4px 16px ${T.green}44`, transition:"all 0.2s",
              marginBottom:10,
            }}>
              {loading ? <span>⏳ {t("login_loading")}</span> : `🔑 ${t("login_btn")}`}
            </button>
            <div style={{ textAlign:"right", marginBottom:16 }}>
              <Link to="/forgot-password" data-testid="forgot-password-link" style={{ fontSize:12, color:T.green, fontWeight:600, textDecoration:"none" }}>
                {t("login_forgot") || "Am uitat parola"}
              </Link>
            </div>
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
              <button
                data-testid="google-login-btn"
                onClick={() => {
                  const redirectUrl = window.location.origin + '/';
                  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
                }}
                disabled={loading}
                style={{
                  width:"100%", padding:"12px 16px", borderRadius:12, cursor:"pointer",
                  border:`1.5px solid ${T.border}`, background:T.white,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                  fontFamily:"DM Sans,sans-serif", fontSize:14, fontWeight:600, color:T.text,
                  transition:"all 0.2s", boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                {t("login_google")}
              </button>
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
