import { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import api from "../services/api";
import { useTranslation } from "react-i18next";

// Fix Leaflet icons with Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl:       require("leaflet/dist/images/marker-icon.png"),
  shadowUrl:     require("leaflet/dist/images/marker-shadow.png"),
});

const T = {
  green:"#059669", greenDark:"#047857", dark:"#0f172a", text:"#1c1917",
  text2:"#57534e", text3:"#a8a29e", border:"#e7e5e4", bg:"#fafaf9",
  amber:"#f59e0b", blue:"#3b82f6", blueDark:"#1d4ed8", purple:"#8b5cf6", red:"#ef4444",
};

// Privacy offset ±300m (deterministic per item id) — blurs exact address
function privacyOffset(id) {
  const seed = String(id).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const angle = (seed % 360) * (Math.PI / 180);
  const dist = 0.0018 + ((seed % 100) / 100) * 0.0009; // 200-300m
  return { dLat: Math.sin(angle) * dist, dLng: Math.cos(angle) * dist };
}

// Cluster icon
const createClusterIcon = (mode) => (cluster) => {
  const count = cluster.getChildCount();
  const base = mode === "workers" ? T.green : T.blue;
  let size = 36, bg = base, ring = `${base}40`;
  if (count >= 20) { size = 50; bg = "#d97706"; ring = "rgba(217,119,6,0.25)"; }
  else if (count >= 10) { size = 44; bg = T.purple; ring = "rgba(139,92,246,0.25)"; }
  else if (count >= 5) { size = 40; }
  return L.divIcon({
    html: `<div style="background:${bg};color:#fff;border-radius:50%;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${size>44?16:13}px;font-family:DM Sans,sans-serif;box-shadow:0 0 0 6px ${ring},0 4px 14px rgba(0,0,0,0.25);border:3px solid #fff;">${count}</div>`,
    className: "custom-cluster-icon",
    iconSize: L.point(size, size),
    iconAnchor: [size / 2, size / 2],
  });
};

// Pin icons
const jobIcon = (color, emoji) => L.divIcon({
  className: "",
  html: `<div style="background:${color};color:#fff;border-radius:50% 50% 50% 0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 3px 10px rgba(0,0,0,0.3);border:3px solid #fff;transform:rotate(-45deg);"><span style="transform:rotate(45deg);">${emoji}</span></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

const workerIcon = (initials, highlight, isOnline) => L.divIcon({
  className: "",
  html: `<div style="position:relative;background:${highlight?T.greenDark:T.green};color:#fff;border-radius:50%;width:${highlight?42:36}px;height:${highlight?42:36}px;display:flex;align-items:center;justify-content:center;font-size:${highlight?14:12}px;font-weight:800;box-shadow:0 3px 10px rgba(5,150,105,0.4),0 0 0 ${highlight?4:0}px rgba(5,150,105,0.25);border:3px solid #fff;">${initials}${isOnline ? `<span style="position:absolute;top:-2px;right:-2px;background:#22c55e;border:2px solid #fff;border-radius:50%;width:12px;height:12px;box-shadow:0 0 0 2px rgba(34,197,94,0.35);"></span>` : ""}</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Map helpers
function LocateUser({ onLocate, label }) {
  const map = useMap();
  return (
    <button data-testid="map-locate-btn" onClick={() => {
      navigator.geolocation?.getCurrentPosition(pos => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 14);
        onLocate([pos.coords.latitude, pos.coords.longitude]);
      });
    }} style={{
      position:"absolute", bottom:16, right:16, zIndex:1000,
      background:T.green, color:"#fff", border:"none", borderRadius:"50%",
      width:44, height:44, cursor:"pointer", fontSize:18,
      boxShadow:"0 4px 14px rgba(5,150,105,0.5)",
      display:"flex", alignItems:"center", justifyContent:"center",
    }} title={label}>
      📍
    </button>
  );
}

function FlyToItem({ item }) {
  const map = useMap();
  useEffect(() => {
    if (item?.lat && item?.lng) map.flyTo([item.lat, item.lng], 15, { duration: 0.8 });
  }, [item, map]);
  return null;
}

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];
const SORT_OPTIONS = ["distance", "price_asc", "price_desc"];

export default function MapPage({ navigate, update }) {
  const { t } = useTranslation("t");
  const [mode, setMode]         = useState("jobs"); // "jobs" | "workers"
  const [jobs, setJobs]         = useState([]);
  const [workers, setWorkers]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter]     = useState("all");
  const [sort, setSort]         = useState("distance");
  const [userPos, setUserPos]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [radius, setRadius]     = useState(50);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const listItemRefs = useRef({});

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Load data based on mode
  useEffect(() => {
    setLoading(true);
    setSelected(null);
    const params = {};
    if (userPos) { params.lat = userPos[0]; params.lng = userPos[1]; params.radius = radius; }
    if (mode === "workers" && onlineOnly) params.online_only = "true";

    const endpoint = mode === "workers" ? "/workers/available" : "/jobs";
    api.get(endpoint, { params })
      .then(r => {
        if (mode === "workers") {
          setWorkers(r.data.workers || []);
        } else {
          setJobs(r.data.jobs || r.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userPos, radius, mode, onlineOnly]);

  // Normalize id across jobs (_id) and workers (id)
  const idOf = (item) => item._id || item.id;

  // Source list based on mode
  const sourceList = mode === "workers" ? workers : jobs;

  // Categories for filter chips
  const cats = useMemo(() => {
    if (mode === "workers") {
      const set = new Set();
      workers.forEach(w => (w.skills || []).forEach(s => set.add(s)));
      return ["all", ...set];
    }
    return ["all", ...new Set(jobs.map(j => j.category).filter(Boolean))];
  }, [jobs, workers, mode]);

  // Filter + sort list
  const filtered = useMemo(() => {
    let list = sourceList.filter(i => i.lat && i.lng);
    if (filter !== "all") {
      if (mode === "workers") {
        list = list.filter(w => (w.skills || []).includes(filter));
      } else {
        list = list.filter(j => j.category === filter);
      }
    }
    // Sort
    const priceKey = mode === "workers" ? "hourly_rate" : "salary";
    list = [...list].sort((a, b) => {
      if (sort === "distance") return (a.distance ?? 999) - (b.distance ?? 999);
      if (sort === "price_asc") return (a[priceKey] || 0) - (b[priceKey] || 0);
      if (sort === "price_desc") return (b[priceKey] || 0) - (a[priceKey] || 0);
      return 0;
    });
    // Put selected first
    if (selected) {
      const selId = idOf(selected);
      list = [
        ...list.filter(i => idOf(i) === selId),
        ...list.filter(i => idOf(i) !== selId),
      ];
    }
    return list;
  }, [sourceList, filter, sort, selected, mode]);

  // Auto-scroll selected into view
  useEffect(() => {
    const sid = selected ? idOf(selected) : null;
    if (sid && listItemRefs.current[sid]) {
      listItemRefs.current[sid].scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selected]);

  const center = userPos || [38.3452, -0.4810]; // Alicante, España
  const itemCount = filtered.length;
  const modeColor = mode === "workers" ? T.green : T.blue;

  // Render pin
  const renderPin = (item) => {
    const iid = idOf(item);
    const off = privacyOffset(iid);
    const lat = item.lat + off.dLat;
    const lng = item.lng + off.dLng;
    const isSelected = selected && idOf(selected) === iid;
    return (
      <Marker
        key={iid}
        position={[lat, lng]}
        icon={mode === "workers"
          ? workerIcon(item.initials || "??", isSelected, item.is_online)
          : jobIcon(item.color || T.blue, item.icon || "💼")}
        eventHandlers={{ click: () => setSelected(item) }}
      >
        <Popup>
          <div style={{ minWidth:160, fontFamily:"DM Sans, sans-serif" }}>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>
              {mode === "workers" ? item.name : item.title}
            </div>
            <div style={{ color:T.text3, fontSize:12 }}>
              {mode === "workers"
                ? `⭐ ${item.rating?.toFixed(1) || "—"} · ${item.reviews_count || 0} reseñas`
                : (item.employer || item.category)}
            </div>
            <div style={{ color:modeColor, fontWeight:800, fontSize:15, marginTop:4 }}>
              {mode === "workers" ? `${item.hourly_rate} €/h` : `${item.salary} €`}
            </div>
            {mode === "jobs" && item.urgent && <div style={{ color:"#d97706", fontSize:11, fontWeight:700, marginTop:2 }}>⚡ URGENT</div>}
          </div>
        </Popup>
      </Marker>
    );
  };

  // ============ LIST ITEM (shared between mobile & desktop) ============
  const ListItem = ({ item }) => {
    const iid = idOf(item);
    const isSelected = selected && idOf(selected) === iid;
    const isWorker = mode === "workers";
    return (
      <div
        ref={el => { if (el) listItemRefs.current[iid] = el; }}
        data-testid={`map-list-item-${iid}`}
        onClick={() => setSelected(item)}
        style={{
          padding:"12px 14px", borderBottom:`1px solid ${T.border}`, cursor:"pointer",
          background: isSelected ? `${modeColor}10` : "transparent",
          borderLeft: isSelected ? `4px solid ${modeColor}` : "4px solid transparent",
          transition:"all 0.15s",
        }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:40, height:40, borderRadius: isWorker ? "50%" : 10,
            background: isWorker ? T.green : (item.color || T.blue),
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize: isWorker ? 13 : 18, fontWeight: 800,
            flexShrink:0, color:"#fff", position:"relative",
          }}>
            {isWorker ? (item.initials || "??") : (item.icon || "💼")}
            {isWorker && item.is_online && (
              <span data-testid={`worker-online-dot-${iid}`} style={{
                position:"absolute", top:-2, right:-2,
                background:"#22c55e", border:"2px solid #fff", borderRadius:"50%",
                width:12, height:12, boxShadow:"0 0 0 2px rgba(34,197,94,0.3)",
              }}/>
            )}
          </div>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontWeight:700, fontSize:13, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {isWorker ? item.name : item.title}
              {item.is_demo && <span style={{ marginLeft:6, background:"#94a3b8", color:"#fff", borderRadius:999, padding:"1px 6px", fontSize:8, fontWeight:700, verticalAlign:"middle" }}>DEMO</span>}
              {isWorker && item.verified && <span style={{ marginLeft:6, color:T.green, fontSize:11 }}>✓</span>}
              {isWorker && item.is_online && (
                <span style={{
                  marginLeft:6, background:"#dcfce7", color:"#166534",
                  borderRadius:999, padding:"1px 7px", fontSize:9, fontWeight:800,
                  verticalAlign:"middle", whiteSpace:"nowrap",
                }}>🟢 {t("map_online_now","Disponible")}</span>
              )}
            </div>
            <div style={{ fontSize:11, color:T.text3, display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
              {isWorker ? (
                <>
                  <span>⭐ {item.rating?.toFixed(1) || "—"}</span>
                  <span>·</span>
                  <span>{(item.skills || []).slice(0, 2).join(", ")}</span>
                </>
              ) : (
                <>{item.employer || item.category}</>
              )}
              {item.distance != null && <><span>·</span><span>{item.distance} km</span></>}
            </div>
          </div>
          <div style={{ marginLeft:"auto", fontWeight:800, fontSize:14, color:modeColor, whiteSpace:"nowrap" }}>
            {isWorker ? `${item.hourly_rate} €/h` : `${item.salary} €`}
          </div>
        </div>
        {mode === "jobs" && item.urgent && <span style={{ fontSize:10, background:"#fef3c7", color:"#d97706", fontWeight:700, borderRadius:4, padding:"2px 6px", marginTop:4, display:"inline-block" }}>⚡ URGENT</span>}

        {/* Inline actions for selected item */}
        {isSelected && (
          <div data-testid={`map-actions-${iid}`} style={{ marginTop:10, display:"flex", flexDirection:"column", gap:6 }}>
            {!isWorker && (
              <>
                {item.description && <div style={{ fontSize:12, color:T.text2, lineHeight:1.5, marginBottom:4 }}>{item.description}</div>}
                <button data-testid="map-apply-escrow" onClick={(e) => { e.stopPropagation(); update({ selectedJob: item }); navigate("escrow"); }}
                  style={{ padding:"9px", borderRadius:8, border:"none", cursor:"pointer", background:T.green, color:"#fff", fontWeight:700, fontSize:12 }}>
                  🔒 {t("home_apply","Solicitar")} + Escrow
                </button>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={(e) => { e.stopPropagation(); update({ selectedJob: item }); navigate("contract"); }}
                    style={{ flex:1, padding:"7px", borderRadius:8, border:`1px solid ${T.border}`, cursor:"pointer", background:"#fff", color:T.text2, fontWeight:600, fontSize:12 }}>
                    📝 {t("nav_contract","Contrato")}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); navigate("chat"); }}
                    style={{ flex:1, padding:"7px", borderRadius:8, border:`1px solid ${T.border}`, cursor:"pointer", background:"#fff", color:T.text2, fontWeight:600, fontSize:12 }}>
                    💬 {t("nav_chat","Mensaje")}
                  </button>
                </div>
              </>
            )}
            {isWorker && (
              <button onClick={(e) => { e.stopPropagation(); navigate("chat"); }}
                style={{ padding:"9px", borderRadius:8, border:"none", cursor:"pointer", background:T.green, color:"#fff", fontWeight:700, fontSize:12 }}>
                💬 Contactar prestador
              </button>
            )}
            {/* Google Maps navigation */}
            <button onClick={(e) => {
              e.stopPropagation();
              const dest = `${item.lat},${item.lng}`;
              const origin = userPos ? `${userPos[0]},${userPos[1]}` : "";
              const url = origin ? `https://www.google.com/maps/dir/${origin}/${dest}` : `https://www.google.com/maps/search/?api=1&query=${dest}`;
              window.open(url, "_blank");
            }} style={{
              width:"100%", padding:"8px", borderRadius:8, border:"none", cursor:"pointer",
              background:"linear-gradient(135deg,#4285F4,#34A853)", color:"#fff", fontWeight:700, fontSize:12,
              boxShadow:"0 3px 10px rgba(66,133,244,0.25)",
            }}>🗺️ {t("map_open_gmaps","Abrir en Google Maps")}</button>
          </div>
        )}
      </div>
    );
  };

  // ============ FILTERS BAR (shared) ============
  const FiltersBar = () => (
    <div style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, background:"#fff" }}>
      {/* Mode toggle */}
      <div style={{ display:"flex", gap:6, marginBottom:8, background:"#f5f5f4", borderRadius:10, padding:3 }}>
        <button data-testid="map-mode-jobs" onClick={() => setMode("jobs")} style={{
          flex:1, padding:"7px", borderRadius:8, border:"none", cursor:"pointer",
          background: mode === "jobs" ? T.blue : "transparent",
          color: mode === "jobs" ? "#fff" : T.text2,
          fontWeight:700, fontSize:12, transition:"all 0.15s",
        }}>📍 {t("map_mode_jobs","Empleos")}</button>
        <button data-testid="map-mode-workers" onClick={() => setMode("workers")} style={{
          flex:1, padding:"7px", borderRadius:8, border:"none", cursor:"pointer",
          background: mode === "workers" ? T.green : "transparent",
          color: mode === "workers" ? "#fff" : T.text2,
          fontWeight:700, fontSize:12, transition:"all 0.15s",
        }}>👷 {t("map_mode_workers","Prestadores")}</button>
      </div>

      {/* Stats + sort */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, gap:6, flexWrap:"wrap" }}>
        <div data-testid="map-count" style={{ fontSize:11, fontWeight:700, color:modeColor, background:`${modeColor}12`, borderRadius:999, padding:"3px 10px" }}>
          {itemCount} {mode === "workers" ? t("map_workers_count","prestadores") : (itemCount === 1 ? t("map_job_singular","empleo") : t("map_job_plural","empleos"))}
        </div>
        {mode === "workers" && (
          <button data-testid="map-online-only-toggle" onClick={() => setOnlineOnly(v => !v)} style={{
            padding:"4px 9px", borderRadius:999, border:`1.5px solid ${onlineOnly ? "#16a34a" : T.border}`,
            background: onlineOnly ? "#dcfce7" : "#fff", cursor:"pointer",
            fontSize:10, fontWeight:700, color: onlineOnly ? "#166534" : T.text3,
            display:"flex", alignItems:"center", gap:4, transition:"all 0.15s",
          }}>
            <span style={{
              width:7, height:7, borderRadius:"50%",
              background: onlineOnly ? "#22c55e" : "#cbd5e1",
              boxShadow: onlineOnly ? "0 0 0 2px rgba(34,197,94,0.25)" : "none",
            }}/>
            {t("map_online_only","Solo online")}
          </button>
        )}
        <select data-testid="map-sort" value={sort} onChange={e => setSort(e.target.value)} style={{
          padding:"4px 8px", borderRadius:7, border:`1px solid ${T.border}`, fontSize:11,
          background:"#fff", fontWeight:600, color:T.text2, outline:"none", cursor:"pointer",
        }}>
          <option value="distance">📍 {t("map_sort_distance","Distancia")}</option>
          <option value="price_asc">💰 {t("map_sort_price_asc","Precio ↑")}</option>
          <option value="price_desc">💰 {t("map_sort_price_desc","Precio ↓")}</option>
        </select>
      </div>

      {/* Category chips */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom: userPos ? 8 : 0, maxHeight: 60, overflowY:"auto" }}>
        {cats.slice(0, 10).map(c => (
          <button data-testid={`map-filter-${c}`} key={c} onClick={() => setFilter(c)} style={{
            padding:"4px 11px", borderRadius:20, border:"none", cursor:"pointer", fontSize:11, fontWeight:600,
            background: filter===c ? modeColor : "#f5f5f4",
            color: filter===c ? "#fff" : T.text2,
            transition:"all 0.15s",
          }}>{c === "all" ? t("map_all","Todos") : c}</button>
        ))}
      </div>

      {/* Radius */}
      {userPos && (
        <div data-testid="map-radius-filter">
          <div style={{ fontSize:10, fontWeight:700, color:T.text3, marginBottom:4, textTransform:"uppercase" }}>
            {t("map_radius","Radio")}: {radius} km
          </div>
          <div style={{ display:"flex", gap:4 }}>
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
  );

  // ============ MAP (shared) ============
  const MapBlock = ({ height }) => (
    <div style={{ height, width:"100%", position:"relative" }}>
      <MapContainer center={center} zoom={13} style={{ height:"100%", width:"100%" }} data-testid="map-container" key={mode}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterIcon(mode)}
          maxClusterRadius={60}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
          zoomToBoundsOnClick
          animate
        >
          {filtered.map(renderPin)}
        </MarkerClusterGroup>

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

        <FlyToItem item={selected} />
        <LocateUser onLocate={setUserPos} label={t("map_locate","Mi ubicación")}/>
      </MapContainer>

      {/* Privacy note overlay */}
      <div data-testid="map-privacy-note" style={{
        position:"absolute", top:10, left:10, zIndex:900,
        background:"rgba(255,255,255,0.92)", backdropFilter:"blur(6px)",
        borderRadius:8, padding:"5px 10px", fontSize:10, color:T.text3,
        border:`1px solid ${T.border}`, fontWeight:600,
      }}>
        🔒 {t("map_privacy","Ubicación aproximada ±300m")}
      </div>
    </div>
  );

  // ================= MOBILE LAYOUT (split top/bottom) =================
  if (isMobile) {
    return (
      <div data-testid="map-page-mobile" style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 120px)" }}>
        {/* Top: Map (45%) */}
        <div style={{ height:"45%", minHeight:200, flexShrink:0 }}>
          <MapBlock height="100%" />
        </div>

        {/* Bottom: Filters + List (55%) */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", background:T.bg, overflow:"hidden" }}>
          <FiltersBar />
          <div data-testid="map-list-mobile" style={{ flex:1, overflowY:"auto", background:"#fff" }}>
            {loading && <div style={{ padding:20, color:T.text3, fontSize:13, textAlign:"center" }}>{t("map_loading","Cargando...")}</div>}
            {!loading && filtered.length === 0 && (
              <div style={{ padding:30, color:T.text3, fontSize:13, textAlign:"center" }}>
                <div style={{ fontSize:36, marginBottom:8 }}>📍</div>
                {mode === "workers" ? t("map_no_workers","No hay prestadores en esta zona.") : t("map_no_jobs","No hay empleos en esta zona.")}
              </div>
            )}
            {filtered.map(item => <ListItem key={idOf(item)} item={item} />)}
          </div>
        </div>
      </div>
    );
  }

  // ================= DESKTOP LAYOUT (sidebar + map) =================
  return (
    <div data-testid="map-page" style={{ display:"flex", height:"calc(100vh - 130px)" }}>
      {/* Left sidebar */}
      <div className="jc-map-sidebar" style={{ width:340, background:"#fff", borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", overflow:"hidden", flexShrink:0 }}>
        <FiltersBar />
        <div data-testid="map-list" style={{ flex:1, overflowY:"auto" }}>
          {loading && <div style={{ padding:20, color:T.text3, fontSize:13 }}>{t("map_loading","Cargando...")}</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ padding:20, color:T.text3, fontSize:13, textAlign:"center" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>📍</div>
              {mode === "workers" ? t("map_no_workers","No hay prestadores en esta zona.") : t("map_no_jobs","No hay empleos en esta zona.")}
            </div>
          )}
          {filtered.map(item => <ListItem key={idOf(item)} item={item} />)}
        </div>
      </div>

      {/* Map */}
      <div style={{ flex:1, position:"relative" }}>
        <MapBlock height="100%" />
      </div>
    </div>
  );
}
