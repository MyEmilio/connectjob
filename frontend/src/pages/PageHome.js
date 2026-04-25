import { useState, useEffect } from "react";
import React from "react";
import { useTranslation } from "react-i18next";
import { T, CATEGORIES } from "../constants/theme";
import { Btn, Card, JobCardRow } from "../components/shared";
import usePushNotifications from "../hooks/usePushNotifications";
import useNotificationPreferences from "../hooks/useNotificationPreferences";
import DashboardStats from "../components/DashboardStats";
import AdvancedSearch from "../components/AdvancedSearch";
import ProviderLocationModal from "../components/ProviderLocationModal";
import api from "../services/api";

function HowItWorksModal({ onClose }) {
  const { t } = useTranslation("t");
  const STEPS = [
    { icon:"👤", color:"#3b82f6", title:t("hiw_step1_title"), desc:t("hiw_step1_desc"), tag:t("hiw_step1_tag") },
    { icon:"🗂️", color:"#059669", title:t("hiw_step2_title"), desc:t("hiw_step2_desc"), tag:t("hiw_step2_tag") },
    { icon:"📩", color:"#8b5cf6", title:t("hiw_step3_title"), desc:t("hiw_step3_desc"), tag:t("hiw_step3_tag") },
    { icon:"💬", color:"#f59e0b", title:t("hiw_step4_title"), desc:t("hiw_step4_desc"), tag:t("hiw_step4_tag") },
    { icon:"🔒", color:"#ef4444", title:t("hiw_step5_title"), desc:t("hiw_step5_desc"), tag:t("hiw_step5_tag") },
  ];
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:1200,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,animation:"fadeInBg 0.2s ease" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:22,width:"min(560px,100%)",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 32px 80px rgba(0,0,0,0.22)",animation:"slideUpModal 0.3s cubic-bezier(0.175,0.885,0.32,1.275)" }}>
        <div style={{ background:`linear-gradient(135deg,${T.dark},${T.dark2})`,borderRadius:"22px 22px 0 0",padding:"22px 24px 20px",position:"relative",overflow:"hidden" }}>
          <div style={{ position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",background:"rgba(5,150,105,0.12)" }}/>
          <div style={{ position:"absolute",bottom:-20,left:40,width:80,height:80,borderRadius:"50%",background:"rgba(59,130,246,0.08)" }}/>
          <button onClick={onClose} style={{ position:"absolute",top:14,right:14,background:"rgba(255,255,255,0.1)",border:"none",color:"#94a3b8",fontSize:18,cursor:"pointer",borderRadius:8,width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
          <div style={{ position:"relative" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
              <div style={{ width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${T.green},${T.greenLight})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:`0 4px 12px ${T.green}44` }}>⚡</div>
              <span style={{ fontFamily:"Outfit,sans-serif",fontWeight:900,fontSize:20,color:"#f1f5f9",letterSpacing:"-0.02em" }}>Connect<span style={{color:T.greenLight}}>Job</span></span>
            </div>
            <h2 style={{ fontFamily:"Outfit,sans-serif",fontWeight:800,fontSize:20,color:"#f1f5f9",margin:"0 0 6px" }}>{t("hiw_title")}</h2>
            <p style={{ color:"#94a3b8",fontSize:13,margin:0 }}>{t("hiw_subtitle")} <strong style={{color:T.greenLight}}>{t("hiw_5steps")}</strong></p>
          </div>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",background:"#f8fafc",borderBottom:`1px solid ${T.border}` }}>
          {[{v:"2 min",l:t("hiw_stat1_label")},{v:"12",l:t("hiw_stat2_label")},{v:"100%",l:t("hiw_stat3_label")}].map(s=>(
            <div key={s.l} style={{ padding:"12px 8px",textAlign:"center",borderRight:`1px solid ${T.border}` }}>
              <div style={{ fontFamily:"Outfit,sans-serif",fontWeight:800,fontSize:18,color:T.green }}>{s.v}</div>
              <div style={{ fontSize:10,color:T.text3,marginTop:2 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ padding:"20px 24px" }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{ display:"flex",gap:14,marginBottom:i<STEPS.length-1?16:0,animation:`fadeIn 0.4s ease ${i*0.08}s both` }}>
              <div style={{ display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0 }}>
                <div style={{ width:46,height:46,borderRadius:14,background:`${step.color}12`,border:`2px solid ${step.color}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,position:"relative" }}>
                  {step.icon}
                  <div style={{ position:"absolute",top:-8,right:-8,background:step.color,color:"#fff",borderRadius:999,minWidth:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,border:"2px solid #fff" }}>{i+1}</div>
                </div>
                {i<STEPS.length-1 && <div style={{ width:2,flex:1,background:`linear-gradient(${step.color}44,${STEPS[i+1].color}22)`,marginTop:6,minHeight:14 }}/>}
              </div>
              <div style={{ flex:1,paddingTop:4 }}>
                <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:3 }}>
                  <span style={{ fontWeight:700,fontSize:14,color:T.text }}>{step.title}</span>
                  <span style={{ background:`${step.color}15`,color:step.color,border:`1px solid ${step.color}33`,borderRadius:999,padding:"1px 7px",fontSize:9,fontWeight:800,letterSpacing:"0.06em" }}>{step.tag}</span>
                </div>
                <p style={{ fontSize:12,color:T.text3,margin:0,lineHeight:1.5 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ margin:"0 24px 20px",background:`linear-gradient(135deg,${T.green}08,${T.blue}08)`,border:`1.5px solid ${T.green}22`,borderRadius:14,padding:"14px 16px" }}>
          <div style={{ fontWeight:700,fontSize:12,color:T.text,marginBottom:10 }}>{t("hiw_why_title")}</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:7 }}>
            {[t("hiw_benefit_1"),t("hiw_benefit_2"),t("hiw_benefit_3"),t("hiw_benefit_4"),t("hiw_benefit_5"),t("hiw_benefit_6")].map(b=>(
              <div key={b} style={{ fontSize:12,color:T.text2,display:"flex",alignItems:"center",gap:6 }}>{b}</div>
            ))}
          </div>
        </div>
        <div style={{ padding:"0 24px 24px",display:"flex",gap:9 }}>
          <button onClick={onClose} style={{ flex:1,padding:"12px",borderRadius:12,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,color:"#fff",fontWeight:700,fontSize:14,fontFamily:"DM Sans,sans-serif",boxShadow:`0 4px 16px ${T.green}44` }}>{t("hiw_cta")}</button>
        </div>
      </div>
    </div>
  );
}

function NotificationPreferencesModal({ onClose }) {
  const { t } = useTranslation("t");
  const { preferences, loading, saving, toggleFavoriteCategory, updatePreferences } = useNotificationPreferences();
  const [localPrefs, setLocalPrefs] = useState({ notify_new_jobs: true, notify_messages: true, notify_applications: true });
  const { useEffect } = require("react");
  useEffect(() => { if (!loading) setLocalPrefs({ notify_new_jobs: preferences.notify_new_jobs, notify_messages: preferences.notify_messages, notify_applications: preferences.notify_applications }); }, [loading, preferences]);
  const handleSaveSettings = async () => { await updatePreferences(localPrefs); onClose(); };
  const isCategorySelected = (catKey) => preferences.favorite_categories.includes(catKey.toLowerCase());
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.white,borderRadius:20,width:"100%",maxWidth:520,maxHeight:"90vh",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.4)",display:"flex",flexDirection:"column" }}>
        <div style={{padding:"20px 24px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><h2 style={{fontFamily:"Outfit,sans-serif",fontSize:20,fontWeight:800,color:T.text,margin:"0 0 4px"}}>⚙️ {t("notif_pref_title")}</h2><p style={{fontSize:13,color:T.text3,margin:0}}>{t("notif_pref_desc")}</p></div>
          <button onClick={onClose} style={{background:"transparent",border:"none",fontSize:24,color:T.text3,cursor:"pointer",padding:4}}>✕</button>
        </div>
        <div style={{padding:"20px 24px",overflowY:"auto",flex:1}}>
          {loading ? <div style={{textAlign:"center",padding:40,color:T.text3}}>Se incarca...</div> : (
            <>
              <div style={{marginBottom:24}}>
                <h3 style={{fontFamily:"Outfit,sans-serif",fontSize:14,fontWeight:700,color:T.text,margin:"0 0 12px",textTransform:"uppercase",letterSpacing:1}}>Tipuri de notificari</h3>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {[{key:"notify_new_jobs",label:t("notif_new_jobs"),icon:"🆕"},{key:"notify_messages",label:t("notif_messages"),icon:"💬"},{key:"notify_applications",label:t("notif_applications"),icon:"📩"}].map(item=>(
                    <label key={item.key} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:T.dark3,borderRadius:12,cursor:"pointer",border:localPrefs[item.key]?`2px solid ${T.green}`:"2px solid transparent",transition:"all 0.2s"}}>
                      <input type="checkbox" checked={localPrefs[item.key]} onChange={e=>setLocalPrefs(prev=>({...prev,[item.key]:e.target.checked}))} style={{width:18,height:18,accentColor:T.green}}/>
                      <span style={{fontSize:20}}>{item.icon}</span>
                      <span style={{fontSize:14,color:T.text,fontWeight:500}}>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <h3 style={{fontFamily:"Outfit,sans-serif",fontSize:14,fontWeight:700,color:T.text,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:1}}>{t("notif_fav_categories")} ({preferences.favorite_categories.length}/10)</h3>
                <p style={{fontSize:12,color:T.text3,margin:"0 0 12px"}}>{t("notif_select_categories")}</p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8}}>
                  {CATEGORIES.map(cat=>{
                    const isSelected=isCategorySelected(cat.key);
                    return (<button key={cat.key} onClick={()=>toggleFavoriteCategory(cat.key)} disabled={saving} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:isSelected?`${cat.color}22`:T.dark3,border:isSelected?`2px solid ${cat.color}`:"2px solid transparent",borderRadius:10,cursor:saving?"wait":"pointer",transition:"all 0.2s",opacity:saving?0.6:1}}>
                      <span style={{fontSize:18}}>{cat.icon}</span>
                      <span style={{fontSize:12,fontWeight:600,color:isSelected?cat.color:T.text2,textAlign:"left",flex:1}}>{t(`cat_${cat.key}`).split(" ")[0]}</span>
                      {isSelected && <span style={{color:cat.color,fontSize:14}}>✓</span>}
                    </button>);
                  })}
                </div>
              </div>
            </>
          )}
        </div>
        <div style={{padding:"16px 24px",borderTop:`1px solid ${T.border}`,display:"flex",gap:12}}>
          <button onClick={onClose} style={{flex:1,padding:"12px",borderRadius:12,border:`1px solid ${T.border}`,background:"transparent",color:T.text2,fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:"DM Sans,sans-serif"}}>{t("notif_cancel")}</button>
          <button onClick={handleSaveSettings} disabled={saving} style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,color:"#fff",fontWeight:700,fontSize:14,cursor:saving?"wait":"pointer",fontFamily:"DM Sans,sans-serif",boxShadow:`0 4px 16px ${T.green}44`,opacity:saving?0.7:1}}>{saving?t("notif_saving"):t("notif_save")}</button>
        </div>
      </div>
    </div>
  );
}

export default function PageHome({ gs, update, navigate }) {
  const { t, i18n } = useTranslation("t");
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showNotifPrefs, setShowNotifPrefs] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showCatPopover, setShowCatPopover] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem("jc_recent_searches") || "[]"); }
    catch { return []; }
  });
  const [hideDemo, setHideDemo] = useState(() => localStorage.getItem("jc_hide_demo") === "true");
  const catPopRef = React.useRef(null);

  const saveSearch = (q) => {
    const query = q.trim();
    if (!query) return;
    setRecentSearches(prev => {
      const next = [query, ...prev.filter(s => s.toLowerCase() !== query.toLowerCase())].slice(0, 5);
      try { localStorage.setItem("jc_recent_searches", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const doSearch = (q) => {
    const query = (q || "").trim();
    if (!query) { update({ jobsCategory:"", jobsSearch:"" }); navigate("jobs"); return; }
    saveSearch(query);
    update({ jobsCategory:"", jobsSearch: query });
    navigate("jobs");
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try { localStorage.removeItem("jc_recent_searches"); } catch {}
  };

  // Close popover on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (catPopRef.current && !catPopRef.current.contains(e.target)) setShowCatPopover(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const allJobs = gs.jobs || [];
  const toggleDemo = () => {
    const next = !hideDemo;
    setHideDemo(next);
    localStorage.setItem("jc_hide_demo", String(next));
  };
  const filteredJobs = hideDemo ? allJobs.filter(j => !j.is_demo) : allJobs;
  const promotedJobs = filteredJobs.filter(j => j.promoted);
  const recentJobs = filteredJobs.slice(0, 6);
  const [searchFilters, setSearchFilters] = useState({});
  const { isSupported, isSubscribed, loading: notifLoading, subscribe, unsubscribe } = usePushNotifications();

  // Escrow-mandatory info (for new users)
  const [escrowInfo, setEscrowInfo] = useState(null);
  const [escrowExpanded, setEscrowExpanded] = useState(false);
  const [escrowDismissed, setEscrowDismissed] = useState(localStorage.getItem("jc_escrow_dismissed") === "1");
  useEffect(() => {
    api.get("/payments/escrow-status").then(r => setEscrowInfo(r.data)).catch(() => {});
  }, []);
  const dismissEscrow = (e) => { e.stopPropagation(); setEscrowDismissed(true); localStorage.setItem("jc_escrow_dismissed", "1"); };
  const getCatCount = (cat) => allJobs.filter(j => { const jc = (j.category||"").toLowerCase(); return jc === cat.key || jc.includes(cat.key); }).length;
  const handleNotificationToggle = async () => { if (isSubscribed) { await unsubscribe(); } else { const success = await subscribe(); if (success) setShowNotifPrefs(true); } };

  return (
    <div data-testid="page-home" style={{ animation:"fadeIn 0.3s ease" }}>
      {showHowItWorks && <HowItWorksModal onClose={()=>setShowHowItWorks(false)}/>}
      {showNotifPrefs && <NotificationPreferencesModal onClose={()=>setShowNotifPrefs(false)}/>}
      {showDashboard && <DashboardStats onClose={()=>setShowDashboard(false)}/>}
      {showAdvancedSearch && <AdvancedSearch filters={searchFilters} onFilterChange={setSearchFilters} onClose={()=>setShowAdvancedSearch(false)}/>}

      {/* Escrow mandatory banner — compact + dismissible (hides after 3 completed escrow jobs + rating>=4.5 OR premium) */}
      {escrowInfo?.mandatory && !escrowDismissed && (
        <div
          data-testid="escrow-mandatory-banner"
          onClick={() => setEscrowExpanded(v => !v)}
          style={{
            background: "linear-gradient(135deg,#fef3c7,#fde68a)",
            border: "1.5px solid #f59e0b",
            borderRadius: 12,
            padding: "10px 12px",
            marginBottom: 14,
            display: "flex", alignItems: "center", gap: 10,
            boxShadow: "0 4px 14px rgba(245,158,11,0.15)",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ fontSize: 22, flexShrink: 0 }}>🔒</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 800, color: "#78350f",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t("escrow_required_title","Pago en Escrow obligatorio")}
              </span>
              <span style={{
                background: "#fff", borderRadius: 8, padding: "1px 7px",
                border: "1px solid #f59e0b", fontSize: 11, fontWeight: 800, color: "#d97706", flexShrink: 0,
              }}>
                {escrowInfo.completed_paid_jobs}/{escrowInfo.threshold}
              </span>
              <span style={{ marginLeft: "auto", fontSize: 12, color: "#92400e", flexShrink: 0 }}>
                {escrowExpanded ? "▲" : "▼"}
              </span>
            </div>
            {escrowExpanded && (
              <div style={{ fontSize: 11, color: "#92400e", lineHeight: 1.5, marginTop: 6 }}>
                {t("escrow_required_msg","Tus primeros 3 trabajos deben pagarse a través de Escrow ConnectJob. Te quedan {{remaining}} por completar antes de poder usar pagos directos.", { remaining: escrowInfo.remaining })}
              </div>
            )}
          </div>
          <button
            data-testid="escrow-banner-dismiss"
            onClick={dismissEscrow}
            aria-label="Dismiss"
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              fontSize: 14, color: "#92400e", padding: 4, flexShrink: 0,
              borderRadius: 6,
            }}
          >✕</button>
        </div>
      )}

      {/* Compact hero */}
      <div className="jc-hero" style={{ background:`linear-gradient(135deg,${T.dark} 0%,${T.dark2} 60%,#0d3d26 100%)`, borderRadius:18, padding:"22px 26px", marginBottom:24, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute",top:-40,right:-40,width:180,height:180,borderRadius:"50%",background:"rgba(5,150,105,0.08)" }}/>
        <div style={{ position:"relative",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}>
          <div>
            <div style={{ fontSize:12,color:"#64748b",marginBottom:4 }}>{new Date().toLocaleDateString(i18n.language,{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div>
            <h1 className="jc-hero-title" style={{ fontFamily:"Outfit,sans-serif",fontSize:24,fontWeight:800,color:"#f1f5f9",margin:"0 0 6px" }}>{t("home_greeting")}, {gs.user.name.split(" ")[0]}! 👋</h1>
            <p style={{ color:"#94a3b8",fontSize:13,margin:0 }}>
              {allJobs.length > 0 ? <><strong style={{color:T.greenLight}}>{allJobs.length} {t("jobs_ads_label")}</strong> {t("home_jobs_available")}</> : t("home_no_jobs_hero")}
            </p>
          </div>
          <div className="jc-hero-btns" style={{ display:"flex",gap:8,flexWrap:"wrap",alignItems:"center" }}>
            {isSupported && (
              <Btn onClick={handleNotificationToggle} color={isSubscribed?"#059669":"#6366f1"} size="sm" style={{opacity:notifLoading?0.6:1}}>
                {isSubscribed?"🔔":"🔕"} {isSubscribed?t("home_notif_on"):t("home_notif_off")}
              </Btn>
            )}
            {!gs.user.verified && <Btn onClick={()=>navigate("verify")} variant="outline" size="sm" style={{borderColor:"#334155",color:"#94a3b8",background:"transparent"}}>{t("home_verify_btn")}</Btn>}
            {gs.user.active_role === "worker" && (
              <Btn data-testid="home-my-location-btn" onClick={() => setShowLocationModal(true)} color="#3b82f6" size="sm">
                📍 {t("home_my_location_btn","Mi ubicación")}
              </Btn>
            )}
            <button onClick={()=>setShowHowItWorks(true)} style={{ padding:"7px 13px",borderRadius:10,border:"1.5px solid rgba(52,211,153,0.35)",background:"rgba(52,211,153,0.08)",color:T.greenLight,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"DM Sans,sans-serif",transition:"all 0.2s" }}>
              <span style={{ fontSize:15 }}>💡</span> {t("home_hiw_btn")}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden triggers for sidebar quick actions */}
      <div style={{display:"none"}}>
        <button data-testid="dashboard-stats-btn" onClick={()=>setShowDashboard(true)}/>
        <button data-testid="advanced-search-btn" onClick={()=>setShowAdvancedSearch(true)}/>
      </div>

      {/* 🔍 Compact search + category filter — replaces old full-width category grid */}
      <div data-testid="home-search-toolbar" style={{
        display:"flex", gap:8, marginBottom:20, alignItems:"stretch", flexWrap:"wrap",
      }}>
        {/* Search input */}
        <div style={{
          flex:"1 1 260px", minWidth:0, display:"flex", alignItems:"center",
          height:42, borderRadius:12, border:`1.5px solid ${T.border}`,
          background:"#fff", padding:"0 10px 0 14px",
          boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
          transition:"border-color 0.15s",
        }}>
          <span style={{ fontSize:16, color:T.text3, marginRight:8 }}>🔍</span>
          <input
            data-testid="home-search-input"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") doSearch(searchText);
            }}
            placeholder={t("home_search_placeholder","Buscar empleo, categoría, ubicación…")}
            style={{
              flex:1, border:"none", outline:"none", background:"transparent",
              fontSize:13, color:T.text, fontFamily:"DM Sans, sans-serif", minWidth:0,
            }}
          />
          {searchText && (
            <button onClick={() => setSearchText("")} style={{
              border:"none", background:"transparent", cursor:"pointer",
              color:T.text3, fontSize:15, padding:"0 4px",
            }}>✕</button>
          )}
          <button
            data-testid="home-search-go"
            onClick={() => doSearch(searchText)}
            style={{
              border:"none", background:T.green, color:"#fff",
              padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:700,
              cursor:"pointer", whiteSpace:"nowrap",
            }}
          >{t("home_search_btn","Buscar")}</button>
        </div>

        {/* Categories popover trigger */}
        <div ref={catPopRef} style={{ position:"relative" }}>
          <button
            data-testid="home-cat-toggle"
            onClick={() => setShowCatPopover(v => !v)}
            style={{
              height:42, padding:"0 14px", borderRadius:12,
              border:`1.5px solid ${showCatPopover ? T.green : T.border}`,
              background: showCatPopover ? "#f0fdf4" : "#fff",
              color: showCatPopover ? T.green : T.text2,
              fontSize:13, fontWeight:700, cursor:"pointer",
              display:"flex", alignItems:"center", gap:7, whiteSpace:"nowrap",
              transition:"all 0.15s",
              boxShadow: showCatPopover ? "0 2px 6px rgba(5,150,105,0.15)" : "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <span style={{ fontSize:16 }}>📂</span>
            {t("home_categories_title","Categorías")}
            <span style={{
              background: showCatPopover ? T.green : "#e7e5e4",
              color: showCatPopover ? "#fff" : T.text2,
              borderRadius:999, padding:"1px 7px", fontSize:10, fontWeight:800,
              marginLeft:2,
            }}>{CATEGORIES.length}</span>
            <span style={{ fontSize:10, marginLeft:2 }}>{showCatPopover ? "▲" : "▼"}</span>
          </button>

          {/* Categories popover */}
          {showCatPopover && (
            <div data-testid="home-cat-popover" style={{
              position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:950,
              background:"#fff", borderRadius:14, border:`1px solid ${T.border}`,
              boxShadow:"0 12px 32px rgba(0,0,0,0.15)", padding:14,
              width:"min(92vw, 540px)",
              maxHeight:420, overflowY:"auto",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div style={{ fontSize:12, fontWeight:800, color:T.text, textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  {t("home_categories_subtitle","Elige una categoría")}
                </div>
                <button onClick={() => setShowCatPopover(false)} style={{
                  border:"none", background:"transparent", cursor:"pointer",
                  color:T.text3, fontSize:16, padding:2,
                }}>✕</button>
              </div>
              <div style={{
                display:"grid",
                gridTemplateColumns:"repeat(auto-fill, minmax(155px, 1fr))",
                gap:8,
              }}>
                {CATEGORIES.map(cat => {
                  const cnt = getCatCount(cat);
                  const label = t(`cat_${cat.key}`, { defaultValue: cat.label });
                  return (
                    <div
                      key={cat.key}
                      data-testid={`home-cat-item-${cat.key}`}
                      onClick={() => {
                        update({ jobsCategory: cat.key });
                        setShowCatPopover(false);
                        navigate("jobs");
                      }}
                      style={{
                        background:"#fafaf9", borderRadius:10,
                        border:`1.5px solid ${T.border}`,
                        padding:"9px 11px", cursor:"pointer",
                        transition:"all 0.15s",
                        display:"flex", alignItems:"center", gap:9,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = cat.color + "88";
                        e.currentTarget.style.background = cat.color + "08";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = T.border;
                        e.currentTarget.style.background = "#fafaf9";
                      }}
                    >
                      <div style={{
                        width:32, height:32, borderRadius:9,
                        background: `${cat.color}15`,
                        border: `1.5px solid ${cat.color}33`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:16, flexShrink:0,
                      }}>{cat.icon}</div>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:T.text, lineHeight:1.2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{label}</div>
                        {cnt > 0 && (
                          <div style={{ fontSize:10, color:cat.color, fontWeight:600, marginTop:2 }}>
                            {cnt} {t("jobs_ads_label","anuncios")}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div
                  onClick={() => {
                    update({ jobsCategory: "diverse" });
                    setShowCatPopover(false);
                    navigate("jobs");
                  }}
                  style={{
                    background:"#f8fafc", borderRadius:10,
                    border:`1.5px dashed ${T.border}`,
                    padding:"9px 11px", cursor:"pointer",
                    display:"flex", alignItems:"center", gap:9,
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#94a3b8"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                >
                  <div style={{ width:32, height:32, borderRadius:9, background:"#e2e8f0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>✨</div>
                  <div style={{ fontSize:12, fontWeight:700, color:T.text }}>{t("home_diverse_label","Otros")}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Map shortcut */}
        <button
          data-testid="home-map-shortcut"
          onClick={() => navigate("map")}
          style={{
            height:42, padding:"0 14px", borderRadius:12,
            border:`1.5px solid ${T.border}`, background:"#fff",
            color:T.text2, fontSize:13, fontWeight:700, cursor:"pointer",
            display:"flex", alignItems:"center", gap:7, whiteSpace:"nowrap",
            boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          🗺️ {t("home_on_map_btn","Mapa")}
        </button>
      </div>

      {/* Recent searches chips — shown only when no input text */}
      {!searchText.trim() && recentSearches.length > 0 && (
        <div data-testid="home-recent-searches" style={{
          display:"flex", flexWrap:"wrap", alignItems:"center", gap:6,
          marginBottom:16, marginTop:-8, padding:"0 2px",
        }}>
          <span style={{ fontSize:10, fontWeight:700, color:T.text3, textTransform:"uppercase", letterSpacing:"0.05em", marginRight:4 }}>
            🕒 {t("home_recent_searches","Búsquedas recientes")}:
          </span>
          {recentSearches.map((q, i) => (
            <button
              data-testid={`home-recent-${i}`}
              key={q + i}
              onClick={() => { setSearchText(q); doSearch(q); }}
              style={{
                background:"#f5f5f4", border:`1px solid ${T.border}`, borderRadius:999,
                padding:"4px 11px 4px 10px", fontSize:11, fontWeight:600,
                color:T.text2, cursor:"pointer", display:"flex", alignItems:"center", gap:4,
                transition:"all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#e7e5e4"; e.currentTarget.style.borderColor = T.green; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#f5f5f4"; e.currentTarget.style.borderColor = T.border; }}
            >
              <span style={{ fontSize:10, opacity:0.6 }}>↻</span> {q}
            </button>
          ))}
          <button
            data-testid="home-recent-clear"
            onClick={clearRecentSearches}
            title={t("home_recent_clear","Borrar historial")}
            style={{
              background:"transparent", border:"none", cursor:"pointer",
              color:T.text3, fontSize:11, padding:"4px 8px", fontWeight:600,
              textDecoration:"underline", marginLeft:4,
            }}
          >✕ {t("home_recent_clear","Borrar")}</button>
        </div>
      )}

      {/* Two columns */}
      <div className="jc-home-grid" style={{ display:"grid",gridTemplateColumns:"1fr minmax(0,320px)",gap:16 }}>
        <div>
          {promotedJobs.length>0&&(<div style={{marginBottom:20}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><h3 style={{fontFamily:"Outfit,sans-serif",fontSize:15,fontWeight:700,color:T.amber,margin:0}}>{t("home_promoted_section")}</h3><div style={{flex:1,height:1,background:`${T.amber}44`}}/></div><div style={{display:"flex",flexDirection:"column",gap:8}}>{promotedJobs.slice(0,3).map(job=><JobCardRow key={job.id||job._id} job={job} promoted navigate={navigate} update={update} t={t}/>)}</div></div>)}
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <h3 style={{fontFamily:"Outfit,sans-serif",fontSize:15,fontWeight:700,color:T.text,margin:0}}>{t("home_recent_section")}</h3>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <button data-testid="toggle-demo-btn" onClick={toggleDemo} style={{padding:"4px 10px",borderRadius:8,border:`1px solid ${hideDemo?"#86efac":T.border}`,background:hideDemo?"#f0fdf4":"#f8fafc",color:hideDemo?"#166534":T.text3,fontSize:10,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>
                  {hideDemo ? t("demo_show_btn") : t("demo_hide_btn")}
                </button>
                <Btn variant="ghost" size="sm" onClick={()=>navigate("jobs")}>{t("home_all_ads_arrow")}</Btn>
              </div>
            </div>
            {recentJobs.length>0?(<div style={{display:"flex",flexDirection:"column",gap:8}}>{recentJobs.map(job=><JobCardRow key={job.id||job._id} job={job} navigate={navigate} update={update} t={t}/>)}</div>):(
              <Card style={{padding:"32px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:10}}>📋</div><div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:8}}>{t("home_no_ads")}</div><div style={{fontSize:12,color:T.text3,marginBottom:16}}>{t("home_no_ads_sub")}</div>{gs.user.role==="employer"&&<Btn onClick={()=>navigate("post_job")} color={T.green}>{t("home_post_ad_btn")}</Btn>}</Card>
            )}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Card style={{padding:"16px 18px"}}>
            <h3 style={{fontFamily:"Outfit,sans-serif",fontSize:15,fontWeight:700,color:T.text,margin:"0 0 12px"}}>{t("home_stats_title")}</h3>
            {[{icon:"📋",label:t("home_stats_active"),value:allJobs.length,color:T.green},{icon:"🔥",label:t("home_stats_urgent"),value:allJobs.filter(j=>j.urgent).length,color:T.red},{icon:"⭐",label:t("home_stats_promoted"),value:promotedJobs.length,color:T.amber},{icon:"📂",label:t("home_stats_cats"),value:new Set(allJobs.map(j=>j.category||t("home_diverse_label")).filter(Boolean)).size,color:T.blue}].map(s=>(
              <div key={s.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${T.border}`}}><span style={{fontSize:12,color:T.text2}}>{s.icon} {s.label}</span><span style={{fontWeight:800,color:s.color,fontSize:15,fontFamily:"Outfit,sans-serif"}}>{s.value||"—"}</span></div>
            ))}
          </Card>
          <Card style={{padding:"16px 18px"}}>
            <h3 style={{fontFamily:"Outfit,sans-serif",fontSize:15,fontWeight:700,color:T.text,margin:"0 0 14px"}}>{t("home_activity_title")}</h3>
            {[{icon:"💬",text:t("home_activity_1"),time:"2 min",color:T.green},{icon:"👁️",text:t("home_activity_2"),time:"1h",color:T.blue},{icon:"🎯",text:t("home_activity_3"),time:"2h",color:T.purple}].map((a,i)=>(
              <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:i<2?`1px solid ${T.border}`:"none"}}><div style={{width:30,height:30,borderRadius:8,background:`${a.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{a.icon}</div><div style={{flex:1}}><div style={{fontSize:12,color:T.text,fontWeight:500}}>{a.text}</div><div style={{fontSize:10,color:T.text3,marginTop:2}}>{a.time}</div></div></div>
            ))}
          </Card>
          <Card style={{padding:"16px 18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><h3 style={{fontFamily:"Outfit,sans-serif",fontSize:15,fontWeight:700,color:T.text,margin:0}}>{t("home_profile_card")}</h3><span style={{fontFamily:"Outfit,sans-serif",fontSize:18,fontWeight:800,color:T.green}}>78%</span></div>
            <div style={{height:6,borderRadius:999,background:T.border,marginBottom:12,overflow:"hidden"}}><div style={{height:"100%",borderRadius:999,background:`linear-gradient(90deg,${T.green},${T.greenLight})`,width:"78%",transition:"width 1s ease"}}/></div>
            {[{label:t("home_profile_basic"),done:true},{label:t("home_profile_identity"),done:gs.user.verified},{label:t("home_profile_reviews_label"),done:false}].map(item=>(
              <div key={item.label} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0"}}><div style={{width:16,height:16,borderRadius:"50%",background:item.done?T.green:T.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",flexShrink:0}}>{item.done?"✓":""}</div><span style={{fontSize:12,color:item.done?T.text:T.text3}}>{item.label}</span></div>
            ))}
          </Card>
        </div>
      </div>

      {/* Provider Location Modal */}
      <ProviderLocationModal
        open={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSaved={() => { /* could refresh data if needed */ }}
      />
    </div>
  );
}
