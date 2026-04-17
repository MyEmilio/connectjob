import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
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
  amber:"#f59e0b", blue:"#3b82f6", purple:"#8b5cf6", red:"#ef4444",
};

// Custom cluster icon
const createClusterIcon = (cluster) => {
  const count = cluster.getChildCount();
  let size = 36, bg = T.green, ring = "rgba(5,150,105,0.25)";
  if (count >= 20) { size = 50; bg = "#d97706"; ring = "rgba(217,119,6,0.25)"; }
  else if (count >= 10) { size = 44; bg = T.blue; ring = "rgba(59,130,246,0.25)"; }
  else if (count >= 5) { size = 40; bg = T.purple; ring = "rgba(139,92,246,0.25)"; }

  return L.divIcon({
    html: `<div style="
      background:${bg};color:#fff;border-radius:50%;
      width:${size}px;height:${size}px;
      display:flex;align-items:center;justify-content:center;
      font-weight:800;font-size:${size > 44 ? 16 : 13}px;
      font-family:DM Sans,sans-serif;
      box-shadow:0 0 0 6px ${ring}, 0 4px 14px rgba(0,0,0,0.25);
      border:3px solid #fff;
      transition:transform 0.2s;
    ">${count}</div>`,
    className: "custom-cluster-icon",
    iconSize: L.point(size, size),
    iconAnchor: [size / 2, size / 2],
  });
};

// Icona custom pentru job
const jobIcon = (color, emoji) => L.divIcon({
  className: "",
  html: `<div style="background:${color};color:#fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 3px 10px rgba(0,0,0,0.25);border:3px solid #fff;">${emoji}</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Buton localizare
function LocateUser({ onLocate, label }) {
  const { t } = useTranslation("t");
  const map = useMap();
  return (
    <button data-testid="map-locate-btn" onClick={() => {
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
      {label || t("map_my_location")}
    </button>
  );
}

// Fly to selected job
function FlyToJob({ job }) {
  const map = useMap();
  useEffect(() => {
    if (job?.lat && job?.lng) map.flyTo([job.lat, job.lng], 15, { duration: 0.8 });
  }, [job, map]);
  return null;
}

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

export default function MapPage({ navigate, update }) {
  const { t } = useTranslation("t");
  const [jobs, setJobs]         = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter]     = useState("all");
  const [userPos, setUserPos]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [radius, setRadius]     = useState(50);
  const [mapSize, setMapSize]   = useState("normal");

  const cats = useMemo(() => ["all", ...new Set(jobs.map(j => j.category).filter(Boolean))], [jobs]);
  const filtered = useMemo(() => {
    let list = filter === "all" ? jobs : jobs.filter(j => j.category === filter);
    return list.filter(j => j.lat && j.lng);
  }, [jobs, filter]);

  useEffect(() => {
    const params = {};
    if (userPos) { params.lat = userPos[0]; params.lng = userPos[1]; params.radius = radius; }
    api.get("/jobs", { params })
      .then(r => setJobs(r.data.jobs || r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userPos, radius]);

  const center = userPos || [38.3452, -0.4810]; // Alicante, España
  const jobCount = filtered.length;

  return (
    <div data-testid="map-page" style={{ display:"flex", height: mapSize === "full" ? "calc(100vh - 58px)" : mapSize === "compact" ? 320 : "calc(100vh - 130px)", transition: "height 0.3s ease", flexDirection: mapSize === "compact" ? "column" : "row" }}>
      {/* Resize controls */}
      <div style={{ position:"absolute", top:8, right:8, zIndex:50, display:"flex", gap:4 }}>
        {["compact","normal","full"].map(sz => (
          <button key={sz} data-testid={`map-size-${sz}`} onClick={() => setMapSize(sz)} style={{
            padding:"5px 10px", borderRadius:7, border: mapSize === sz ? `1.5px solid ${T.green}` : `1px solid ${T.border}`,
            cursor:"pointer", fontSize:11, fontWeight:700, background: mapSize === sz ? `${T.green}15` : T.bg,
            color: mapSize === sz ? T.green : T.text3,
          }}>{sz === "compact" ? "⊖" : sz === "full" ? "⊕" : "◻"}</button>
        ))}
      </div>

      {/* Sidebar — hidden in compact mode */}
      {mapSize !== "compact" && (
      <div className="jc-map-sidebar" style={{ width:320, background:"#fff", borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Header cu stats */}
        <div style={{ padding:"14px 14px 8px", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.text3, textTransform:"uppercase", letterSpacing:"0.05em" }}>
              {t("map_filter","Filtrare")}
            </div>
            <div data-testid="map-job-count" style={{ fontSize:11, fontWeight:700, color:T.green, background:`${T.green}12`, borderRadius:999, padding:"2px 10px" }}>
              {jobCount} {jobCount === 1 ? t("map_job_singular","empleo") : t("map_job_plural","empleos")}
            </div>
          </div>

          {/* Filter chips */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
            {cats.map(c => (
              <button data-testid={`map-filter-${c}`} key={c} onClick={() => setFilter(c)} style={{
                padding:"4px 11px", borderRadius:20, border:"none", cursor:"pointer", fontSize:11, fontWeight:600,
                background: filter===c ? T.green : "#f5f5f4",
                color: filter===c ? "#fff" : T.text2,
                transition:"all 0.15s",
              }}>{c === "all" ? t("map_all","Toate") : c}</button>
            ))}
          </div>

          {/* Radius slider (only when geolocated) */}
          {userPos && (
            <div data-testid="map-radius-filter" style={{ marginBottom:4 }}>
              <div style={{ fontSize:11, fontWeight:600, color:T.text2, marginBottom:5, display:"flex", justifyContent:"space-between" }}>
                <span>{t("map_radius","Radio")}: {radius} km</span>
              </div>
              <div style={{ display:"flex", gap:5 }}>
                {RADIUS_OPTIONS.map(r => (
                  <button data-testid={`map-radius-${r}`} key={r} onClick={() => setRadius(r)} style={{
                    flex:1, padding:"4px 0", borderRadius:6, border:"none", cursor:"pointer",
                    fontSize:10, fontWeight:700,
                    background: radius===r ? T.blue : "#f1f5f9",
                    color: radius===r ? "#fff" : T.text3,
                    transition:"all 0.15s",
                  }}>{r}km</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Job list */}
        <div data-testid="map-job-list" style={{ flex:1, overflowY:"auto" }}>
          {loading && <div style={{ padding:20, color:T.text3, fontSize:13 }}>{t("map_loading","Se incarca...")}</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ padding:20, color:T.text3, fontSize:13, textAlign:"center" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>📍</div>
              {t("map_no_jobs","Niciun job in aceasta zona.")}
            </div>
          )}
          {filtered.map(job => (
            <div data-testid={`map-job-item-${job.id}`} key={job.id} onClick={() => setSelected(job)} style={{
              padding:"12px 14px", borderBottom:`1px solid ${T.border}`, cursor:"pointer",
              background: selected?.id === job.id ? `${T.green}08` : "transparent",
              borderLeft: selected?.id === job.id ? `3px solid ${T.green}` : "3px solid transparent",
              transition:"all 0.15s",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:38, height:38, borderRadius:10, background:job.color||T.green, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, color:"#fff" }}>
                  {job.icon || "💼"}
                </div>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {job.title}
                    {job.is_demo && <span style={{ marginLeft:6, background:"#94a3b8", color:"#fff", borderRadius:999, padding:"1px 6px", fontSize:8, fontWeight:700, verticalAlign:"middle" }}>DEMO</span>}
                  </div>
                  <div style={{ fontSize:11, color:T.text3 }}>
                    {job.employer || job.category}
                    {job.distance != null && ` · ${job.distance} km`}
                  </div>
                </div>
                <div style={{ marginLeft:"auto", fontWeight:800, fontSize:14, color:job.color||T.green, whiteSpace:"nowrap" }}>{job.salary} RON</div>
              </div>
              {job.urgent && <span style={{ fontSize:10, background:"#fef3c7", color:"#d97706", fontWeight:700, borderRadius:4, padding:"2px 6px", marginTop:4, display:"inline-block" }}>⚡ URGENT</span>}
            </div>
          ))}
        </div>

        {/* Job detail panel */}
        {selected && (
          <div data-testid="map-job-detail" style={{ borderTop:`2px solid ${T.green}22`, padding:14, background:"#fafaf9", overflowY:"auto", maxHeight:"45%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
              <div style={{ fontWeight:800, fontSize:15, color:T.text }}>{selected.title}</div>
              <button data-testid="map-close-detail" onClick={() => setSelected(null)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, color:T.text3 }}>✕</button>
            </div>
            <div style={{ fontSize:12, color:T.text3, marginBottom:4 }}>{selected.employer || t("map_employer","Empleador")} · {selected.category}</div>
            <div style={{ fontSize:16, fontWeight:800, color:selected.color||T.green, marginBottom:6 }}>{selected.salary} RON/{t("map_day","día")}</div>
            {selected.description && <div style={{ fontSize:12, color:T.text2, marginBottom:8, lineHeight:1.5 }}>{selected.description}</div>}
            {selected.skills?.length > 0 && (
              <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:10 }}>
                {selected.skills.map(s=><span key={s} style={{ background:`${selected.color||T.green}18`, color:selected.color||T.green, borderRadius:999, padding:"2px 8px", fontSize:10, fontWeight:700 }}>{s}</span>)}
              </div>
            )}
            {selected.distance != null && (
              <div style={{ fontSize:12, color:T.blue, fontWeight:700, marginBottom:10 }}>📍 {selected.distance} km {t("map_distance","distancia")}</div>
            )}
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <button data-testid="map-apply-escrow" onClick={() => { update({ selectedJob: selected }); navigate("escrow"); }} style={{
                padding:"9px", borderRadius:8, border:"none", cursor:"pointer",
                background:T.green, color:"#fff", fontWeight:700, fontSize:12,
              }}>🔒 {t("home_apply","Solicitar")} + Escrow</button>
              <div style={{ display:"flex", gap:6 }}>
                <button data-testid="map-contract-btn" onClick={() => { update({ selectedJob: selected }); navigate("contract"); }} style={{
                  flex:1, padding:"7px", borderRadius:8, border:`1px solid ${T.border}`, cursor:"pointer",
                  background:"#fff", color:T.text2, fontWeight:600, fontSize:12,
                }}>📝 {t("nav_contract","Contrato")}</button>
                <button data-testid="map-chat-btn" onClick={() => navigate("chat")} style={{
                  flex:1, padding:"7px", borderRadius:8, border:`1px solid ${T.border}`, cursor:"pointer",
                  background:"#fff", color:T.text2, fontWeight:600, fontSize:12,
                }}>💬 {t("nav_chat","Mensaje")}</button>
              </div>
              {/* Google Maps navigation button */}
              <button data-testid="map-gmaps-btn" onClick={() => {
                const dest = `${selected.lat},${selected.lng}`;
                const origin = userPos ? `${userPos[0]},${userPos[1]}` : "";
                const url = origin
                  ? `https://www.google.com/maps/dir/${origin}/${dest}`
                  : `https://www.google.com/maps/search/?api=1&query=${dest}`;
                window.open(url, "_blank");
              }} style={{
                width:"100%", padding:"9px", borderRadius:8, border:"none", cursor:"pointer",
                background:"linear-gradient(135deg,#4285F4,#34A853)", color:"#fff", fontWeight:700, fontSize:12,
                display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                boxShadow:"0 3px 10px rgba(66,133,244,0.3)",
              }}>
                🗺️ {t("map_open_gmaps")}
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Harta cu Clustering */}
      <div style={{ flex:1, position:"relative" }}>
        <MapContainer center={center} zoom={13} style={{ height:"100%", width:"100%" }} data-testid="map-container">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Marker Cluster Group */}
          <MarkerClusterGroup
            chunkedLoading
            iconCreateFunction={createClusterIcon}
            maxClusterRadius={60}
            spiderfyOnMaxZoom
            showCoverageOnHover={false}
            zoomToBoundsOnClick
            animate
          >
            {filtered.map(job => (
              <Marker
                key={job.id}
                position={[job.lat, job.lng]}
                icon={jobIcon(job.color || T.green, job.icon || "💼")}
                eventHandlers={{ click: () => setSelected(job) }}
              >
                <Popup>
                  <div style={{ minWidth:160, fontFamily:"DM Sans, sans-serif" }}>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{job.title}</div>
                    <div style={{ color:T.text3, fontSize:12 }}>{job.employer || job.category}</div>
                    <div style={{ color:job.color||T.green, fontWeight:800, fontSize:15, marginTop:4 }}>{job.salary} RON</div>
                    {job.urgent && <div style={{ color:"#d97706", fontSize:11, fontWeight:700, marginTop:2 }}>⚡ URGENT</div>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>

          {/* User position marker */}
          {userPos && (
            <>
              <Marker position={userPos} icon={L.divIcon({
                className:"",
                html:`<div style="background:#3b82f6;border:3px solid #fff;border-radius:50%;width:18px;height:18px;box-shadow:0 0 0 6px rgba(59,130,246,0.3)"></div>`,
                iconSize:[18,18], iconAnchor:[9,9],
              })}/>
              <Circle center={userPos} radius={radius * 1000} pathOptions={{
                color: T.blue, fillColor: T.blue, fillOpacity: 0.06, weight: 1.5, dashArray: "6 4",
              }}/>
            </>
          )}

          <FlyToJob job={selected} />
          <LocateUser onLocate={setUserPos} label={t("map_locate","📍 Locatia mea")}/>
        </MapContainer>

        {/* Legend overlay */}
        <div data-testid="map-cluster-legend" style={{
          position:"absolute", bottom:16, left:16, zIndex:1000,
          background:"rgba(255,255,255,0.92)", backdropFilter:"blur(8px)",
          borderRadius:10, padding:"10px 14px", fontSize:11, color:T.text2,
          border:`1px solid ${T.border}`, boxShadow:"0 2px 10px rgba(0,0,0,0.08)",
        }}>
          <div style={{ fontWeight:700, color:T.text, marginBottom:5, fontSize:12 }}>Clustering</div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            {[
              { color:T.green, label:"1-4" },
              { color:T.purple, label:"5-9" },
              { color:T.blue, label:"10-19" },
              { color:"#d97706", label:"20+" },
            ].map(l => (
              <div key={l.label} style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ width:12, height:12, borderRadius:"50%", background:l.color, border:"2px solid #fff", boxShadow:`0 0 0 2px ${l.color}33` }}/>
                <span>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
