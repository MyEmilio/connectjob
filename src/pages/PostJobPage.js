import { useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../services/api";

const T = {
  green:"#059669", greenDark:"#047857", dark:"#0f172a",
  text:"#1c1917", text2:"#57534e", text3:"#a8a29e",
  border:"#e7e5e4", bg:"#fafaf9", red:"#ef4444", amber:"#f59e0b",
};

const CATEGORIES = [
  "Curățenie","Animale","Construcții","Grădină","Transport",
  "Îngrijire","Livrare","IT","Educație","Evenimente","Altele",
];
const ICONS = ["💼","🔧","🏗️","🌿","🚗","📦","💻","🎓","🎪","🍽️","🏊","🐕","⚡","🖌️","👶","📱","🔑","🌍"];

export default function PostJobPage({ navigate }) {
  const { t } = useTranslation("t");
  const [form, setForm] = useState({
    title:"", description:"", category:"", salary:"",
    type:"part-time", urgent:false, lat:"", lng:"",
    skills:"", icon:"💼", color:T.green,
  });
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills]     = useState([]);

  const set = (key, val) => setForm(f => ({...f, [key]: val}));

  const addSkill = () => {
    if (!skillInput.trim() || skills.includes(skillInput.trim())) return;
    setSkills(s => [...s, skillInput.trim()]);
    setSkillInput("");
  };

  const removeSkill = (s) => setSkills(prev => prev.filter(x => x !== s));

  // Detectare locatie automata
  const detectLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      pos => { set("lat", pos.coords.latitude.toFixed(6)); set("lng", pos.coords.longitude.toFixed(6)); },
      ()  => setError("Nu s-a putut detecta locatia.")
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.salary || !form.category) {
      setError("Titlu, categorie si salariu sunt obligatorii."); return;
    }
    setError(""); setLoading(true);
    try {
      await api.post("/jobs", {
        ...form,
        salary: parseFloat(form.salary),
        urgent: form.urgent ? 1 : 0,
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
        skills,
      });
      setSuccess(true);
      setTimeout(() => { setSuccess(false); navigate("map"); }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || t("error_generic"));
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:300, gap:16 }}>
      <div style={{ fontSize:64 }}>✅</div>
      <div style={{ fontFamily:"Outfit,sans-serif", fontSize:22, fontWeight:800, color:T.green }}>{t("post_job_success")}</div>
    </div>
  );

  return (
    <div style={{ maxWidth:680, margin:"0 auto", animation:"fadeIn 0.3s ease" }}>
      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:"Outfit,sans-serif", fontSize:26, fontWeight:800, color:T.dark, margin:"0 0 6px" }}>
          ➕ {t("post_job_title")}
        </h1>
        <p style={{ color:T.text2, fontSize:14 }}>Completeaza detaliile pentru a publica un nou job.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ background:"#fef2f2", border:`1px solid ${T.red}33`, borderRadius:10, padding:"10px 14px", marginBottom:16, color:T.red, fontSize:13 }}>
            {error}
          </div>
        )}

        {/* Card principal */}
        <div style={{ background:"#fff", borderRadius:16, padding:28, border:`1px solid ${T.border}`, marginBottom:16, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:16, textTransform:"uppercase", letterSpacing:"0.05em" }}>Informatii de baza</h3>

          {/* Titlu */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:13, fontWeight:600, color:T.text, display:"block", marginBottom:6 }}>{t("post_job_name")} *</label>
            <input value={form.title} onChange={e=>set("title",e.target.value)} required placeholder="ex: Curățare piscinã" style={inp}/>
          </div>

          {/* Descriere */}
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:13, fontWeight:600, color:T.text, display:"block", marginBottom:6 }}>{t("post_job_desc")}</label>
            <textarea value={form.description} onChange={e=>set("description",e.target.value)} rows={4} placeholder="Descrie activitatile, cerintele, programul..." style={{...inp, resize:"vertical"}}/>
          </div>

          {/* Categorie + Salariu */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:T.text, display:"block", marginBottom:6 }}>{t("post_job_cat")} *</label>
              <select value={form.category} onChange={e=>set("category",e.target.value)} required style={inp}>
                <option value="">Selecteaza...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:T.text, display:"block", marginBottom:6 }}>{t("post_job_salary")} *</label>
              <input type="number" min="1" value={form.salary} onChange={e=>set("salary",e.target.value)} required placeholder="ex: 150" style={inp}/>
            </div>
          </div>

          {/* Tip + Urgent */}
          <div style={{ display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:13, fontWeight:600, color:T.text, display:"block", marginBottom:6 }}>{t("post_job_type")}</label>
              <div style={{ display:"flex", gap:8 }}>
                {[["part-time", t("post_job_parttime")],["full-time", t("post_job_fulltime")]].map(([val, lbl]) => (
                  <div key={val} onClick={()=>set("type",val)} style={{
                    flex:1, padding:"8px 12px", borderRadius:10, cursor:"pointer", textAlign:"center",
                    border:`2px solid ${form.type===val ? T.green : T.border}`,
                    background: form.type===val ? `${T.green}12` : "#fff",
                    fontWeight:600, fontSize:13, color: form.type===val ? T.green : T.text2,
                  }}>
                    {lbl}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:20, cursor:"pointer" }} onClick={()=>set("urgent",!form.urgent)}>
              <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${form.urgent ? T.amber : T.border}`, background: form.urgent ? T.amber : "#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>
                {form.urgent ? "✓" : ""}
              </div>
              <span style={{ fontSize:13, fontWeight:600, color: form.urgent ? T.amber : T.text2 }}>{t("post_job_urgent")}</span>
            </div>
          </div>
        </div>

        {/* Icon + Culoare */}
        <div style={{ background:"#fff", borderRadius:16, padding:24, border:`1px solid ${T.border}`, marginBottom:16, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:16, textTransform:"uppercase", letterSpacing:"0.05em" }}>Aspect vizual</h3>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:13, fontWeight:600, color:T.text, display:"block", marginBottom:8 }}>Icon</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {ICONS.map(icon => (
                <div key={icon} onClick={()=>set("icon",icon)} style={{
                  width:38, height:38, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:20, cursor:"pointer",
                  border:`2px solid ${form.icon===icon ? T.green : T.border}`,
                  background: form.icon===icon ? `${T.green}15` : "#fff",
                }}>
                  {icon}
                </div>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize:13, fontWeight:600, color:T.text, display:"block", marginBottom:8 }}>Culoare pin harta</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {["#059669","#3b82f6","#8b5cf6","#f59e0b","#ef4444","#ec4899","#ea580c","#0d9488"].map(c => (
                <div key={c} onClick={()=>set("color",c)} style={{
                  width:30, height:30, borderRadius:"50%", background:c, cursor:"pointer",
                  border: form.color===c ? `3px solid ${T.dark}` : "3px solid transparent",
                  boxShadow: form.color===c ? `0 0 0 2px ${c}55` : "none",
                }}/>
              ))}
            </div>
          </div>
        </div>

        {/* Skills */}
        <div style={{ background:"#fff", borderRadius:16, padding:24, border:`1px solid ${T.border}`, marginBottom:16, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:16, textTransform:"uppercase", letterSpacing:"0.05em" }}>{t("post_job_skills")}</h3>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <input value={skillInput} onChange={e=>setSkillInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"){e.preventDefault();addSkill();}}} placeholder="ex: Chimie piscina..." style={{...inp, flex:1}}/>
            <button type="button" onClick={addSkill} style={{ padding:"10px 16px", borderRadius:10, border:"none", background:T.green, color:"#fff", fontWeight:700, cursor:"pointer", fontSize:13 }}>+</button>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {skills.map(s => (
              <div key={s} style={{ display:"flex", alignItems:"center", gap:6, background:`${T.green}15`, color:T.green, borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:600 }}>
                {s}
                <span onClick={()=>removeSkill(s)} style={{ cursor:"pointer", fontSize:14, lineHeight:1 }}>×</span>
              </div>
            ))}
          </div>
        </div>

        {/* Locatie */}
        <div style={{ background:"#fff", borderRadius:16, padding:24, border:`1px solid ${T.border}`, marginBottom:24, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:T.text, textTransform:"uppercase", letterSpacing:"0.05em" }}>Locatie</h3>
            <button type="button" onClick={detectLocation} style={{ fontSize:12, fontWeight:600, color:T.green, background:"transparent", border:"none", cursor:"pointer" }}>
              📍 Detecteaza automat
            </button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:T.text, display:"block", marginBottom:6 }}>{t("post_job_lat")}</label>
              <input type="number" step="any" value={form.lat} onChange={e=>set("lat",e.target.value)} placeholder="46.7712" style={inp}/>
            </div>
            <div>
              <label style={{ fontSize:13, fontWeight:600, color:T.text, display:"block", marginBottom:6 }}>{t("post_job_lng")}</label>
              <input type="number" step="any" value={form.lng} onChange={e=>set("lng",e.target.value)} placeholder="23.6236" style={inp}/>
            </div>
          </div>
          {form.lat && form.lng && (
            <div style={{ marginTop:10, fontSize:12, color:T.text3 }}>
              📍 Coordonate: {form.lat}, {form.lng}
            </div>
          )}
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading} style={{
          width:"100%", padding:"14px", borderRadius:12, border:"none", cursor:"pointer",
          background:`linear-gradient(135deg,${T.green},${T.greenDark})`,
          color:"#fff", fontWeight:800, fontSize:16,
          boxShadow:`0 6px 20px ${T.green}44`,
          opacity: loading ? 0.7 : 1, transition:"all 0.2s",
        }}>
          {loading ? t("post_job_submitting") : `➕ ${t("post_job_submit")}`}
        </button>
      </form>
    </div>
  );
}

const inp = {
  width:"100%", padding:"10px 14px", borderRadius:10,
  border:"1.5px solid #e7e5e4", fontSize:14, outline:"none",
  boxSizing:"border-box", fontFamily:"inherit", color:"#1c1917",
};
