import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import { GalleryUploader } from "../components/ImageUploader";

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

// ── Autocomplete adresa cu Nominatim ─────────────────────────
function AddressAutocomplete({ lat, lng, onSelect }) {
  const [query, setQuery]           = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [open, setOpen]             = useState(false);
  const [confirmed, setConfirmed]   = useState(!!lat && !!lng);
  const debounceRef = useRef(null);
  const wrapRef     = useRef(null);

  // Inchide dropdown la click in afara
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Afiseaza adresa confirmata cand se populeaza prin GPS
  useEffect(() => {
    if (lat && lng && !query) setConfirmed(true);
  }, [lat, lng]);

  const handleChange = (val) => {
    setQuery(val);
    setConfirmed(false);
    clearTimeout(debounceRef.current);
    if (val.length < 3) { setSuggestions([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=6&addressdetails=1`,
          { headers: { "Accept-Language": "ro,en" } }
        );
        const data = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleSelect = (item) => {
    const display = item.display_name;
    setQuery(display);
    setSuggestions([]);
    setOpen(false);
    setConfirmed(true);
    onSelect({ lat: parseFloat(item.lat), lng: parseFloat(item.lon), display });
  };

  const handleGPS = () => {
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      // Reverse geocode pt. a afisa adresa
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          { headers: { "Accept-Language": "ro,en" } }
        );
        const data = await res.json();
        const display = data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        setQuery(display);
        setConfirmed(true);
        onSelect({ lat: latitude, lng: longitude, display });
      } catch {
        setQuery(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        setConfirmed(true);
        onSelect({ lat: latitude, lng: longitude, display: "" });
      }
    }, () => alert("Nu s-a putut detecta locatia. Verifica permisiunile GPS."));
  };

  return (
    <div ref={wrapRef} style={{ position:"relative" }}>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <div style={{ flex:1, position:"relative" }}>
          <input
            value={query}
            onChange={e => handleChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder="ex: Strada Mihai Eminescu 10, Cluj-Napoca"
            style={{
              ...inp,
              paddingRight: 36,
              borderColor: confirmed ? T.green : T.border,
              boxShadow: confirmed ? `0 0 0 3px ${T.green}20` : "none",
            }}
          />
          {loading && (
            <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:14, color:T.text3 }}>⏳</span>
          )}
          {confirmed && !loading && (
            <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:14, color:T.green }}>✓</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleGPS}
          title="Detecteaza locatia curenta"
          style={{
            padding:"10px 14px", borderRadius:10, border:`1.5px solid ${T.border}`,
            background:"#fff", cursor:"pointer", fontSize:18, flexShrink:0,
            transition:"all 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = T.green}
          onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
        >📍</button>
      </div>

      {/* Dropdown sugestii */}
      {open && suggestions.length > 0 && (
        <div style={{
          position:"absolute", top:"calc(100% + 4px)", left:0, right:0,
          background:"#fff", border:`1.5px solid ${T.border}`,
          borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,0.14)",
          zIndex:9999, overflow:"hidden", maxHeight:280, overflowY:"auto",
        }}>
          {suggestions.map((item, i) => {
            const parts = item.display_name.split(", ");
            const main  = parts.slice(0, 2).join(", ");
            const sub   = parts.slice(2).join(", ");
            return (
              <div
                key={item.place_id || i}
                onMouseDown={() => handleSelect(item)}
                style={{
                  padding:"10px 14px", cursor:"pointer",
                  borderBottom: i < suggestions.length - 1 ? `1px solid ${T.border}` : "none",
                  transition:"background 0.1s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.bg}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                <div style={{ fontSize:13, fontWeight:600, color:T.text }}>📍 {main}</div>
                {sub && <div style={{ fontSize:11, color:T.text3, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sub}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Coordonate confirmate */}
      {lat && lng && (
        <div style={{ marginTop:8, fontSize:11, color:T.text3, display:"flex", gap:12 }}>
          <span>🌐 Lat: <strong style={{ color:T.text2 }}>{parseFloat(lat).toFixed(5)}</strong></span>
          <span>🌐 Lng: <strong style={{ color:T.text2 }}>{parseFloat(lng).toFixed(5)}</strong></span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

export default function PostJobPage({ navigate, onSuccess }) {
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
  const [jobImages, setJobImages] = useState([]);

  const set = (key, val) => setForm(f => ({...f, [key]: val}));

  const addSkill = () => {
    if (!skillInput.trim() || skills.includes(skillInput.trim())) return;
    setSkills(s => [...s, skillInput.trim()]);
    setSkillInput("");
  };

  const removeSkill = (s) => setSkills(prev => prev.filter(x => x !== s));

  const handleLocationSelect = ({ lat, lng }) => {
    set("lat", lat); set("lng", lng);
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
        images: jobImages,
      });
      setSuccess(true);
      if (onSuccess) onSuccess();
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

        {/* Galerie foto */}
        <div style={{ background:"#fff", borderRadius:16, padding:24, border:`1px solid ${T.border}`, marginBottom:16, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ marginBottom:12 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:T.text, textTransform:"uppercase", letterSpacing:"0.05em", margin:0 }}>
              🖼️ {t("upload_gallery_title","Galerie foto")}
            </h3>
            <p style={{ fontSize:12, color:T.text3, margin:"4px 0 0" }}>
              {t("upload_gallery_desc","Adaugă până la 5 poze ale locului de muncă — apar pe pin în hartă.")}
            </p>
          </div>
          <GalleryUploader images={jobImages} onChange={setJobImages} maxImages={5}/>
        </div>

        {/* Locatie */}
        <div style={{ background:"#fff", borderRadius:16, padding:24, border:`1px solid ${T.border}`, marginBottom:24, boxShadow:"0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ marginBottom:14 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:T.text, textTransform:"uppercase", letterSpacing:"0.05em", margin:0 }}>
              📍 Locatie job
            </h3>
            <p style={{ fontSize:12, color:T.text3, margin:"4px 0 0" }}>
              Scrie adresa si selecteaz-o din lista — pinul va aparea pe harta.
            </p>
          </div>
          <AddressAutocomplete
            lat={form.lat}
            lng={form.lng}
            onSelect={handleLocationSelect}
          />
          {!form.lat && !form.lng && (
            <div style={{ marginTop:10, padding:"8px 12px", borderRadius:8, background:"#fffbeb", border:`1px solid ${T.amber}44`, fontSize:12, color:"#92400e" }}>
              ⚠️ Fara locatie, jobul nu va aparea ca pin pe harta (va fi totusi vizibil in lista).
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
