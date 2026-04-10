import { useState, useEffect } from "react";
import { T } from "../constants/theme";

// ── Prețuri carburant Spania 2025 (€/litru) ──────────────────
const FUEL_PRICES = {
  benzina:  1.58,
  diesel:   1.49,
  glp:      0.89,
  electric: 0.22, // €/kWh
  hibrid:   1.53,
};

const FUEL_LABELS = {
  benzina:  "⛽ Benzină",
  diesel:   "🛢️ Diesel",
  glp:      "🟡 GLP / Autogas",
  electric: "⚡ Electric",
  hibrid:   "🔋 Hibrid",
};

const TRANSPORT_MODES = [
  { key:"masina",  icon:"🚗", label:"Mașină",    speedKmh:60,  costPer100km:null }, // calculated
  { key:"moto",    icon:"🏍️", label:"Motocicletă",speedKmh:65, costPer100km:null },
  { key:"autobuz", icon:"🚌", label:"Autobuz",   speedKmh:40,  costFlat:2.5 },
  { key:"tren",    icon:"🚂", label:"Tren",      speedKmh:90,  costFlat:8.0 },
  { key:"mers",    icon:"🚶", label:"Pietonal",  speedKmh:5,   costFlat:0   },
  { key:"bici",    icon:"🚲", label:"Bicicletă", speedKmh:18,  costFlat:0   },
];

// ── CO2 emisii g/km ───────────────────────────────────────────
const CO2_GKML = {
  benzina:  120, diesel:105, glp:80,
  electric: 20,  hibrid:70,
};

// ── Simulare geocodare (în producție → Google Maps / HERE API) ─
const MOCK_CITIES = {
  "madrid":    { lat:40.4168, lng:-3.7038, display:"Madrid, España" },
  "barcelona": { lat:41.3851, lng:2.1734,  display:"Barcelona, España" },
  "valencia":  { lat:39.4699, lng:-0.3763, display:"Valencia, España" },
  "sevilla":   { lat:37.3891, lng:-5.9845, display:"Sevilla, España" },
  "bilbao":    { lat:43.2630, lng:-2.9350, display:"Bilbao, España" },
  "malaga":    { lat:36.7213, lng:-4.4214, display:"Málaga, España" },
  "alicante":  { lat:38.3452, lng:-0.4810, display:"Alicante, España" },
  "zaragoza":  { lat:41.6488, lng:-0.8891, display:"Zaragoza, España" },
  "cluj":      { lat:46.7712, lng:23.6236, display:"Cluj-Napoca, România" },
  "bucuresti": { lat:44.4268, lng:26.1025, display:"București, România" },
  "paris":     { lat:48.8566, lng:2.3522,  display:"Paris, France" },
  "berlin":    { lat:52.5200, lng:13.4050, display:"Berlin, Deutschland" },
};

// Haversine distance
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function geocode(query) {
  const q = query.toLowerCase().trim();
  for (const [key, val] of Object.entries(MOCK_CITIES)) {
    if (q.includes(key)) return val;
  }
  // fallback random nearby point for demo
  return { lat: 40.4168 + (Math.random()-0.5)*2, lng: -3.7038 + (Math.random()-0.5)*2, display: query };
}

function formatTime(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// ── Sparkline mini ────────────────────────────────────────────
function MiniBar({ value, max, color }) {
  return (
    <div style={{ flex:1, height:6, borderRadius:999, background:"#f0f0ee", overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${(value/max)*100}%`, background:color, borderRadius:999, transition:"width 0.6s ease" }}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN CALCULATOR COMPONENT
// ══════════════════════════════════════════════════════════════
export function FuelCalculator({ defaultFrom="", defaultTo="", onClose }) {
  const [from, setFrom]         = useState(defaultFrom);
  const [to, setTo]             = useState(defaultTo);
  const [fuelType, setFuelType] = useState("benzina");
  const [consumption, setConsumption] = useState("7.5"); // L/100km
  const [fuelPrice, setFuelPrice]     = useState(String(FUEL_PRICES.benzina));
  const [passengers, setPassengers]   = useState(1);
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [tab, setTab]           = useState("input"); // input | result
  const [savedRoutes, setSavedRoutes] = useState([
    { from:"Madrid, España", to:"Valencia, España", dist:352 },
    { from:"Barcelona, España", to:"Bilbao, España", dist:620 },
  ]);

  // Auto-fill fuel price when type changes
  useEffect(() => {
    setFuelPrice(String(FUEL_PRICES[fuelType]));
    if (fuelType === "electric") setConsumption("18"); // kWh/100km
    else if (fuelType === "hibrid") setConsumption("5");
    else if (fuelType === "glp") setConsumption("10");
    else setConsumption("7.5");
  }, [fuelType]);

  const calculate = () => {
    if (!from.trim() || !to.trim()) { setError("Te rugăm completează ambele adrese!"); return; }
    setError(""); setLoading(true);
    setTimeout(() => {
      const locFrom = geocode(from);
      const locTo   = geocode(to);
      const distKm  = haversine(locFrom.lat, locFrom.lng, locTo.lat, locTo.lng);
      // Road distance ≈ crow-flies * 1.3
      const roadDist = distKm * 1.3;
      const roundTrip = roadDist * 2;

      const cons = parseFloat(consumption) || 7.5;
      const price = parseFloat(fuelPrice) || FUEL_PRICES[fuelType];
      const isElectric = fuelType === "electric";

      // Cost one way
      const fuelOne  = (roadDist / 100) * cons * price;
      const fuelRT   = fuelOne * 2;
      const perPerson = fuelRT / passengers;

      // CO2
      const co2One = isElectric
        ? (roadDist / 100) * cons * CO2_GKML.electric
        : (roadDist / 100) * (cons * 0.745) * CO2_GKML[fuelType]; // rough
      const co2RT = co2One * 2;

      // Time estimates
      const modes = TRANSPORT_MODES.map(m => {
        const timeH = roadDist / m.speedKmh;
        const cost = m.costFlat !== undefined
          ? m.key === "autobuz" || m.key === "tren"
            ? m.costFlat * (roadDist > 100 ? Math.ceil(roadDist/50) : 1)
            : 0
          : fuelRT;
        return { ...m, timeH, timeRT: timeH * 2, cost: m.key === "masina" ? fuelRT : m.key === "moto" ? fuelRT * 0.6 : cost };
      });

      setResult({
        from: locFrom.display || from,
        to:   locTo.display   || to,
        distOne: roadDist,
        distRT:  roundTrip,
        fuelOne, fuelRT, perPerson,
        co2One, co2RT,
        modes,
        cons, price,
        timeOne: roadDist / 60,
        timeRT:  roundTrip / 60,
      });
      setLoading(false);
      setTab("result");
    }, 900);
  };

  const swap = () => { setFrom(to); setTo(from); setResult(null); setTab("input"); };

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1000,
      background:"rgba(15,23,42,0.7)", backdropFilter:"blur(8px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:16, animation:"fadeInBg 0.25s ease",
    }} onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{
        background:T.white, borderRadius:24, width:"min(96vw,680px)",
        maxHeight:"90vh", overflow:"hidden", display:"flex", flexDirection:"column",
        boxShadow:"0 40px 80px rgba(0,0,0,0.4)",
        animation:"slideUpModal 0.3s cubic-bezier(0.175,0.885,0.32,1.275)",
      }}>

        {/* Header */}
        <div style={{
          background:`linear-gradient(135deg,${T.dark},${T.dark2})`,
          padding:"18px 22px", display:"flex", alignItems:"center", gap:12, flexShrink:0,
        }}>
          <div style={{ width:44,height:44,borderRadius:13,background:`linear-gradient(135deg,${T.green},${T.greenLight})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,boxShadow:`0 4px 12px ${T.green}55`,flexShrink:0 }}>🗺️</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:"Outfit,sans-serif",fontWeight:800,fontSize:18,color:"#f1f5f9" }}>Calculator Rută & Carburant</div>
            <div style={{ fontSize:12,color:"#64748b",marginTop:2 }}>Tur-retur · Cost real · Comparație transport</div>
          </div>
          <button onClick={onClose} style={{ width:34,height:34,borderRadius:9,background:"#1e293b",border:"1px solid #334155",color:"#64748b",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", background:"#f5f5f4", margin:"0", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
          {[{k:"input",l:"📍 Rută"},{k:"result",l:"📊 Rezultate",disabled:!result}].map(t=>(
            <button key={t.k} onClick={()=>!t.disabled&&setTab(t.k)} style={{
              flex:1, padding:"12px", border:"none", cursor:t.disabled?"not-allowed":"pointer",
              background:tab===t.k?T.white:"transparent",
              color:tab===t.k?T.text:t.disabled?"#d1d5db":T.text3,
              fontWeight:tab===t.k?700:500, fontSize:13, fontFamily:"DM Sans,sans-serif",
              borderBottom:tab===t.k?`3px solid ${T.green}`:"3px solid transparent",
              transition:"all 0.2s",
            }}>{t.l}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 22px" }}>

          {/* ── INPUT TAB ── */}
          {tab==="input" && (
            <div style={{ animation:"fadeIn 0.2s ease" }}>

              {/* From / To */}
              <div style={{ position:"relative", marginBottom:16 }}>
                <div style={{ marginBottom:8 }}>
                  <label style={{ display:"block",fontSize:11,fontWeight:700,color:T.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6 }}>📍 Adresă plecare (Prestator)</label>
                  <div style={{ position:"relative" }}>
                    <input value={from} onChange={e=>{setFrom(e.target.value);setResult(null);}} placeholder="ex: Calle Mayor 10, Madrid"
                      style={{ width:"100%",height:46,borderRadius:11,border:`1.5px solid ${T.border}`,padding:"0 14px 0 42px",fontSize:14,fontFamily:"DM Sans,sans-serif",outline:"none",boxSizing:"border-box",background:"#fafaf9" }}
                      onFocus={e=>e.target.style.border=`1.5px solid ${T.green}`}
                      onBlur={e=>e.target.style.border=`1.5px solid ${T.border}`}
                    />
                    <span style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:18 }}>🟢</span>
                  </div>
                </div>

                {/* Swap button */}
                <button onClick={swap} style={{
                  position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",
                  width:36,height:36,borderRadius:"50%",border:`2px solid ${T.border}`,
                  background:T.white,fontSize:18,cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  boxShadow:"0 2px 8px rgba(0,0,0,0.08)",zIndex:2,
                  transition:"all 0.2s",
                }}
                  onMouseEnter={e=>{e.currentTarget.style.background=T.green;e.currentTarget.style.borderColor=T.green;}}
                  onMouseLeave={e=>{e.currentTarget.style.background=T.white;e.currentTarget.style.borderColor=T.border;}}
                >⇅</button>

                <div>
                  <label style={{ display:"block",fontSize:11,fontWeight:700,color:T.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6 }}>🏁 Adresă destinație (Beneficiar)</label>
                  <div style={{ position:"relative" }}>
                    <input value={to} onChange={e=>{setTo(e.target.value);setResult(null);}} placeholder="ex: Avenida Diagonal 500, Barcelona"
                      style={{ width:"100%",height:46,borderRadius:11,border:`1.5px solid ${T.border}`,padding:"0 14px 0 42px",fontSize:14,fontFamily:"DM Sans,sans-serif",outline:"none",boxSizing:"border-box",background:"#fafaf9" }}
                      onFocus={e=>e.target.style.border=`1.5px solid ${T.green}`}
                      onBlur={e=>e.target.style.border=`1.5px solid ${T.border}`}
                    />
                    <span style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:18 }}>🔴</span>
                  </div>
                </div>
              </div>

              {error && <div style={{ background:"#fef2f2",borderRadius:9,padding:"8px 12px",marginBottom:12,fontSize:12,color:T.red,border:"1px solid #fecaca" }}>⚠️ {error}</div>}

              {/* Fuel type */}
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block",fontSize:11,fontWeight:700,color:T.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8 }}>Tip carburant</label>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                  {Object.entries(FUEL_LABELS).map(([k,l])=>(
                    <button key={k} onClick={()=>setFuelType(k)} style={{
                      padding:"7px 12px",borderRadius:9,border:`1.5px solid ${fuelType===k?T.green:T.border}`,
                      background:fuelType===k?"#f0fdf4":"#fafaf9",
                      color:fuelType===k?T.green:T.text2,
                      fontSize:12,fontWeight:fuelType===k?700:500,cursor:"pointer",
                      transition:"all 0.15s",
                    }}>{l}</button>
                  ))}
                </div>
              </div>

              {/* Consumption + Price */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14 }}>
                {[
                  { label: fuelType==="electric"?"Consum (kWh/100km)":"Consum (L/100km)", value:consumption, set:setConsumption, min:0.1, step:0.1, icon:"🔧" },
                  { label:`Preț ${fuelType==="electric"?"€/kWh":"€/litru"}`, value:fuelPrice, set:setFuelPrice, min:0.01, step:0.01, icon:"💶" },
                  { label:"Pasageri", value:String(passengers), set:v=>setPassengers(Math.max(1,parseInt(v)||1)), min:1, step:1, icon:"👥" },
                ].map(f=>(
                  <div key={f.label}>
                    <label style={{ display:"block",fontSize:10,fontWeight:700,color:T.text3,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5 }}>{f.icon} {f.label}</label>
                    <input type="number" value={f.value} onChange={e=>f.set(e.target.value)} min={f.min} step={f.step}
                      style={{ width:"100%",height:42,borderRadius:9,border:`1.5px solid ${T.border}`,padding:"0 10px",fontSize:14,fontFamily:"DM Sans,sans-serif",fontWeight:700,outline:"none",boxSizing:"border-box",textAlign:"center" }}
                      onFocus={e=>e.target.style.border=`1.5px solid ${T.green}`}
                      onBlur={e=>e.target.style.border=`1.5px solid ${T.border}`}
                    />
                  </div>
                ))}
              </div>

              {/* Saved routes */}
              {savedRoutes.length > 0 && (
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block",fontSize:11,fontWeight:700,color:T.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8 }}>⭐ Rute salvate</label>
                  <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
                    {savedRoutes.map((r,i)=>(
                      <div key={i} onClick={()=>{setFrom(r.from);setTo(r.to);setResult(null);}}
                        style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:9,border:`1px solid ${T.border}`,cursor:"pointer",background:"#fafaf9",transition:"all 0.15s" }}
                        onMouseEnter={e=>{e.currentTarget.style.background="#f0fdf4";e.currentTarget.style.borderColor=T.green+"66";}}
                        onMouseLeave={e=>{e.currentTarget.style.background="#fafaf9";e.currentTarget.style.borderColor=T.border;}}
                      >
                        <span style={{fontSize:14}}>📍</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:600,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.from} → {r.to}</div>
                          <div style={{fontSize:10,color:T.text3}}>~{r.dist} km</div>
                        </div>
                        <span style={{fontSize:11,color:T.green,fontWeight:700}}>Folosește →</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Calculate button */}
              <button onClick={calculate} disabled={loading} style={{
                width:"100%",padding:"14px",borderRadius:12,border:"none",
                cursor:loading?"not-allowed":"pointer",
                background:loading?"#e7e5e4":`linear-gradient(135deg,${T.green},${T.greenD})`,
                color:loading?"#a8a29e":"#fff",
                fontWeight:700,fontSize:15,fontFamily:"DM Sans,sans-serif",
                boxShadow:loading?"none":`0 6px 20px ${T.green}44`,
                transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:8,
              }}>
                {loading
                  ? <><div style={{width:18,height:18,borderRadius:"50%",border:"2px solid #ccc",borderTopColor:"#888",animation:"spin 0.8s linear infinite"}}/>Se calculează...</>
                  : <>🗺️ Calculează ruta tur-retur</>
                }
              </button>
            </div>
          )}

          {/* ── RESULT TAB ── */}
          {tab==="result" && result && (
            <div style={{ animation:"fadeIn 0.25s ease" }}>

              {/* Route summary */}
              <div style={{
                background:`linear-gradient(135deg,${T.dark},${T.dark2})`,
                borderRadius:16, padding:"16px 18px", marginBottom:16,
              }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
                  <span style={{fontSize:14,color:"#94a3b8"}}>🟢 {result.from}</span>
                </div>
                <div style={{ width:2,height:16,background:"#334155",marginLeft:6,marginBottom:6 }}/>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <span style={{fontSize:14,color:"#94a3b8"}}>🔴 {result.to}</span>
                </div>
                <div style={{ marginTop:12,display:"flex",gap:12,flexWrap:"wrap" }}>
                  {[
                    {l:"Dus",v:`${result.distOne.toFixed(0)} km`},
                    {l:"Tur-retur",v:`${result.distRT.toFixed(0)} km`,bold:true,color:T.greenLight},
                    {l:"Timp dus",v:formatTime(result.timeOne)},
                    {l:"Timp T-R",v:formatTime(result.timeRT)},
                  ].map(s=>(
                    <div key={s.l} style={{background:"rgba(255,255,255,0.06)",borderRadius:8,padding:"7px 12px",textAlign:"center"}}>
                      <div style={{fontFamily:"Outfit,sans-serif",fontSize:s.bold?18:15,fontWeight:800,color:s.color||"#f1f5f9"}}>{s.v}</div>
                      <div style={{fontSize:9,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em"}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost cards */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16 }}>
                {[
                  {icon:"⛽",label:"Cost carburant dus",value:`${result.fuelOne.toFixed(2)} €`,color:T.amber},
                  {icon:"🔄",label:"Cost tur-retur",value:`${result.fuelRT.toFixed(2)} €`,color:T.green,big:true},
                  {icon:"👤",label:`Per persoană (${result.perPerson===result.fuelRT?"1":"÷"+passengers})`,value:`${result.perPerson.toFixed(2)} €`,color:T.blue},
                ].map(c=>(
                  <div key={c.label} style={{
                    background:c.big?`linear-gradient(135deg,${T.green}15,${T.greenLight}10)`:T.bg,
                    borderRadius:12,padding:"14px 12px",textAlign:"center",
                    border:c.big?`2px solid ${T.green}44`:`1px solid ${T.border}`,
                  }}>
                    <div style={{fontSize:22,marginBottom:6}}>{c.icon}</div>
                    <div style={{fontFamily:"Outfit,sans-serif",fontSize:c.big?22:18,fontWeight:800,color:c.color}}>{c.value}</div>
                    <div style={{fontSize:10,color:T.text3,marginTop:3,lineHeight:1.3}}>{c.label}</div>
                  </div>
                ))}
              </div>

              {/* CO2 */}
              <div style={{ background:"#f0fdf4",borderRadius:12,padding:"12px 16px",marginBottom:16,border:"1px solid #bbf7d0" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                  <span style={{ fontSize:13,fontWeight:700,color:"#065f46" }}>🌱 Amprenta CO₂</span>
                  <span style={{ fontSize:11,color:"#057a55" }}>față de mașina medie</span>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:6 }}>
                  <span style={{ fontSize:12,color:T.text2,width:60 }}>Dus:</span>
                  <MiniBar value={result.co2One} max={result.co2One*1.5} color={result.co2One<5000?"#059669":"#f59e0b"}/>
                  <span style={{ fontSize:12,fontWeight:700,color:T.text,width:70,textAlign:"right" }}>{(result.co2One/1000).toFixed(2)} kg</span>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <span style={{ fontSize:12,color:T.text2,width:60 }}>Tur-retur:</span>
                  <MiniBar value={result.co2RT} max={result.co2RT*1.5} color={result.co2RT<10000?"#059669":"#ef4444"}/>
                  <span style={{ fontSize:12,fontWeight:700,color:T.text,width:70,textAlign:"right" }}>{(result.co2RT/1000).toFixed(2)} kg</span>
                </div>
              </div>

              {/* Transport comparison */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:12,fontWeight:700,color:T.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10 }}>🚦 Comparație moduri de transport (tur-retur)</div>
                <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                  {result.modes.sort((a,b)=>a.cost-b.cost).map((m,i)=>{
                    const maxCost = Math.max(...result.modes.map(x=>x.cost));
                    const isBest = i===0;
                    return (
                      <div key={m.key} style={{
                        display:"flex",alignItems:"center",gap:10,
                        padding:"10px 12px",borderRadius:10,
                        background:isBest?"#f0fdf4":T.bg,
                        border:isBest?`1.5px solid ${T.green}44`:`1px solid ${T.border}`,
                      }}>
                        <span style={{fontSize:18,flexShrink:0}}>{m.icon}</span>
                        <div style={{width:70,flexShrink:0}}>
                          <div style={{fontSize:12,fontWeight:700,color:T.text}}>{m.label}</div>
                          <div style={{fontSize:10,color:T.text3}}>{formatTime(m.timeRT)}</div>
                        </div>
                        <MiniBar value={m.cost} max={maxCost} color={isBest?T.green:T.blue}/>
                        <div style={{textAlign:"right",flexShrink:0,width:60}}>
                          <div style={{fontSize:13,fontWeight:800,color:isBest?T.green:T.text,fontFamily:"Outfit,sans-serif"}}>{m.cost.toFixed(2)} €</div>
                          {isBest&&<div style={{fontSize:9,color:T.green,fontWeight:700}}>CEL MAI IEFTIN</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tip AI */}
              <div style={{ background:`linear-gradient(135deg,${T.purple}15,${T.blue}10)`,borderRadius:12,padding:"12px 16px",marginBottom:16,border:`1px solid ${T.purple}33` }}>
                <div style={{ fontSize:12,fontWeight:700,color:T.purple,marginBottom:4 }}>💡 Sfat ConnectJob</div>
                <div style={{ fontSize:12,color:T.text2,lineHeight:1.6 }}>
                  {result.distRT > 100
                    ? `Ruta ta de ${result.distRT.toFixed(0)} km tur-retur costă ${result.fuelRT.toFixed(2)}€ în carburant. Dacă faci această rută zilnic timp de o lună, costul total va fi ~${(result.fuelRT*22).toFixed(0)}€. Verifică dacă jobul acoperă aceste cheltuieli!`
                    : `Ruta ta de ${result.distRT.toFixed(0)} km este scurtă — costul de ${result.fuelRT.toFixed(2)}€ tur-retur e rezonabil. Poți economisi dacă mergi cu bicicleta sau transportul public!`
                  }
                </div>
              </div>

              {/* Actions */}
              <div style={{ display:"flex",gap:8 }}>
                <button onClick={()=>{
                  setSavedRoutes(p=>[{from:result.from,to:result.to,dist:Math.round(result.distOne)},...p.slice(0,4)]);
                }} style={{
                  flex:1,padding:"11px",borderRadius:10,border:`1.5px solid ${T.border}`,
                  cursor:"pointer",background:T.white,color:T.text2,
                  fontWeight:600,fontSize:13,fontFamily:"DM Sans,sans-serif",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                }}>⭐ Salvează ruta</button>
                <button onClick={()=>{setTab("input");setResult(null);}} style={{
                  flex:1,padding:"11px",borderRadius:10,border:"none",
                  cursor:"pointer",background:`linear-gradient(135deg,${T.green},${T.greenD})`,
                  color:"#fff",fontWeight:700,fontSize:13,fontFamily:"DM Sans,sans-serif",
                  boxShadow:`0 4px 12px ${T.green}44`,
                  display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                }}>🔄 Calculează altă rută</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  FLOATING BUTTON — vizibil pe toate paginile
// ══════════════════════════════════════════════════════════════
export function FuelButton({ defaultFrom="", defaultTo="" }) {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {/* Floating button */}
      <div className="jc-float-left" style={{ position:"fixed", bottom:28, left:28, zIndex:990 }}>
        {/* Tooltip */}
        {pulse && (
          <div style={{
            position:"absolute",bottom:"calc(100% + 10px)",left:0,
            background:T.dark,color:"#f1f5f9",
            borderRadius:9,padding:"7px 12px",
            fontSize:12,fontWeight:600,whiteSpace:"nowrap",
            boxShadow:"0 4px 12px rgba(0,0,0,0.3)",
            animation:"fadeIn 0.3s ease",
          }}>
            ⛽ Calculator rută & carburant
            <div style={{ position:"absolute",bottom:-5,right:20,width:10,height:10,background:T.dark,transform:"rotate(45deg)" }}/>
          </div>
        )}

        {/* Pulse ring */}
        {pulse && (
          <div style={{
            position:"absolute",inset:-8,borderRadius:"50%",
            border:`2px solid ${T.green}`,
            animation:"ringPulse 1.5s ease-out infinite",
          }}/>
        )}

        <button
          onClick={() => { setOpen(true); setPulse(false); }}
          style={{
            width:58, height:58, borderRadius:"50%", border:"none",
            cursor:"pointer",
            background:`linear-gradient(135deg,${T.green},${T.greenD})`,
            boxShadow:`0 6px 24px ${T.green}66, 0 2px 8px rgba(0,0,0,0.2)`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:26,
            transition:"all 0.25s cubic-bezier(0.175,0.885,0.32,1.275)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = "scale(1.12)";
            e.currentTarget.style.boxShadow = `0 10px 30px ${T.green}88`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = `0 6px 24px ${T.green}66, 0 2px 8px rgba(0,0,0,0.2)`;
          }}
        >
          🗺️
        </button>
      </div>

      {open && (
        <FuelCalculator
          defaultFrom={defaultFrom}
          defaultTo={defaultTo}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// Alias for FuelCalculator to use as modal
export const FuelCalculatorModal = ({ from, to, onClose }) => (
  <FuelCalculator defaultFrom={from} defaultTo={to} onClose={onClose} />
);

// ══════════════════════════════════════════════════════════════
//  DEMO / PREVIEW

// ══════════════════════════════════════════════════════════════
//  TRANSPORT SCHEDULE MODULE
// ══════════════════════════════════════════════════════════════

/* ═══════════════════════════════════════════════════════════════
   CONNECTJOB — Program Orar Transport Public
   Mock realist + Google Maps / Moovit live
   ═══════════════════════════════════════════════════════════════ */

// ── Tipuri transport cu culori oficiale ───────────────────────
const TRANSPORT_TYPES = {
  metro:   { icon:"🚇", label:"Metro",     color:"#dc2626", bg:"#fef2f2" },
  autobus: { icon:"🚌", label:"Autobuz",   color:"#2563eb", bg:"#eff6ff" },
  tram:    { icon:"🚊", label:"Tramvai",   color:"#7c3aed", bg:"#f5f3ff" },
  cercanias:{ icon:"🚂", label:"Cercanías", color:"#059669", bg:"#f0fdf4" },
  bicicleta:{ icon:"🚲", label:"BiciMAD",  color:"#d97706", bg:"#fffbeb" },
  nocturn: { icon:"🌙", label:"Nocturn",   color:"#1e293b", bg:"#f8fafc" },
};

// ── Orare mock realiste per oraș ──────────────────────────────
const CITY_SCHEDULES = {
  madrid: {
    name: "Madrid",
    timezone: "Europe/Madrid",
    lines: [
      {
        id:"M1", type:"metro", name:"Línea 1 — Pinar de Chamartín ↔ Valdecarros",
        firstWeekday:"06:05", lastWeekday:"01:30",
        firstWeekend:"07:00", lastWeekend:"02:00",
        frequency: { peak:"3-4 min", offpeak:"5-6 min", night:"8-10 min" },
        stations:["Sol","Atocha","Valdecarros"],
        accessible: true, wifi: true,
        nextDepartures: ["06:05","06:09","06:13","06:18","06:22"],
      },
      {
        id:"M6", type:"metro", name:"Línea 6 — Circular",
        firstWeekday:"06:00", lastWeekday:"01:30",
        firstWeekend:"07:00", lastWeekend:"02:00",
        frequency: { peak:"3 min", offpeak:"5 min", night:"7 min" },
        stations:["Nuevos Ministerios","Cuatro Caminos","Príncipe Pío"],
        accessible: true, wifi: true,
        nextDepartures: ["06:00","06:03","06:06","06:10","06:14"],
      },
      {
        id:"B27", type:"autobus", name:"EMT 27 — Plaza España ↔ Embajadores",
        firstWeekday:"06:30", lastWeekday:"23:45",
        firstWeekend:"07:30", lastWeekend:"23:00",
        frequency: { peak:"8 min", offpeak:"12 min", night:"20 min" },
        stations:["Plaza España","Gran Vía","Sol","Embajadores"],
        accessible: true, wifi: false,
        nextDepartures: ["06:30","06:38","06:46","06:55","07:05"],
      },
      {
        id:"C1", type:"cercanias", name:"Cercanías C-1 — Príncipe Pío ↔ Recoletos",
        firstWeekday:"05:55", lastWeekday:"23:38",
        firstWeekend:"06:30", lastWeekend:"23:10",
        frequency: { peak:"4 min", offpeak:"10 min", night:"20 min" },
        stations:["Príncipe Pío","Atocha","Nuevos Ministerios","Recoletos"],
        accessible: true, wifi: true,
        nextDepartures: ["05:55","06:05","06:15","06:25","06:35"],
      },
      {
        id:"N1", type:"nocturn", name:"Búho N1 — Sol ↔ Fuencarral (Nocturn)",
        firstWeekday:"00:00", lastWeekday:"05:30",
        firstWeekend:"00:00", lastWeekend:"05:30",
        frequency: { peak:"—", offpeak:"30 min", night:"30 min" },
        stations:["Sol","Bilbao","Cuatro Caminos","Fuencarral"],
        accessible: false, wifi: false,
        nextDepartures: ["00:00","00:30","01:00","01:30","02:00"],
      },
    ],
  },
  barcelona: {
    name: "Barcelona",
    timezone: "Europe/Madrid",
    lines: [
      {
        id:"L1", type:"metro", name:"L1 — Hospital de Bellvitge ↔ Fondo",
        firstWeekday:"05:00", lastWeekday:"00:00",
        firstWeekend:"05:00", lastWeekend:"02:00",
        frequency: { peak:"2-3 min", offpeak:"4-5 min", night:"6 min" },
        stations:["Catalunya","Urquinaona","Arc de Triomf","Clot"],
        accessible: true, wifi: true,
        nextDepartures: ["05:00","05:03","05:06","05:10","05:14"],
      },
      {
        id:"L5", type:"metro", name:"L5 — Cornellà ↔ Vall d'Hebron",
        firstWeekday:"05:00", lastWeekday:"00:00",
        firstWeekend:"05:00", lastWeekend:"02:00",
        frequency: { peak:"3 min", offpeak:"5 min", night:"7 min" },
        stations:["Sagrada Família","Verdaguer","Diagonal","Entença"],
        accessible: true, wifi: true,
        nextDepartures: ["05:00","05:04","05:08","05:12","05:17"],
      },
      {
        id:"T4", type:"tram", name:"T4 — Ciutadella ↔ Sant Adrià",
        firstWeekday:"05:30", lastWeekday:"00:00",
        firstWeekend:"06:00", lastWeekend:"00:30",
        frequency: { peak:"7 min", offpeak:"10 min", night:"15 min" },
        stations:["Ciutadella","Llacuna","Poblenou","Sant Adrià"],
        accessible: true, wifi: false,
        nextDepartures: ["05:30","05:37","05:45","05:53","06:02"],
      },
      {
        id:"B7", type:"autobus", name:"TMB 7 — Pg. Zona Franca ↔ Gràcia",
        firstWeekday:"06:00", lastWeekday:"22:30",
        firstWeekend:"07:00", lastWeekend:"22:00",
        frequency: { peak:"6 min", offpeak:"10 min", night:"15 min" },
        stations:["Zona Franca","Paral·lel","Rambla","Gràcia"],
        accessible: true, wifi: false,
        nextDepartures: ["06:00","06:06","06:12","06:20","06:30"],
      },
    ],
  },
  valencia: {
    name: "Valencia",
    timezone: "Europe/Madrid",
    lines: [
      {
        id:"L3", type:"metro", name:"Línia 3 — Rafelbunyol ↔ Aeroport",
        firstWeekday:"05:30", lastWeekday:"23:15",
        firstWeekend:"06:00", lastWeekend:"01:00",
        frequency: { peak:"5 min", offpeak:"8 min", night:"12 min" },
        stations:["Xàtiva","Colón","Alameda","Neptú"],
        accessible: true, wifi: true,
        nextDepartures: ["05:30","05:38","05:46","05:55","06:05"],
      },
      {
        id:"B10", type:"autobus", name:"EMT 10 — Natzaret ↔ Benimamet",
        firstWeekday:"06:15", lastWeekday:"23:00",
        firstWeekend:"07:00", lastWeekend:"22:30",
        frequency: { peak:"8 min", offpeak:"12 min", night:"18 min" },
        stations:["Natzaret","Ciutat de les Arts","Colón","Benimamet"],
        accessible: true, wifi: false,
        nextDepartures: ["06:15","06:23","06:31","06:41","06:52"],
      },
    ],
  },
  sevilla: {
    name: "Sevilla",
    timezone: "Europe/Madrid",
    lines: [
      {
        id:"M1S", type:"metro", name:"Línea 1 — Olivar de Quintos ↔ Mairena",
        firstWeekday:"06:30", lastWeekday:"23:00",
        firstWeekend:"07:00", lastWeekend:"02:00",
        frequency: { peak:"4 min", offpeak:"7 min", night:"10 min" },
        stations:["San Bernardo","Prado S. Sebastián","Puerta Jerez","Nervión"],
        accessible: true, wifi: true,
        nextDepartures: ["06:30","06:34","06:38","06:43","06:48"],
      },
      {
        id:"T1S", type:"tram", name:"Metrocentro — San Bernardo ↔ Nueva",
        firstWeekday:"07:00", lastWeekday:"23:00",
        firstWeekend:"08:00", lastWeekend:"00:00",
        frequency: { peak:"6 min", offpeak:"10 min", night:"15 min" },
        stations:["San Bernardo","Archivo de Indias","Archivo","Nueva"],
        accessible: true, wifi: false,
        nextDepartures: ["07:00","07:06","07:12","07:20","07:28"],
      },
    ],
  },
};

// ── Detect city from address ──────────────────────────────────
function detectCity(address) {
  const a = (address || "").toLowerCase();
  if (a.includes("madrid"))    return "madrid";
  if (a.includes("barcelona")) return "barcelona";
  if (a.includes("valencia"))  return "valencia";
  if (a.includes("sevilla") || a.includes("seville")) return "sevilla";
  return "madrid"; // default
}

// ── Get current time slot ─────────────────────────────────────
function getTimeSlot(hour) {
  if (hour >= 7 && hour <= 9)   return "peak";
  if (hour >= 17 && hour <= 20) return "peak";
  if (hour >= 23 || hour <= 5)  return "night";
  return "offpeak";
}

// ── Check if line is running ──────────────────────────────────
function isRunning(line, isWeekend, currentHour, currentMin) {
  const first = isWeekend ? line.firstWeekend : line.firstWeekday;
  const last  = isWeekend ? line.lastWeekend  : line.lastWeekday;
  const [fh, fm] = first.split(":").map(Number);
  const [lh, lm] = last.split(":").map(Number);
  const now = currentHour * 60 + currentMin;
  const firstMin = fh * 60 + fm;
  const lastMin  = lh > 23 ? (lh - 24) * 60 + lm + 1440 : lh * 60 + lm;
  if (lastMin > 1440) return now >= firstMin || now <= (lastMin - 1440);
  return now >= firstMin && now <= lastMin;
}

// ── Next departures from now ──────────────────────────────────
function getNextDepartures(line, isWeekend, now) {
  const freq = line.frequency;
  const slot = getTimeSlot(now.getHours());
  const freqStr = freq[slot] || freq.offpeak;
  const freqMin = parseInt(freqStr) || 10;
  const departures = [];
  let mins = now.getHours() * 60 + now.getMinutes();
  // Round up to next departure
  mins = Math.ceil(mins / freqMin) * freqMin;
  for (let i = 0; i < 5; i++) {
    const h = Math.floor((mins + i * freqMin) / 60) % 24;
    const m = (mins + i * freqMin) % 60;
    const diff = (h * 60 + m) - (now.getHours() * 60 + now.getMinutes());
    const diffReal = diff < 0 ? diff + 1440 : diff;
    departures.push({
      time: `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`,
      inMin: diffReal,
    });
  }
  return departures;
}

// ── Google Maps URL ───────────────────────────────────────────
function googleMapsUrl(from, to, mode = "transit") {
  const base = "https://www.google.com/maps/dir/";
  const f = encodeURIComponent(from);
  const t = encodeURIComponent(to);
  return `${base}${f}/${t}/?travelmode=${mode}`;
}

function moovitUrl(from, to) {
  return `https://moovitapp.com/index/en/public_transit-${encodeURIComponent(from)}_to_${encodeURIComponent(to)}`;
}

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export function TransportSchedule({ from = "", to = "", onClose }) {
  const [selectedCity, setSelectedCity] = useState(detectCity(from) || "madrid");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDay,  setSelectedDay]  = useState("weekday");
  const [selectedLine, setSelectedLine] = useState(null);
  const [now, setNow] = useState(new Date());
  const [tab, setTab] = useState("schedule"); // schedule | map

  // Live clock
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(iv);
  }, []);

  const city     = CITY_SCHEDULES[selectedCity];
  const isWeekend = selectedDay === "weekend";
  const timeSlot  = getTimeSlot(now.getHours());
  const timeStr   = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

  const filteredLines = city.lines.filter(l =>
    selectedType === "all" || l.type === selectedType
  );

  const typesInCity = [...new Set(city.lines.map(l => l.type))];

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:1001,
      background:"rgba(15,23,42,0.75)", backdropFilter:"blur(8px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:16, animation:"fadeInBg 0.25s ease",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div style={{
        background:T.white, borderRadius:24,
        width:"min(96vw,740px)", maxHeight:"92vh",
        overflow:"hidden", display:"flex", flexDirection:"column",
        boxShadow:"0 40px 80px rgba(0,0,0,0.45)",
        animation:"slideUpModal 0.3s cubic-bezier(0.175,0.885,0.32,1.275)",
      }}>

        {/* ── Header ── */}
        <div style={{
          background:`linear-gradient(135deg,${T.dark},${T.dark2})`,
          padding:"18px 22px", flexShrink:0,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <div style={{ width:46,height:46,borderRadius:13,background:"linear-gradient(135deg,#2563eb,#1d4ed8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,boxShadow:"0 4px 14px rgba(37,99,235,0.5)",flexShrink:0 }}>🚇</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"Outfit,sans-serif",fontWeight:800,fontSize:18,color:"#f1f5f9" }}>Program Transport Public</div>
              <div style={{ fontSize:12,color:"#64748b",marginTop:2 }}>
                {from && to ? `${from} → ${to}` : "Orare complete · Primul și ultimul mijloc de transport"}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"monospace",fontSize:22,fontWeight:800,color:T.greenLight }}>{timeStr}</div>
              <div style={{ fontSize:10,color:"#64748b",textTransform:"uppercase" }}>Ora curentă</div>
            </div>
            <button onClick={onClose} style={{ width:34,height:34,borderRadius:9,background:"#1e293b",border:"1px solid #334155",color:"#64748b",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",marginLeft:4 }}>✕</button>
          </div>

          {/* City selector */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {Object.entries(CITY_SCHEDULES).map(([key, c]) => (
              <button key={key} onClick={() => { setSelectedCity(key); setSelectedLine(null); }}
                style={{
                  padding:"6px 14px", borderRadius:999, border:"none", cursor:"pointer",
                  background:selectedCity===key?T.green:"rgba(255,255,255,0.08)",
                  color:selectedCity===key?"#fff":"#94a3b8",
                  fontSize:12, fontWeight:700, transition:"all 0.15s",
                }}>📍 {c.name}</button>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display:"flex", background:"#f5f5f4", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
          {[{k:"schedule",l:"🕐 Orare"},{k:"map",l:"🗺️ Hărți Live"}].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              flex:1, padding:"11px", border:"none", cursor:"pointer",
              background:tab===t.k?T.white:"transparent",
              color:tab===t.k?T.text:T.text3,
              fontWeight:tab===t.k?700:500, fontSize:13, fontFamily:"DM Sans,sans-serif",
              borderBottom:tab===t.k?`3px solid ${T.green}`:"3px solid transparent",
              transition:"all 0.2s",
            }}>{t.l}</button>
          ))}
        </div>

        {/* ── Content ── */}
        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>

          {/* ══ SCHEDULE TAB ══ */}
          {tab === "schedule" && (
            <div style={{ animation:"fadeIn 0.2s ease" }}>

              {/* Filters row */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 }}>
                {/* Type filter */}
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  <button onClick={() => setSelectedType("all")} style={{
                    padding:"5px 12px", borderRadius:999, border:`1.5px solid ${selectedType==="all"?T.blue:T.border}`,
                    background:selectedType==="all"?"#eff6ff":"#fafaf9",
                    color:selectedType==="all"?T.blue:T.text3,
                    fontSize:11, fontWeight:700, cursor:"pointer",
                  }}>Toate</button>
                  {typesInCity.map(type => {
                    const tt = TRANSPORT_TYPES[type];
                    return (
                      <button key={type} onClick={() => setSelectedType(type)} style={{
                        padding:"5px 12px", borderRadius:999,
                        border:`1.5px solid ${selectedType===type?tt.color:T.border}`,
                        background:selectedType===type?tt.bg:"#fafaf9",
                        color:selectedType===type?tt.color:T.text3,
                        fontSize:11, fontWeight:700, cursor:"pointer", transition:"all 0.15s",
                      }}>{tt.icon} {tt.label}</button>
                    );
                  })}
                </div>

                {/* Day filter */}
                <div style={{ display:"flex", background:"#f0f0ee", borderRadius:9, padding:3, gap:2 }}>
                  {[{k:"weekday",l:"📅 L-V"},{k:"weekend",l:"🎉 S-D"}].map(d => (
                    <button key={d.k} onClick={() => setSelectedDay(d.k)} style={{
                      padding:"5px 12px", borderRadius:7, border:"none", cursor:"pointer",
                      background:selectedDay===d.k?T.white:"transparent",
                      color:selectedDay===d.k?T.text:T.text3,
                      fontSize:11, fontWeight:700, fontFamily:"DM Sans,sans-serif",
                      boxShadow:selectedDay===d.k?"0 1px 4px rgba(0,0,0,0.08)":"none",
                      transition:"all 0.2s",
                    }}>{d.l}</button>
                  ))}
                </div>
              </div>

              {/* Time slot info */}
              <div style={{
                background:`${T.blue}10`, borderRadius:10, padding:"9px 14px",
                marginBottom:14, border:`1px solid ${T.blue}25`,
                display:"flex", alignItems:"center", gap:8,
              }}>
                <span style={{ fontSize:16 }}>
                  {timeSlot==="peak"?"🔴":timeSlot==="night"?"🌙":"🟡"}
                </span>
                <span style={{ fontSize:12, color:T.text2 }}>
                  <strong>Ora {timeStr}</strong> — {timeSlot==="peak"?"Oră de vârf (frecvență maximă)":timeSlot==="night"?"Program nocturn (frecvență redusă)":"Oră normală"}
                </span>
              </div>

              {/* Lines list */}
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {filteredLines.map(line => {
                  const tt = TRANSPORT_TYPES[line.type];
                  const running = isRunning(line, isWeekend, now.getHours(), now.getMinutes());
                  const nextDeps = getNextDepartures(line, isWeekend, now);
                  const isSelected = selectedLine === line.id;
                  const firstDep = isWeekend ? line.firstWeekend : line.firstWeekday;
                  const lastDep  = isWeekend ? line.lastWeekend  : line.lastWeekday;

                  return (
                    <div key={line.id}
                      onClick={() => setSelectedLine(isSelected ? null : line.id)}
                      style={{
                        borderRadius:14, border:`1.5px solid ${isSelected?tt.color:T.border}`,
                        overflow:"hidden", cursor:"pointer",
                        boxShadow:isSelected?`0 4px 16px ${tt.color}22`:"none",
                        transition:"all 0.2s",
                      }}>

                      {/* Line header */}
                      <div style={{
                        display:"flex", alignItems:"center", gap:12,
                        padding:"12px 14px",
                        background:isSelected?tt.bg:T.white,
                      }}>
                        {/* Icon */}
                        <div style={{
                          width:40, height:40, borderRadius:10, flexShrink:0,
                          background:tt.color, display:"flex", alignItems:"center",
                          justifyContent:"center", fontSize:20,
                          boxShadow:`0 2px 8px ${tt.color}44`,
                        }}>{tt.icon}</div>

                        {/* Info */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                            <span style={{ background:tt.color,color:"#fff",borderRadius:5,padding:"1px 7px",fontSize:11,fontWeight:800,fontFamily:"Outfit,sans-serif" }}>{line.id}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{line.name}</span>
                          </div>
                          <div style={{ display:"flex", gap:10, fontSize:11, color:T.text3 }}>
                            <span>🕐 Primul: <strong style={{color:T.text}}>{firstDep}</strong></span>
                            <span>🕛 Ultimul: <strong style={{color:T.text}}>{lastDep}</strong></span>
                            <span>⏱️ {line.frequency[timeSlot] || line.frequency.offpeak}</span>
                          </div>
                        </div>

                        {/* Status */}
                        <div style={{ flexShrink:0, textAlign:"center" }}>
                          <div style={{
                            padding:"4px 10px", borderRadius:999, fontSize:11, fontWeight:700,
                            background:running?"#f0fdf4":"#fef2f2",
                            color:running?T.green:T.red,
                            border:`1px solid ${running?"#bbf7d0":"#fecaca"}`,
                          }}>
                            {running ? "● Activ" : "○ Oprit"}
                          </div>
                          {line.accessible && <div style={{fontSize:9,color:T.text3,marginTop:3}}>♿ Accesibil</div>}
                        </div>

                        <div style={{ fontSize:14, color:T.text3, flexShrink:0 }}>
                          {isSelected ? "▲" : "▼"}
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isSelected && (
                        <div style={{ padding:"12px 14px", borderTop:`1px solid ${tt.color}22`, background:tt.bg }}>

                          {/* Next departures */}
                          {running && (
                            <div style={{ marginBottom:12 }}>
                              <div style={{ fontSize:11, fontWeight:700, color:T.text3, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>
                                🚦 Următoarele plecări din stație
                              </div>
                              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                                {nextDeps.map((dep, i) => (
                                  <div key={i} style={{
                                    padding:"7px 12px", borderRadius:9,
                                    background:i===0?tt.color:T.white,
                                    border:`1.5px solid ${i===0?tt.color:T.border}`,
                                    textAlign:"center",
                                  }}>
                                    <div style={{ fontFamily:"monospace", fontSize:15, fontWeight:800, color:i===0?"#fff":T.text }}>{dep.time}</div>
                                    <div style={{ fontSize:10, color:i===0?"rgba(255,255,255,0.8)":T.text3 }}>
                                      {dep.inMin === 0 ? "Acum!" : `în ${dep.inMin} min`}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Stations */}
                          <div style={{ marginBottom:12 }}>
                            <div style={{ fontSize:11, fontWeight:700, color:T.text3, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:7 }}>📍 Stații principale</div>
                            <div style={{ display:"flex", alignItems:"center", gap:0, overflowX:"auto", paddingBottom:4 }}>
                              {line.stations.map((s, i) => (
                                <div key={s} style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
                                  <div style={{ textAlign:"center" }}>
                                    <div style={{ width:10, height:10, borderRadius:"50%", background:tt.color, border:"2px solid #fff", margin:"0 auto 4px", boxShadow:`0 1px 4px ${tt.color}44` }}/>
                                    <div style={{ fontSize:10, color:T.text, fontWeight:i===0||i===line.stations.length-1?700:400, whiteSpace:"nowrap", maxWidth:80, overflow:"hidden", textOverflow:"ellipsis" }}>{s}</div>
                                  </div>
                                  {i < line.stations.length - 1 && (
                                    <div style={{ width:40, height:2, background:tt.color, opacity:0.4, flexShrink:0, marginBottom:14 }}/>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Features */}
                          <div style={{ display:"flex", gap:6, marginBottom:12 }}>
                            {line.accessible && <span style={{ background:"#eff6ff",color:T.blue,borderRadius:7,padding:"3px 9px",fontSize:11,fontWeight:600 }}>♿ Accesibil</span>}
                            {line.wifi && <span style={{ background:"#f5f3ff",color:T.purple,borderRadius:7,padding:"3px 9px",fontSize:11,fontWeight:600 }}>📶 WiFi gratuit</span>}
                            <span style={{ background:"#f0fdf4",color:T.green,borderRadius:7,padding:"3px 9px",fontSize:11,fontWeight:600 }}>🎫 Tarif integrat</span>
                          </div>

                          {/* Program complet */}
                          <div style={{ background:T.white, borderRadius:9, padding:"10px 12px", border:`1px solid ${T.border}` }}>
                            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                              {[
                                {l:"🌅 Primul (L-V)", v:line.firstWeekday},
                                {l:"🌙 Ultimul (L-V)", v:line.lastWeekday},
                                {l:"🌅 Primul (S-D)", v:line.firstWeekend},
                                {l:"🌙 Ultimul (S-D)", v:line.lastWeekend},
                              ].map(r => (
                                <div key={r.l} style={{ padding:"6px 8px", background:"#fafaf9", borderRadius:7 }}>
                                  <div style={{ fontSize:10, color:T.text3 }}>{r.l}</div>
                                  <div style={{ fontFamily:"monospace", fontSize:16, fontWeight:800, color:T.text }}>{r.v}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Info disclaimer */}
              <div style={{ marginTop:14, background:"#fef3c7", borderRadius:9, padding:"9px 13px", border:"1px solid #fde68a", fontSize:11, color:"#92400e" }}>
                ⚠️ Orele afișate sunt aproximative. Pentru date în timp real, folosește butonul <strong>"Hărți Live"</strong> de mai sus sau apasă pe una din stații.
              </div>
            </div>
          )}

          {/* ══ MAP / LIVE TAB ══ */}
          {tab === "map" && (
            <div style={{ animation:"fadeIn 0.2s ease" }}>
              <div style={{ fontSize:13, color:T.text2, marginBottom:16, lineHeight:1.7 }}>
                Alege un serviciu de mai jos pentru a vedea orare <strong>în timp real</strong>, inclusiv întârzieri, alertele de serviciu și cel mai rapid traseu de la adresa ta.
              </div>

              {/* Primary options */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                {[
                  {
                    icon:"🗺️", name:"Google Maps", desc:"Traseu complet cu transport public, mers pe jos și mașină. Date live cu întârzieri.",
                    color:"#1a73e8", bg:"#e8f0fe",
                    url: googleMapsUrl(from||city.name, to||city.name, "transit"),
                    badge:"Recomandat",
                  },
                  {
                    icon:"🚌", name:"Moovit", desc:"Specialist în transport public. Orare exacte, alertele în timp real, offline disponibil.",
                    color:"#ff6b35", bg:"#fff3ee",
                    url: moovitUrl(from||city.name, to||city.name),
                    badge:"Transport expert",
                  },
                  {
                    icon:"🗺️", name:"Citymapper", desc:"Cel mai bun pentru orașe mari. Arată toate opțiunile simultan cu comparație timp/cost.",
                    color:"#00c0a3", bg:"#e6faf7",
                    url:`https://citymapper.com/directions?endcoord=40.4168,-3.7038&endname=${encodeURIComponent(to||city.name)}&startcoord=40.4168,-3.7038&startname=${encodeURIComponent(from||city.name)}`,
                    badge:"Recomandat orașe",
                  },
                  {
                    icon:"🚇", name:"Operatorul oficial", desc:`Site-ul oficial de transport din ${city.name} cu orare exacte și bilete online.`,
                    color:T.purple, bg:"#f5f3ff",
                    url: selectedCity==="madrid"?"https://www.crtm.es":selectedCity==="barcelona"?"https://www.tmb.cat":selectedCity==="valencia"?"https://www.metrovalencia.es":"https://www.tussam.es",
                    badge:"Official",
                  },
                ].map(opt => (
                  <a key={opt.name} href={opt.url} target="_blank" rel="noopener noreferrer"
                    style={{ textDecoration:"none" }}>
                    <div style={{
                      background:opt.bg, borderRadius:14, padding:"16px",
                      border:`1.5px solid ${opt.color}22`, cursor:"pointer",
                      transition:"all 0.2s", height:"100%",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 8px 24px ${opt.color}22`; }}
                      onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}
                    >
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                        <span style={{ fontSize:28 }}>{opt.icon}</span>
                        <span style={{ background:opt.color,color:"#fff",borderRadius:999,padding:"2px 8px",fontSize:10,fontWeight:700,height:"fit-content" }}>{opt.badge}</span>
                      </div>
                      <div style={{ fontFamily:"Outfit,sans-serif",fontSize:15,fontWeight:800,color:T.text,marginBottom:4 }}>{opt.name}</div>
                      <div style={{ fontSize:11, color:T.text3, lineHeight:1.5 }}>{opt.desc}</div>
                      <div style={{ marginTop:10, fontSize:12, fontWeight:700, color:opt.color }}>Deschide →</div>
                    </div>
                  </a>
                ))}
              </div>

              {/* Quick Google Maps embed hint */}
              <div style={{ background:`${T.green}10`, borderRadius:12, padding:"14px 16px", border:`1px solid ${T.green}25` }}>
                <div style={{ fontSize:12, fontWeight:700, color:T.green, marginBottom:6 }}>💡 Sfat ConnectJob</div>
                <div style={{ fontSize:12, color:T.text2, lineHeight:1.6, marginBottom:10 }}>
                  {from && to
                    ? `Ai introdus ruta ${from} → ${to}. Apasă pe Google Maps pentru a vedea exact când pleacă următorul autobuz/metro!`
                    : "Introdu adresele în Calculatorul de Rută, apoi revino aici pentru a deschide direct ruta în Google Maps cu transport public!"
                  }
                </div>
                {from && to && (
                  <a href={googleMapsUrl(from, to, "transit")} target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>
                    <button style={{
                      padding:"10px 18px", borderRadius:10, border:"none", cursor:"pointer",
                      background:`linear-gradient(135deg,${T.green},${T.greenD})`,
                      color:"#fff", fontWeight:700, fontSize:13, fontFamily:"DM Sans,sans-serif",
                      boxShadow:`0 4px 12px ${T.green}44`,
                      display:"flex", alignItems:"center", gap:6,
                    }}>
                      🗺️ Deschide ruta {from} → {to} în Google Maps
                    </button>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  TRANSPORT BUTTON — se adaugă lângă butonul de carburant
// ══════════════════════════════════════════════════════════════
export function TransportButton({ from = "", to = "" }) {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <div style={{ position:"fixed", bottom:28, left:100, zIndex:990 }}>
        {pulse && (
          <div style={{
            position:"absolute", bottom:"calc(100% + 10px)", left:0,
            background:T.dark, color:"#f1f5f9", borderRadius:9, padding:"7px 12px",
            fontSize:12, fontWeight:600, whiteSpace:"nowrap",
            boxShadow:"0 4px 12px rgba(0,0,0,0.3)", animation:"fadeIn 0.3s ease",
          }}>
            🚇 Program transport public
            <div style={{ position:"absolute",bottom:-5,left:20,width:10,height:10,background:T.dark,transform:"rotate(45deg)" }}/>
          </div>
        )}

        {pulse && (
          <div style={{
            position:"absolute", inset:-8, borderRadius:"50%",
            border:"2px solid #2563eb",
            animation:"ringPulse 1.5s ease-out infinite",
          }}/>
        )}

        <button
          onClick={() => { setOpen(true); setPulse(false); }}
          style={{
            width:58, height:58, borderRadius:"50%", border:"none", cursor:"pointer",
            background:"linear-gradient(135deg,#2563eb,#1d4ed8)",
            boxShadow:"0 6px 24px rgba(37,99,235,0.55), 0 2px 8px rgba(0,0,0,0.2)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:26,
            transition:"all 0.25s cubic-bezier(0.175,0.885,0.32,1.275)",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform="scale(1.12)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; }}
        >🚇</button>
      </div>

      {open && <TransportSchedule from={from} to={to} onClose={() => setOpen(false)}/>}
    </>
  );
}

