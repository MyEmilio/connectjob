import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const T = {
  green:"#059669", dark:"#0f172a", text:"#1c1917",
  text2:"#57534e", border:"#e7e5e4", bg:"#fafaf9", red:"#ef4444",
};

export default function Register() {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [form, setForm]   = useState({ name:"", email:"", password:"", role:"worker" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { setError("Parola trebuie sa aiba minim 6 caractere"); return; }
    setError(""); setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Eroare la inregistrare");
    } finally {
      setLoading(false);
    }
  };

  const inp = (label, key, type="text", placeholder="") => (
    <div style={{ marginBottom:16 }}>
      <label style={{ fontSize:13, fontWeight:600, color:T.text, display:"block", marginBottom:6 }}>{label}</label>
      <input
        type={type} required value={form[key]} placeholder={placeholder}
        onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
        style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:`1.5px solid ${T.border}`, fontSize:14, outline:"none", boxSizing:"border-box" }}
      />
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:T.bg }}>
      <div style={{ width:"100%", maxWidth:420, padding:"0 16px" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:40 }}>💼</div>
          <h1 style={{ fontFamily:"Outfit,sans-serif", fontSize:28, fontWeight:800, color:T.dark, margin:"8px 0 4px" }}>ConnectJob</h1>
          <p style={{ color:T.text2, fontSize:14 }}>Creeaza un cont nou</p>
        </div>

        <form onSubmit={handle} style={{ background:"#fff", borderRadius:16, padding:32, boxShadow:"0 4px 24px rgba(0,0,0,0.08)", border:`1px solid ${T.border}` }}>
          {error && (
            <div style={{ background:"#fef2f2", border:`1px solid ${T.red}33`, borderRadius:10, padding:"10px 14px", marginBottom:16, color:T.red, fontSize:13 }}>
              {error}
            </div>
          )}

          {inp("Nume complet", "name", "text", "Ion Popescu")}
          {inp("Email", "email", "email", "exemplu@email.com")}
          {inp("Parola", "password", "password", "minim 6 caractere")}

          <div style={{ marginBottom:24 }}>
            <label style={{ fontSize:13, fontWeight:600, color:T.text, display:"block", marginBottom:6 }}>Tip cont</label>
            <div style={{ display:"flex", gap:10 }}>
              {[["worker","👷 Lucrator"],["employer","🏢 Angajator"]].map(([val, lbl]) => (
                <div key={val} onClick={() => setForm(f=>({...f,role:val}))} style={{
                  flex:1, padding:"10px", borderRadius:10, cursor:"pointer", textAlign:"center",
                  border:`2px solid ${form.role===val ? T.green : T.border}`,
                  background: form.role===val ? `${T.green}12` : "#fff",
                  fontWeight:600, fontSize:13, color: form.role===val ? T.green : T.text2,
                }}>
                  {lbl}
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            width:"100%", padding:"12px", borderRadius:10, border:"none", cursor:"pointer",
            background:T.green, color:"#fff", fontWeight:700, fontSize:15, opacity: loading ? 0.7 : 1,
          }}>
            {loading ? "Se creeaza contul..." : "Creeaza cont"}
          </button>

          <p style={{ textAlign:"center", marginTop:16, fontSize:13, color:T.text2 }}>
            Ai deja cont?{" "}
            <Link to="/login" style={{ color:T.green, fontWeight:600, textDecoration:"none" }}>
              Conecteaza-te
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
