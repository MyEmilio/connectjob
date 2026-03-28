import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import LanguageSwitcher from "../components/LanguageSwitcher";

const T = {
  green:"#059669", greenDark:"#047857", dark:"#0f172a",
  text:"#1c1917", text2:"#57534e", text3:"#a8a29e",
  border:"#e7e5e4", bg:"#fafaf9", red:"#ef4444", amber:"#f59e0b",
  blue:"#3b82f6", white:"#ffffff",
};

function passwordStrength(pass) {
  if (!pass) return null;
  let score = 0;
  if (pass.length >= 8)            score++;
  if (/[A-Z]/.test(pass))          score++;
  if (/[0-9]/.test(pass))          score++;
  if (/[^a-zA-Z0-9]/.test(pass))   score++;
  if (score === 1) return { label:"Débil",   color:T.red,   pct:25  };
  if (score === 2) return { label:"Regular", color:T.amber, pct:50  };
  if (score === 3) return { label:"Buena",   color:T.blue,  pct:75  };
  return             { label:"Fuerte",  color:T.green, pct:100 };
}

function validate(form, t) {
  if (!form.name.trim())                         return t("register_name") + " obligatorio";
  if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) return "Email inválido";
  if (form.password.length < 8)                  return t("pass_min8") || "Mínimo 8 caracteres";
  if (!/[A-Z]/.test(form.password))              return t("pass_upper") || "Necesita una mayúscula";
  if (!/[0-9]/.test(form.password))              return t("pass_number") || "Necesita un número";
  if (!/[^a-zA-Z0-9]/.test(form.password))       return t("pass_special") || "Necesita un carácter especial (!@#...)";
  return null;
}

export default function Register() {
  const { register, loginWithGoogle } = useAuth();
  const { t } = useTranslation("t");
  const navigate = useNavigate();
  const [form, setForm]     = useState({ name:"", email:"", password:"", role:"worker" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const strength = passwordStrength(form.password);

  const handle = async (e) => {
    e.preventDefault();
    const err = validate(form, t);
    if (err) { setError(err); return; }
    setError(""); setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role);
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

  const inp = (label, key, type="text", placeholder="", extra=null) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:700, color:T.text2, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>{label}</label>
      <div style={{ position:"relative" }}>
        <input
          type={type} required value={form[key]}
          onChange={e => setForm(f=>({...f,[key]:e.target.value}))}
          placeholder={placeholder}
          style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${T.border}`, fontSize:14, outline:"none", boxSizing:"border-box", transition:"border 0.2s" }}
          onFocus={e=>e.target.style.border=`1.5px solid ${T.green}`}
          onBlur={e=>e.target.style.border=`1.5px solid ${T.border}`}
        />
        {extra}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:`linear-gradient(135deg,${T.bg} 0%,#f0fdf4 100%)`, padding:"16px" }}>

      <div style={{ position:"fixed", top:16, right:16, zIndex:100 }}>
        <LanguageSwitcher/>
      </div>

      <div style={{ width:"100%", maxWidth:440 }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:`linear-gradient(135deg,${T.green},#34d399)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 10px", boxShadow:`0 6px 20px ${T.green}44` }}>⚡</div>
          <h1 style={{ fontFamily:"Outfit,sans-serif", fontSize:26, fontWeight:800, color:T.dark, margin:"0 0 4px" }}>ConnectJob</h1>
          <p style={{ color:T.text2, fontSize:13, margin:0 }}>{t("register_subtitle")}</p>
        </div>

        <div style={{ background:T.white, borderRadius:20, padding:"24px 28px", boxShadow:"0 8px 32px rgba(0,0,0,0.08)", border:`1px solid ${T.border}` }}>

          {error && (
            <div style={{ background:"#fef2f2", border:`1px solid ${T.red}33`, borderRadius:10, padding:"10px 14px", marginBottom:14, color:T.red, fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handle}>
            {inp(t("register_name"),  "name",  "text",     "Juan García")}
            {inp(t("register_email"), "email", "email",    "correo@ejemplo.com")}

            {/* Password with strength meter */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:T.text2, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:6 }}>{t("register_password")}</label>
              <div style={{ position:"relative" }}>
                <input
                  type={showPass?"text":"password"} required value={form.password}
                  onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                  placeholder="Mín. 8 car., mayúscula, número, símbolo"
                  style={{ width:"100%", padding:"11px 42px 11px 14px", borderRadius:10, border:`1.5px solid ${strength?strength.color:T.border}`, fontSize:14, outline:"none", boxSizing:"border-box", transition:"border 0.2s" }}
                />
                <button type="button" onClick={()=>setShowPass(p=>!p)} style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:T.text3 }}>{showPass?"🙈":"👁️"}</button>
              </div>
              {/* Strength bar */}
              {form.password && strength && (
                <div style={{ marginTop:6 }}>
                  <div style={{ height:4, borderRadius:999, background:T.border, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${strength.pct}%`, background:strength.color, borderRadius:999, transition:"all 0.3s" }}/>
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                    <span style={{ fontSize:11, color:strength.color, fontWeight:700 }}>{strength.label}</span>
                    <span style={{ fontSize:10, color:T.text3 }}>
                      {!/[A-Z]/.test(form.password) && "A· "}
                      {!/[0-9]/.test(form.password) && "0-9· "}
                      {!/[^a-zA-Z0-9]/.test(form.password) && "!@#"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Role selector */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:700, color:T.text2, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:8 }}>{t("register_role")}</label>
              <div style={{ display:"flex", gap:10 }}>
                {[["worker","👷","Trabajador"],["employer","🏢","Empleador"]].map(([val,icon,lbl]) => (
                  <div key={val} onClick={()=>setForm(f=>({...f,role:val}))} style={{
                    flex:1, padding:"12px 10px", borderRadius:12, cursor:"pointer", textAlign:"center",
                    border:`2px solid ${form.role===val?T.green:T.border}`,
                    background:form.role===val?`${T.green}10`:T.white,
                    transition:"all 0.15s",
                  }}>
                    <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
                    <div style={{ fontWeight:700, fontSize:12, color:form.role===val?T.green:T.text2 }}>{lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading || (form.password && strength?.pct < 50)} style={{
              width:"100%", padding:"13px", borderRadius:12, border:"none",
              cursor:loading?"not-allowed":"pointer",
              background:loading?"#d1d5db":`linear-gradient(135deg,${T.green},${T.greenDark})`,
              color:T.white, fontWeight:700, fontSize:15, fontFamily:"DM Sans,sans-serif",
              boxShadow:loading?"none":`0 4px 16px ${T.green}44`, transition:"all 0.2s", marginBottom:16,
            }}>
              {loading ? `⏳ ${t("register_loading")}` : `🚀 ${t("register_btn")}`}
            </button>
          </form>

          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <div style={{ flex:1, height:1, background:T.border }}/>
            <span style={{ fontSize:12, color:T.text3, whiteSpace:"nowrap" }}>{t("or_google") || "o continúa con"}</span>
            <div style={{ flex:1, height:1, background:T.border }}/>
          </div>

          <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
            {process.env.REACT_APP_GOOGLE_CLIENT_ID ? (
              <GoogleLogin
                onSuccess={handleGoogle}
                onError={()=>setError(t("error_generic"))}
                theme="outline" size="large" width="100%"
                text="signup_with" shape="rectangular"
                locale={localStorage.getItem("jc_lang")||"es"}
              />
            ) : (
              <div style={{ width:"100%", padding:"11px", borderRadius:10, border:`1.5px dashed ${T.border}`, textAlign:"center", color:T.text3, fontSize:13 }}>
                🔧 Google OAuth — pendiente de configurar CLIENT_ID
              </div>
            )}
          </div>

          <p style={{ textAlign:"center", margin:0, fontSize:13, color:T.text2 }}>
            {t("register_have_account")}{" "}
            <Link to="/login" style={{ color:T.green, fontWeight:700, textDecoration:"none" }}>
              {t("register_login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
