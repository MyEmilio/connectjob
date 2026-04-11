import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../services/api";
import { useTranslation } from "react-i18next";

// Fix icoane Leaflet cu Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl:       require("leaflet/dist/images/marker-icon.png"),
  shadowUrl:     require("leaflet/dist/images/marker-shadow.png"),
});

const T = {
  green:"#059669", dark:"#0f172a", text:"#1c1917",
  text2:"#57534e", text3:"#a8a29e", border:"#e7e5e4", bg:"#fafaf9",
};

// Buton pentru localizare utilizator
function LocateUser({ onLocate, label }) {
  const map = useMap();
  return (
    <button onClick={() => {
      navigator.geolocation?.getCurrentPosition(pos => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 14);
        onLocate([pos.coords.latitude, pos.coords.longitude]);
      });
    }} style={{
      position:"absolute", bottom:80, right:16, zIndex:1000,
      background:T.green, color:"#fff", border:"none", borderRadius:10,
      padding:"10px 16px", cursor:"pointer", fontWeight:700, fontSize:13,
      boxShadow:"0 4px 12px rgba(5,150,105,0.4)",
    }}>
      {label || "📍 Locatia mea"}
    </button>
  );
}

// Icona custom pentru job
const jobIcon = (color, emoji) => L.divIcon({
  className: "",
  html: `<div style="background:${color};color:#fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 3px 10px rgba(0,0,0,0.25);border:3px solid #fff;">${emoji}</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

export default function MapPage({ navigate, update }) {
  const { t } = useTranslation("t");
  const [jobs, setJobs]         = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter]     = useState("all");
  const [userPos, setUserPos]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(0);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current) return;
      const delta = e.clientX - dragStartX.current;
      const newW = Math.min(520, Math.max(200, dragStartW.current + delta));
      setSidebarWidth(newW);
    };
    const onMouseUp = () => { dragging.current = false; document.body.style.cursor = ""; document.body.style.userSelect = ""; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, []);

  const cats = ["all", ...new Set(jobs.map(j => j.category).filter(Boolean))];
  const filtered = filter === "all" ? jobs : jobs.filter(j => j.category === filter);

  useEffect(() => {
    const params = {};
    if (userPos) { params.lat = userPos[0]; params.lng = userPos[1]; params.radius = 50; }
    api.get("/jobs", { params })
      .then(r => setJobs(r.data.jobs || r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userPos]);

  // Center default: Alicante
  const center = userPos || [38.3452, -0.4815];

  return (
    <div style={{ display:"flex", height:"calc(100vh - 58px)" }}>
      {/* Sidebar */}
      <div style={{ width:sidebarWidth, minWidth:200, maxWidth:520, background:"#fff", borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", overflow:"hidden", position:"relative", flexShrink:0 }}>
        {/* Filtre categorii */}
        <div style={{ padding:"14px 14px 10px", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.text3, textTransform:"uppercase", marginBottom:8 }}>{t("map_filter","Filtrează")}</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {cats.map(c => (
              <button key={c} onClick={() => setFilter(c)} style={{
                padding:"5px 12px", borderRadius:20, border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
                background: filter===c ? T.green : "#f5f5f4",
                color: filter===c ? "#fff" : T.text2,
              }}>{c === "all" ? t("map_all","Toate") : c}</button>
            ))}
          </div>
        </div>

        {/* Lista joburi */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {loading && <div style={{ padding:20, color:T.text3, fontSize:13 }}>{t("map_loading","Se încarcă...")}</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ padding:20, color:T.text3, fontSize:13 }}>{t("map_no_jobs","Niciun job în această categorie.")}</div>
          )}
          {filtered.map(job => (
            <div key={job.id} onClick={() => setSelected(job)} style={{
              padding:"14px 16px", borderBottom:`1px solid ${T.border}`, cursor:"pointer",
              background: selected?.id === job.id ? `${T.green}08` : "transparent",
              borderLeft: selected?.id === job.id ? `3px solid ${T.green}` : "3px solid transparent",
              transition:"all 0.15s",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:job.color||T.green, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                  {job.icon || "💼"}
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{job.title}</div>
                  <div style={{ fontSize:11, color:T.text3 }}>{job.employer} · {job.distance ? `${job.distance} km` : job.category}</div>
                </div>
                <div style={{ marginLeft:"auto", fontWeight:800, fontSize:14, color:job.color||T.green, whiteSpace:"nowrap" }}>{job.salary} RON</div>
              </div>
              {job.urgent && <span style={{ fontSize:10, background:"#fef3c7", color:"#d97706", fontWeight:700, borderRadius:4, padding:"2px 6px", marginTop:4, display:"inline-block" }}>⚡ {t("home_urgent","URGENT")}</span>}
            </div>
          ))}
        </div>

        {/* Detalii job selectat */}
        {selected && (
          <div style={{ borderTop:`2px solid ${T.border}`, padding:16, background:"#fafaf9", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
              <div style={{ fontWeight:800, fontSize:15, color:T.text }}>{selected.title}</div>
              {selected.urgent && <span style={{ fontSize:10, background:"#fef3c7", color:"#d97706", fontWeight:700, borderRadius:4, padding:"2px 6px" }}>🔥 {t("home_urgent","Urgent")}</span>}
            </div>
            <div style={{ fontSize:12, color:T.text3, marginBottom:4 }}>{selected.employer} · {selected.category}</div>
            <div style={{ fontSize:16, fontWeight:800, color:selected.color||T.green, marginBottom:8 }}>{selected.salary} {t("job_per_day","€/zi")}</div>

            {/* Galerie foto job */}
            {selected.images?.length > 0 && (
              <div style={{ display:"flex", gap:6, marginBottom:10, overflowX:"auto" }}>
                {selected.images.map((img, i) => (
                  <img key={i} src={img} alt="" style={{ height:72, minWidth:90, borderRadius:8, objectFit:"cover", border:`1.5px solid ${T.border}`, cursor:"pointer", flexShrink:0 }} onClick={() => window.open(img,"_blank")}/>
                ))}
              </div>
            )}

            {selected.description && <div style={{ fontSize:12, color:T.text2, marginBottom:10, lineHeight:1.5 }}>{selected.description}</div>}
            {selected.skills?.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:10 }}>
                {selected.skills.map(s=><span key={s} style={{ background:`${selected.color||T.green}18`, color:selected.color||T.green, borderRadius:999, padding:"2px 8px", fontSize:10, fontWeight:700 }}>{s}</span>)}
              </div>
            )}

            {/* Rute */}
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:10, fontWeight:700, color:T.text3, textTransform:"uppercase", marginBottom:5 }}>{t("map_routes","Trasee")}</div>
              {[
                {mode:"🚶", label:t("route_pedestrian","Pietonal"),  time:"23 min", color:"#059669"},
                {mode:"🚲", label:t("route_bike","Bicicletă"),       time:"8 min",  color:"#3b82f6"},
                {mode:"🚗", label:t("route_car","Mașină"),           time:"5 min",  color:"#f59e0b"},
                {mode:"🚌", label:t("route_transit","Transport"),    time:"18 min", color:"#8b5cf6"},
              ].map(r=>(
                <div key={r.mode} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 8px", borderRadius:7, marginBottom:3, background:"#fff", border:`1px solid ${T.border}`, cursor:"pointer", fontSize:12 }}
                  onMouseEnter={e=>e.currentTarget.style.background="#f0fdf4"}
                  onMouseLeave={e=>e.currentTarget.style.background="#fff"}
                >
                  <span>{r.mode} {r.label}</span>
                  <span style={{ fontWeight:700, color:r.color }}>{r.time}</span>
                </div>
              ))}
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <button onClick={() => { update({ selectedJob: selected }); navigate("escrow"); }} style={{
                padding:"8px", borderRadius:8, border:"none", cursor:"pointer",
                background:T.green, color:"#fff", fontWeight:700, fontSize:12,
              }}>🔒 {t("home_apply","Aplică")} + {t("nav_escrow","Escrow")}</button>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={() => { update({ selectedJob: selected }); navigate("contract"); }} style={{
                  flex:1, padding:"7px", borderRadius:8, border:`1px solid ${T.border}`, cursor:"pointer",
                  background:"#fff", color:T.text2, fontWeight:600, fontSize:12,
                }}>📝 {t("nav_contract","Contract")}</button>
                <button onClick={() => navigate("chat")} style={{
                  flex:1, padding:"7px", borderRadius:8, border:`1px solid ${T.border}`, cursor:"pointer",
                  background:"#fff", color:T.text2, fontWeight:600, fontSize:12,
                }}>💬 {t("chat_send","Mesaj")}</button>
              </div>
            </div>
          </div>
        )}
        {/* Drag handle */}
        <div
          onMouseDown={(e) => {
            dragging.current = true;
            dragStartX.current = e.clientX;
            dragStartW.current = sidebarWidth;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
            e.preventDefault();
          }}
          style={{
            position:"absolute", top:0, right:0, width:6, height:"100%",
            cursor:"col-resize", zIndex:10,
            background:"transparent",
            transition:"background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = `${T.green}40`}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          title="Drag pentru a redimensiona"
        />
      </div>

      {/* Harta */}
      <div style={{ flex:1, position:"relative" }}>
        <MapContainer center={center} zoom={13} style={{ height:"100%", width:"100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filtered.filter(j => j.lat && j.lng).map(job => (
            <Marker
              key={job.id}
              position={[job.lat, job.lng]}
              icon={jobIcon(job.color || T.green, job.icon || "💼")}
              eventHandlers={{ click: () => setSelected(job) }}
            >
              <Popup>
                <div style={{ minWidth:180, fontFamily:"DM Sans,sans-serif" }}>
                  {job.images?.[0] && (
                    <img src={job.images[0]} alt="" style={{ width:"100%", height:100, objectFit:"cover", borderRadius:8, marginBottom:6, display:"block" }}/>
                  )}
                  <strong style={{ fontSize:13 }}>{job.title}</strong><br/>
                  <span style={{ color:T.text3, fontSize:11 }}>{job.employer}</span><br/>
                  <span style={{ color:job.color||T.green, fontWeight:700, fontSize:13 }}>{job.salary} RON</span>
                  {job.images?.length > 1 && (
                    <div style={{ fontSize:10, color:T.text3, marginTop:3 }}>🖼️ +{job.images.length - 1} {job.images.length === 2 ? "poză" : "poze"}</div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          {userPos && (
            <Marker position={userPos} icon={L.divIcon({
              className:"",
              html:`<div style="background:#3b82f6;border:3px solid #fff;border-radius:50%;width:18px;height:18px;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>`,
              iconSize:[18,18], iconAnchor:[9,9],
            })}/>
          )}
          <LocateUser onLocate={setUserPos} label={t("map_locate","📍 Locatia mea")}/>
        </MapContainer>
      </div>
    </div>
  );
}
