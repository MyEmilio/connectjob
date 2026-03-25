import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const T = {
  green:"#059669", dark:"#0f172a", dark2:"#1e293b",
  text:"#1c1917", text2:"#57534e", text3:"#a8a29e",
  border:"#e7e5e4", bg:"#fafaf9", red:"#ef4444",
};

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]   = useState({ email:"", password:"" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Eroare la autentificare");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:T.bg }}>
      <div style={{ width:"100%", maxWidth:420, padding:"0 16px" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:40 }}>💼</div>
          <h1 style={{ fontFamily:"Outfit,sans-serif", fontSize:28, fontWeight:800, color:T.dark, margin:"8px 0 4px" }}>JoobConnect</h1>
          <p style={{ color:T.text2, fontSize:14 }}>Conecteaza-te la contul tau</p>
        </div>

        <form onSubmit={handle} style={{ background:"#fff", borderRadius:16, padding:32, boxShadow:"0 4px 24px rgba(0,0,0,0.08)", border:`1px solid ${T.border}` }}>
          {error && (
            <div style={{ background:"#fef2f2", border:`1px solid ${T.red}33`, borderRadius:10, padding:"10px 14px", marginBottom:16, color:T.red, fontSize:13 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:13, fontWeight:600, color:T.text, display:"block", marginBottom:6 }}>Email</label>
            <input
              type="email" required value={form.email}
              onChange={e => setForm(f => ({...f, email: e.target.value}))}
              placeholder="exemplu@email.com"
              style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:`1.5px solid ${T.border}`, fontSize:14, outline:"none", boxSizing:"border-box" }}
            />
          </div>

          <div style={{ marginBottom:24 }}>
            <label style={{ fontSize:13, fontWeight:600, color:T.text, display:"block", marginBottom:6 }}>Parola</label>
            <input
              type="password" required value={form.password}
              onChange={e => setForm(f => ({...f, password: e.target.value}))}
              placeholder="••••••••"
              style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:`1.5px solid ${T.border}`, fontSize:14, outline:"none", boxSizing:"border-box" }}
            />
          </div>

          <button type="submit" disabled={loading} style={{
            width:"100%", padding:"12px", borderRadius:10, border:"none", cursor:"pointer",
            background:T.green, color:"#fff", fontWeight:700, fontSize:15,
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? "Se autentifica..." : "Conectare"}
          </button>

          <p style={{ textAlign:"center", marginTop:16, fontSize:13, color:T.text2 }}>
            Nu ai cont?{" "}
            <Link to="/register" style={{ color:T.green, fontWeight:600, textDecoration:"none" }}>
              Inregistreaza-te
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
