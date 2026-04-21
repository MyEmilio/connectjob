import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import api from "../services/api";

const T = {
  green:"#059669", greenDark:"#047857", text:"#1c1917", text2:"#57534e", text3:"#a8a29e",
  border:"#e7e5e4", red:"#ef4444", white:"#fff",
};

const SKILLS_OPTIONS = [
  "Limpieza","Jardinería","Construcción","Electricidad","Fontanería","Pintura",
  "Carpintería","Cuidado niños","Cocina","Transporte","Mudanzas",
  "Paseo perros","Cuidado mascotas","Enseñanza","Diseño","Informática",
];

// Draggable + click-to-set marker
function LocationPicker({ lat, lng, onChange }) {
  useMapEvents({
    click(e) { onChange(e.latlng.lat, e.latlng.lng); },
  });
  if (!lat || !lng) return null;
  return (
    <Marker
      position={[lat, lng]}
      draggable={true}
      eventHandlers={{
        dragend: (e) => { const p = e.target.getLatLng(); onChange(p.lat, p.lng); },
      }}
      icon={L.divIcon({
        className:"",
        html:`<div style="background:#059669;color:#fff;border-radius:50% 50% 50% 0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 10px rgba(0,0,0,0.35);border:3px solid #fff;transform:rotate(-45deg);"><span style="transform:rotate(45deg);">📍</span></div>`,
        iconSize:[36,36], iconAnchor:[18,36],
      })}
    />
  );
}

function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => { if (lat && lng) map.setView([lat, lng], 14); }, [lat, lng, map]);
  return null;
}

/**
 * Modal for provider to set/edit their map location + skills + hourly rate.
 */
export default function ProviderLocationModal({ open, onClose, onSaved }) {
  const { t } = useTranslation("t");
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [lat, setLat]           = useState(null);
  const [lng, setLng]           = useState(null);
  const [city, setCity]         = useState("");
  const [rate, setRate]         = useState(0);
  const [skills, setSkills]     = useState([]);
  const [description, setDescription] = useState("");
  const [error, setError]       = useState("");
  const firstLoad = useRef(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get("/provider-profile").then(r => {
      const p = r.data || {};
      setLat(p.lat || null);
      setLng(p.lng || null);
      setCity(p.city || "");
      setRate(p.hourly_rate || 0);
      setSkills(p.service_categories || []);
      setDescription(p.description || "");
    }).catch(() => {}).finally(() => { setLoading(false); firstLoad.current = false; });
  }, [open]);

  const detectLocation = () => {
    if (!navigator.geolocation) return setError(t("loc_no_gps","Tu dispositivo no soporta geolocalización."));
    setError("");
    navigator.geolocation.getCurrentPosition(
      pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); },
      () => setError(t("loc_denied","No se pudo acceder a tu ubicación. Permite el acceso GPS en tu navegador.")),
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const save = async () => {
    setSaving(true); setError("");
    try {
      await api.put("/provider-profile", {
        lat, lng, city, hourly_rate: rate,
        service_categories: skills, description,
      });
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.error || t("loc_save_error","Error al guardar perfil"));
    } finally { setSaving(false); }
  };

  if (!open) return null;

  const center = lat && lng ? [lat, lng] : [38.3452, -0.4810]; // Alicante default

  return (
    <div data-testid="provider-location-modal" style={{
      position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.55)",
      backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:12,
    }}>
      <div style={{
        background:T.white, borderRadius:16, width:"min(720px, 100%)",
        maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"Outfit,sans-serif", fontSize:17, fontWeight:800, color:T.text }}>
              📍 {t("loc_title","Mi ubicación y perfil")}
            </div>
            <div style={{ fontSize:11, color:T.text3, marginTop:2 }}>
              {t("loc_subtitle","Pon tu ubicación aproximada en el mapa (±300m visibles a otros).")}
            </div>
          </div>
          <button onClick={onClose} style={{
            border:"none", background:"transparent", cursor:"pointer",
            color:T.text3, fontSize:20, padding:4,
          }}>✕</button>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex:1, overflowY:"auto", padding:16 }}>
          {loading ? (
            <div style={{ padding:40, textAlign:"center", color:T.text3 }}>{t("loading","Cargando...")}</div>
          ) : (
            <>
              {/* Map */}
              <div style={{ height:280, borderRadius:12, overflow:"hidden", border:`1px solid ${T.border}`, marginBottom:12, position:"relative" }}>
                <MapContainer center={center} zoom={lat && lng ? 14 : 12} style={{ height:"100%", width:"100%" }}>
                  <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
                  <LocationPicker lat={lat} lng={lng} onChange={(a, b) => { setLat(a); setLng(b); }}/>
                  <Recenter lat={lat} lng={lng}/>
                </MapContainer>
                <div style={{
                  position:"absolute", top:8, left:8, zIndex:500,
                  background:"rgba(255,255,255,0.93)", backdropFilter:"blur(6px)",
                  padding:"4px 10px", borderRadius:8, fontSize:10, fontWeight:700,
                  color:T.text3, border:`1px solid ${T.border}`,
                }}>
                  {lat && lng
                    ? `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}`
                    : t("loc_click_map","Haz clic en el mapa o detecta tu ubicación")}
                </div>
                <button data-testid="loc-detect-btn" onClick={detectLocation} style={{
                  position:"absolute", bottom:10, right:10, zIndex:500,
                  background:T.green, color:"#fff", border:"none", borderRadius:22,
                  padding:"7px 12px", fontSize:11, fontWeight:700, cursor:"pointer",
                  boxShadow:"0 3px 10px rgba(5,150,105,0.4)",
                }}>📍 {t("loc_detect","Detectar")}</button>
              </div>

              {error && (
                <div style={{ background:"#fef2f2", border:"1px solid #fecaca", color:"#991b1b", padding:"8px 12px", borderRadius:8, fontSize:12, marginBottom:12 }}>
                  ⚠️ {error}
                </div>
              )}

              {/* City */}
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:700, color:T.text2, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:5 }}>
                  {t("loc_city","Ciudad / Zona")}
                </label>
                <input
                  data-testid="loc-city-input"
                  value={city} onChange={e => setCity(e.target.value)}
                  placeholder={t("loc_city_ph","ej: Alicante, España")}
                  style={{ width:"100%", height:38, borderRadius:9, border:`1.5px solid ${T.border}`, padding:"0 12px", fontSize:13, outline:"none", boxSizing:"border-box" }}
                />
              </div>

              {/* Hourly rate */}
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:700, color:T.text2, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:5 }}>
                  {t("loc_rate","Tarifa por hora (€)")}
                </label>
                <input
                  data-testid="loc-rate-input"
                  type="number" min="0" step="0.5"
                  value={rate} onChange={e => setRate(parseFloat(e.target.value) || 0)}
                  style={{ width:"100%", height:38, borderRadius:9, border:`1.5px solid ${T.border}`, padding:"0 12px", fontSize:13, outline:"none", boxSizing:"border-box" }}
                />
              </div>

              {/* Skills */}
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:700, color:T.text2, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:5 }}>
                  {t("loc_skills","Habilidades / Servicios")} ({skills.length})
                </label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                  {SKILLS_OPTIONS.map(s => {
                    const active = skills.includes(s);
                    return (
                      <button
                        key={s}
                        data-testid={`loc-skill-${s}`}
                        onClick={() => setSkills(p => active ? p.filter(x => x !== s) : [...p, s])}
                        style={{
                          padding:"4px 11px", borderRadius:999,
                          border: active ? `1.5px solid ${T.green}` : `1.5px solid ${T.border}`,
                          background: active ? "#f0fdf4" : "#fff",
                          color: active ? T.green : T.text2,
                          fontSize:11, fontWeight:700, cursor:"pointer",
                          transition:"all 0.15s",
                        }}
                      >{active ? "✓ " : ""}{s}</button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom:4 }}>
                <label style={{ fontSize:11, fontWeight:700, color:T.text2, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:5 }}>
                  {t("loc_desc","Descripción")} ({description.length}/500)
                </label>
                <textarea
                  data-testid="loc-desc-input"
                  value={description}
                  onChange={e => setDescription(e.target.value.slice(0, 500))}
                  placeholder={t("loc_desc_ph","Breve descripción de tu experiencia, equipo, disponibilidad…")}
                  rows={3}
                  style={{ width:"100%", borderRadius:9, border:`1.5px solid ${T.border}`, padding:"8px 12px", fontSize:13, outline:"none", resize:"vertical", boxSizing:"border-box", fontFamily:"DM Sans,sans-serif" }}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"12px 20px", borderTop:`1px solid ${T.border}`, display:"flex", gap:8, flexShrink:0 }}>
          <button onClick={onClose} disabled={saving} style={{
            flex:1, padding:"10px", borderRadius:9, border:`1.5px solid ${T.border}`,
            background:"#fff", color:T.text2, fontSize:13, fontWeight:700, cursor:"pointer",
          }}>{t("btn_cancel","Cancelar")}</button>
          <button data-testid="loc-save-btn" onClick={save} disabled={saving || loading} style={{
            flex:2, padding:"10px", borderRadius:9, border:"none",
            background:saving ? "#94a3b8" : T.green, color:"#fff", fontSize:13, fontWeight:700,
            cursor:saving ? "wait" : "pointer",
          }}>{saving ? t("loc_saving","Guardando...") : `✓ ${t("loc_save","Guardar perfil")}`}</button>
        </div>
      </div>
    </div>
  );
}
