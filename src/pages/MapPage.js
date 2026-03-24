import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../services/api";

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
function LocateUser({ onLocate }) {
  const map = useMap();
  return (
    <button onClick={() => {
      navigator.geolocation?.getCurrentPosition(pos => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 14);
        onLocate([pos.coords.latitude, pos.coords.longitude]);
      });
    }} style={{
      position:"absolute", bottom:16, right:16, zIndex:1000,
      background:T.green, color:"#fff", border:"none", borderRadius:10,
      padding:"10px 16px", cursor:"pointer", fontWeight:700, fontSize:13,
      boxShadow:"0 4px 12px rgba(5,150,105,0.4)",
    }}>
      📍 Locatia mea
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
  const [jobs, setJobs]         = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter]     = useState("Toate");
  const [userPos, setUserPos]   = useState(null);
  const [loading, setLoading]   = useState(true);

  const cats = ["Toate", ...new Set(jobs.map(j => j.category).filter(Boolean))];
  const filtered = filter === "Toate" ? jobs : jobs.filter(j => j.category === filter);

  useEffect(() => {
    const params = {};
    if (userPos) { params.lat = userPos[0]; params.lng = userPos[1]; params.radius = 50; }
    api.get("/jobs", { params })
      .then(r => setJobs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userPos]);

  // Center default: Cluj-Napoca
  const center = userPos || [46.7712, 23.6236];

  return (
    <div style={{ display:"flex", height:"calc(100vh - 58px)" }}>
      {/* Sidebar */}
      <div style={{ width:320, background:"#fff", borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Filtre categorii */}
        <div style={{ padding:"14px 14px 10px", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.text3, textTransform:"uppercase", marginBottom:8 }}>Filtreaza</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {cats.map(c => (
              <button key={c} onClick={() => setFilter(c)} style={{
                padding:"5px 12px", borderRadius:20, border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
                background: filter===c ? T.green : "#f5f5f4",
                color: filter===c ? "#fff" : T.text2,
              }}>{c}</button>
            ))}
          </div>
        </div>

        {/* Lista joburi */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {loading && <div style={{ padding:20, color:T.text3, fontSize:13 }}>Se incarca joburile...</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ padding:20, color:T.text3, fontSize:13 }}>Niciun job gasit in aceasta categorie.</div>
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
              {job.urgent && <span style={{ fontSize:10, background:"#fef3c7", color:"#d97706", fontWeight:700, borderRadius:4, padding:"2px 6px", marginTop:4, display:"inline-block" }}>⚡ URGENT</span>}
            </div>
          ))}
        </div>

        {/* Detalii job selectat */}
        {selected && (
          <div style={{ borderTop:`2px solid ${T.border}`, padding:16, background:"#fafaf9" }}>
            <div style={{ fontWeight:800, fontSize:15, color:T.text, marginBottom:4 }}>{selected.title}</div>
            <div style={{ fontSize:12, color:T.text3, marginBottom:8 }}>{selected.employer} · {selected.category}</div>
            <div style={{ fontSize:13, color:T.text2, marginBottom:12, lineHeight:1.5 }}>{selected.description}</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => { update({ selectedJob: selected }); navigate("escrow"); }} style={{
                flex:1, padding:"8px", borderRadius:8, border:"none", cursor:"pointer",
                background:T.green, color:"#fff", fontWeight:700, fontSize:12,
              }}>💰 Escrow</button>
              <button onClick={() => { update({ selectedJob: selected }); navigate("contract"); }} style={{
                flex:1, padding:"8px", borderRadius:8, border:`1px solid ${T.border}`, cursor:"pointer",
                background:"#fff", color:T.text2, fontWeight:600, fontSize:12,
              }}>📄 Contract</button>
            </div>
          </div>
        )}
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
                <div style={{ minWidth:160 }}>
                  <strong>{job.title}</strong><br/>
                  <span style={{ color:T.text3, fontSize:12 }}>{job.employer}</span><br/>
                  <span style={{ color:job.color||T.green, fontWeight:700 }}>{job.salary} RON</span>
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
          <LocateUser onLocate={setUserPos}/>
        </MapContainer>
      </div>
    </div>
  );
}
