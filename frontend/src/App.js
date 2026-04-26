import { useState, useEffect, useRef, useCallback } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "./context/AuthContext";
import api from "./services/api";
import { T } from "./constants/theme";
import { Avatar, Loader } from "./components/shared";
import LanguageSwitcher from "./components/LanguageSwitcher";
import RoleSwitcher from "./components/RoleSwitcher";
import Icon from "./components/Icon";
import { isFeatureEnabled } from "./constants/features";
import "./App.css";

// ── Pages ─────────────────────────────────────────────────────
import Login from "./pages/Login";
import Register from "./pages/Register";
import PageHome from "./pages/PageHome";
import PageJobs from "./pages/PageJobs";
import MapPage from "./pages/MapPage";
import PostJobPage from "./pages/PostJobPage";
import PageChat from "./pages/PageChat";
import PageEscrow from "./pages/PageEscrow";
import PageContract from "./pages/PageContract";
import PageVerify from "./pages/PageVerify";
import PageReviews from "./pages/PageReviews";
import PageAnalytics from "./pages/PageAnalytics";
import PageAdmin from "./pages/PageAdmin";
import PageCalendar from "./pages/PageCalendar";
import PagePricing from "./pages/PagePricing";
import AuthCallback from "./pages/AuthCallback";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

/* ═══════════════════════════════════════════════════════════════
   JOOBCONNECT — Aplicație Completă Refactorizată
   Layout principal + Routing — componentele sunt în /pages/
   ═══════════════════════════════════════════════════════════════ */

// ── Global state (shared between all modules) ─────────────────
const useGlobalState = () => {
  const [state, setState] = useState({
    user: { name:"", initials:"", verified:false, rating:0 },
    jobs: [],
    selectedJob: null,
    escrowActive: null,
    signedContracts: [],
    notifications: 3,
    unreadMessages: 2,
    jobsCategory: "",
    schedule: JSON.parse(localStorage.getItem("jc_schedule")||"[]"),
  });
  const update = (patch) => setState(s => ({...s, ...patch}));
  return [state, update];
};

// ══════════════════════════════════════════════════════════════
//  MAIN APP SHELL — Layout, Sidebar, Navbar, Navigation
// ══════════════════════════════════════════════════════════════
function ConnectJobApp() {
  const { user, loading: authLoading, logout } = useAuth();
  const { t } = useTranslation("t");
  const [gs, updateGs] = useGlobalState();
  const [page, setPage] = useState(() => {
    // Restore page from URL hash if present
    const hash = window.location.hash.replace("#", "");
    return hash && hash !== "" ? hash : "home";
  });
  const [loadingPage, setLoadingPage] = useState(false);
  const [pwaShow, setPwaShow] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [trialInfo, setTrialInfo] = useState(null);
  const prevPage = useRef("home");

  // Sync page state with browser history for back button support
  useEffect(() => {
    const onPopState = (e) => {
      const newPage = e.state?.page || window.location.hash.replace("#", "") || "home";
      prevPage.current = page;
      setPage(newPage);
    };
    window.addEventListener("popstate", onPopState);
    // Set initial history state
    if (!window.history.state?.page) {
      window.history.replaceState({ page }, "", `#${page}`);
    }
    return () => window.removeEventListener("popstate", onPopState);
  }, [page]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Sincronizeaza userul din AuthContext cu globalState
  useEffect(() => {
    if (user) {
      updateGs({
        user: {
          id: user.id || user._id,
          name: user.name,
          initials: user.initials || user.name?.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2),
          verified: !!user.verified,
          rating: user.rating || 0,
          role: user.active_role || user.role,
          roles: user.roles || [user.role || "worker"],
          active_role: user.active_role || user.role || "worker",
          subscription_plan: user.subscription_plan || "free",
        }
      });
    }
  }, [user]);

  // Incarca joburi reale din backend si le pune in globalState
  useEffect(() => {
    if (!user) return;
    api.get("/jobs").then(r => updateGs({ jobs: r.data.jobs || r.data })).catch(()=>{});
    // Load trial info
    api.get("/subscriptions/my").then(r => setTrialInfo(r.data)).catch(()=>{});
  }, [user]);

  const navigate = useCallback((to) => {
    if(to===page) return;
    setLoadingPage(true);
    prevPage.current = page;
    window.history.pushState({ page: to }, "", `#${to}`);
    setTimeout(()=>{ setPage(to); setLoadingPage(false); }, 200);
  }, [page]);

  const update = useCallback((patch) => updateGs(patch), [updateGs]);

  const NAV = [
    { key:"home",     label:t("nav_home") },
    { key:"jobs",     label:t("nav_jobs") },
    { key:"map",      label:t("nav_map"),     badge: null },
    { key:"chat",     label:t("nav_chat"),    badge: gs.unreadMessages },
    { key:"escrow",   label:t("nav_escrow") },
    { key:"calendar", label:t("nav_calendar","Agenda"),    hidden: !isFeatureEnabled("calendar") },
    { key:"contract", label:t("nav_contract"),             hidden: !isFeatureEnabled("contract") },
    { key:"reviews",  label:t("nav_reviews"),              hidden: !isFeatureEnabled("reviews") },
    { key:"analytics",label:t("nav_analytics"),            hidden: !isFeatureEnabled("analytics") },
    { key:"pricing",  label:t("nav_pricing","Planes") },
    { key:"post_job", label:t("nav_post_job"),             hidden: gs.user.active_role !== "employer" },
    { key:"verify",   label: gs.user.verified?t("nav_verified"):t("nav_verify"), badge: gs.user.verified?null:"!" },
    { key:"admin",    label:t("nav_admin"),                hidden: gs.user.active_role !== "admin" || !isFeatureEnabled("admin") },
  ].filter(item => !item.hidden);

  const PAGE_TITLES = {
    home:      t("nav_home"),
    jobs:      t("nav_jobs"),
    map:       t("nav_map"),
    chat:      t("nav_chat"),
    escrow:    t("nav_escrow"),
    calendar:  t("nav_calendar","Agenda"),
    contract:  t("nav_contract"),
    reviews:   t("nav_reviews"),
    analytics: t("nav_analytics"),
    pricing:   t("nav_pricing_title","Planes y Precios"),
    post_job:  t("nav_post_job"),
    verify:    t("nav_verify"),
    admin:     t("nav_admin"),
  };

  const renderPage = () => {
    const props = { gs, update, navigate };
    if(loadingPage) return <Loader text={t("loading","Cargando...")}/>;
    // Block routes for features hidden via feature flag
    if(!isFeatureEnabled(page)) {
      // Allow direct admin URL access for admins (escape hatch)
      if(page === "admin" && gs.user.active_role === "admin") {
        return <PageAdmin {...props}/>;
      }
      return <PageHome {...props}/>;
    }
    switch(page) {
      case "home":      return <PageHome      {...props}/>;
      case "jobs":      return <PageJobs      {...props}/>;
      case "map":       return <MapPage       gs={gs} update={update} navigate={navigate}/>;
      case "post_job":  return <PostJobPage navigate={navigate} onSuccess={()=>api.get("/jobs").then(r=>update({jobs:r.data.jobs||r.data})).catch(()=>{})}/>;
      case "chat":      return <PageChat     {...props}/>;
      case "escrow":    return <PageEscrow    {...props}/>;
      case "calendar":  return <PageCalendar  {...props}/>;
      case "contract":  return <PageContract  {...props}/>;
      case "reviews":   return <PageReviews   {...props}/>;
      case "analytics": return <PageAnalytics {...props}/>;
      case "pricing":   return <PagePricing   {...props}/>;
      case "verify":    return <PageVerify    {...props}/>;
      case "admin":     return <PageAdmin     {...props}/>;
      default:          return <PageHome      {...props}/>;
    }
  };

  // Afiseaza spinner cat timp se verifica autentificarea
  if (authLoading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <Loader text={t("loading","Cargando...")}/>
    </div>
  );

  // Daca nu e autentificat, arata paginile de login/register
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login/>}/>
        <Route path="/register" element={<Register/>}/>
        <Route path="*" element={<Navigate to="/login" replace/>}/>
      </Routes>
    );
  }

  return (
    <div style={{ fontFamily:"Inter,DM Sans,sans-serif", background:T.bg, minHeight:"100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeInBg{from{opacity:0}to{opacity:1}}
        @keyframes slideUpModal{from{opacity:0;transform:translateY(30px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes ringPulse{0%{transform:scale(1);opacity:1}100%{transform:scale(1.8);opacity:0}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pinDrop{from{opacity:0;transform:translate(-50%,-60%) scale(0.4)}to{opacity:1;transform:translate(-50%,-100%) scale(1)}}
        @keyframes userPulse{0%{box-shadow:0 0 0 0 rgba(59,130,246,0.5)}70%{box-shadow:0 0 0 12px rgba(59,130,246,0)}100%{box-shadow:0 0 0 0 rgba(59,130,246,0)}}
        @keyframes urgentPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.4)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
        @keyframes wave{from{transform:scaleY(0.3)}to{transform:scaleY(1.5)}}
        @keyframes micGlow{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.5)}50%{box-shadow:0 0 0 8px rgba(239,68,68,0)}}
        @keyframes popIn{from{transform:scale(0)}to{transform:scale(1)}}
        @keyframes pwaBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#d4d4aa66;border-radius:99px}
      `}</style>

      {/* PWA Banner */}
      {pwaShow && (
        <div style={{ position:"fixed",bottom:16,left:"50%",transform:"translateX(-50%)",width:"min(96vw,480px)",zIndex:999,background:`linear-gradient(135deg,${T.dark},${T.dark2})`,borderRadius:18,padding:"14px 16px",border:`1px solid ${T.dark3}`,boxShadow:"0 20px 60px rgba(0,0,0,0.4)",animation:"slideUp 0.4s cubic-bezier(0.175,0.885,0.32,1.275)" }}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:48,height:48,borderRadius:13,background:`linear-gradient(135deg,${T.green},${T.greenLight})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0,boxShadow:`0 4px 12px ${T.green}44`,animation:"pwaBounce 2s ease-in-out infinite"}}>⚡</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"Outfit,sans-serif",fontWeight:800,fontSize:14,color:"#f1f5f9",marginBottom:2}}>{t("pwa_title")}</div>
              <div style={{fontSize:11,color:"#94a3b8"}}>{t("pwa_subtitle")}</div>
            </div>
            <button onClick={()=>setPwaShow(false)} style={{background:"transparent",border:"none",color:"#64748b",fontSize:16,cursor:"pointer",padding:4}}>✕</button>
          </div>
          <div style={{display:"flex",gap:7,marginTop:11}}>
            <button style={{flex:1,padding:"9px",borderRadius:9,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,color:"#fff",fontWeight:700,fontSize:12,fontFamily:"DM Sans,sans-serif",boxShadow:`0 4px 12px ${T.green}44`}}>{t("pwa_install_btn")}</button>
            <button onClick={()=>setPwaShow(false)} style={{padding:"9px 14px",borderRadius:9,border:`1px solid ${T.dark3}`,cursor:"pointer",background:"transparent",color:"#64748b",fontSize:12,fontFamily:"DM Sans,sans-serif"}}>{t("pwa_later")}</button>
          </div>
          <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:8}}>
            {[t("pwa_feat_fast"),t("pwa_feat_offline"),t("pwa_feat_notif"),t("pwa_feat_secure")].map(f=><span key={f} style={{fontSize:10,color:"#64748b"}}>{f}</span>)}
          </div>
        </div>
      )}

      {/* Top navbar */}
      <nav data-testid="top-navbar" style={{ background:"rgba(255,255,255,0.97)",backdropFilter:"blur(14px)",borderBottom:`1.5px solid ${T.border}`,height:58,padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:80,boxShadow:"0 1px 20px rgba(0,0,0,0.05)" }}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:32,height:32,borderRadius:10,background:`linear-gradient(135deg,${T.green},${T.greenLight})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:`0 3px 10px ${T.green}44`}}>⚡</div>
          <span style={{fontFamily:"Outfit,sans-serif",fontWeight:900,fontSize:18,color:T.text,letterSpacing:"-0.02em"}}>Connect<span style={{color:T.green}}>Job</span></span>
        </div>

        {/* Page title - hidden on mobile */}
        <div className="jc-page-title" style={{fontFamily:"Outfit,sans-serif",fontWeight:700,fontSize:15,color:T.text2}}>
          {PAGE_TITLES[page]}
        </div>

        {/* User area */}
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {/* Notifications */}
          <div style={{position:"relative"}}>
            <button data-testid="notifications-btn" style={{width:34,height:34,borderRadius:9,background:"#f5f5f4",border:`1.5px solid ${T.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:T.text2}}>
              <Icon name="bell" size={16}/>
            </button>
            {gs.notifications>0&&<div style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:T.red,border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff"}}>{gs.notifications}</div>}
          </div>
          {/* Avatar */}
          <div style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer"}} onClick={()=>navigate("verify")} data-testid="user-avatar-btn">
            <Avatar initials={gs.user.initials} color={T.green} size={32}/>
            <div style={{display:"flex",flexDirection:"column"}}>
              <span style={{fontSize:12,fontWeight:700,color:T.text,lineHeight:1}}>{gs.user.name.split(" ")[0]}</span>
              {gs.user.verified&&<span style={{fontSize:9,color:T.green,fontWeight:600}}>{t("nav_verified_badge","✓ Verificado")}</span>}
              {gs.user.subscription_plan && gs.user.subscription_plan !== "free" && (
                <span data-testid="plan-badge-nav" style={{fontSize:8,fontWeight:700,color:"#fff",background:gs.user.subscription_plan==="premium"?`linear-gradient(135deg,${T.amber},${T.amberDark})`:`linear-gradient(135deg,${T.green},${T.greenDark})`,borderRadius:999,padding:"1px 6px",display:"inline-block",marginTop:1,textTransform:"uppercase"}}>{gs.user.subscription_plan}</span>
              )}
            </div>
          </div>
          {/* Role Switcher (Dual Mode) — only for non-admin */}
          {gs.user.active_role !== "admin" && (
            <RoleSwitcher
              activeRole={gs.user.active_role}
              onSwitched={(newRole, newRoles) => {
                updateGs({ user: { ...gs.user, active_role: newRole, role: newRole, roles: newRoles } });
                // If user was on a role-restricted page (post_job, admin), navigate home
                if (page === "post_job" && newRole !== "employer") navigate("home");
                if (page === "admin" && newRole !== "admin") navigate("home");
              }}
            />
          )}
          {/* Selector de limba */}
          <LanguageSwitcher/>
          {/* Logout */}
          <button data-testid="logout-btn" onClick={logout} title={t("btn_logout")} style={{width:32,height:32,borderRadius:9,background:"#fef2f2",border:"1.5px solid #fecaca",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#dc2626"}}>
            <Icon name="logout" size={15}/>
          </button>
        </div>
      </nav>

      {/* Main layout */}
      <div style={{display:"flex",minHeight:"calc(100vh - 58px)"}}>

        {/* Sidebar navigation */}
        <aside className="jc-desktop-sidebar" data-testid="sidebar-nav" style={{ width:210,flexShrink:0,background:T.white,borderRight:`1.5px solid ${T.border}`,padding:"12px 10px",position:"sticky",top:58,height:"calc(100vh - 58px)",overflowY:"auto" }}>
          <div style={{fontSize:9,fontWeight:700,color:T.text3,textTransform:"uppercase",letterSpacing:"0.1em",padding:"6px 10px",marginBottom:4}}>{t("sidebar_nav_label")}</div>
          {NAV.map(item=>(
            <div key={item.key} onClick={()=>navigate(item.key)} data-testid={`nav-${item.key}`}
              style={{
                display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,cursor:"pointer",marginBottom:2,
                background:page===item.key?`${T.green}12`:"transparent",
                borderLeft:page===item.key?`3px solid ${T.green}`:"3px solid transparent",
                transition:"all 0.15s",position:"relative",
              }}
              onMouseEnter={e=>{if(page!==item.key)e.currentTarget.style.background="#f5f5f4";}}
              onMouseLeave={e=>{if(page!==item.key)e.currentTarget.style.background="transparent";}}
            >
              <span style={{fontSize:13,fontWeight:page===item.key?700:500,color:page===item.key?T.green:T.text2}}>{item.label}</span>
              {item.badge&&<div style={{marginLeft:"auto",background:item.badge==="!"?T.amber:T.red,color:"#fff",borderRadius:999,minWidth:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700}}>{item.badge}</div>}
            </div>
          ))}

          {/* Quick Actions in sidebar */}
          <div style={{marginTop:12,padding:"10px",background:`${T.amber}06`,borderRadius:10,border:`1px solid ${T.amber}22`}}>
            <div style={{fontSize:10,fontWeight:700,color:T.amber,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>{t("home_quick_actions","Acciones rápidas")}</div>
            {[
              {key:"dashboard",label:t("home_dashboard","Dashboard"),testid:"dashboard-stats-btn"},
              {key:"search",label:t("home_adv_search","Búsqueda Avanzada"),testid:"advanced-search-btn"},
            ].map(a=>(
              <div key={a.key} onClick={()=>{navigate("home");setTimeout(()=>{const el=document.querySelector(`[data-testid="${a.testid}"]`);if(el)el.click();},300);}} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 4px",cursor:"pointer",borderRadius:6,transition:"background 0.12s"}} onMouseEnter={e=>e.currentTarget.style.background=`${T.amber}10`} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <span style={{fontSize:11,fontWeight:500,color:T.text2}}>{a.label}</span>
              </div>
            ))}
          </div>

          {/* Trial countdown widget */}
          {trialInfo?.trial?.active && (
            <div data-testid="sidebar-trial-widget" onClick={()=>navigate("pricing")} style={{marginTop:10,padding:"10px",background:`linear-gradient(135deg,${T.green}10,${T.blue}08)`,borderRadius:10,border:`1.5px solid ${T.green}22`,cursor:"pointer",transition:"all 0.15s"}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                <div style={{width:24,height:24,borderRadius:7,background:`linear-gradient(135deg,${T.green},${T.greenDark})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",fontWeight:900}}>{trialInfo.trial.days_remaining}</div>
                <div style={{fontSize:10,fontWeight:700,color:T.green,textTransform:"uppercase",letterSpacing:"0.05em"}}>{t("sidebar_trial_pro","PRO TRIAL")}</div>
              </div>
              <div style={{fontSize:10,color:T.text2,lineHeight:1.4}}>
                {trialInfo.trial.days_remaining} {trialInfo.trial.days_remaining===1?t("sidebar_trial_day","día restante"):t("sidebar_trial_days","días restantes")}
              </div>
              <div style={{marginTop:6,padding:"4px 8px",borderRadius:6,background:`linear-gradient(135deg,${T.green},${T.greenDark})`,color:"#fff",fontSize:9,fontWeight:700,textAlign:"center"}}>{t("sidebar_upgrade_now","Upgrade ahora")}</div>
            </div>
          )}

          {/* Trial eligible CTA */}
          {trialInfo?.trial_eligible && !trialInfo?.trial?.active && trialInfo?.plan === "free" && (
            <div data-testid="sidebar-trial-cta" onClick={()=>navigate("pricing")} style={{marginTop:10,padding:"10px",background:`${T.green}06`,borderRadius:10,border:`1.5px dashed ${T.green}33`,cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}>
              <div style={{fontSize:16,marginBottom:3}}>⚡</div>
              <div style={{fontSize:10,fontWeight:700,color:T.green}}>{t("sidebar_try_pro_free","Pro gratis 7 días")}</div>
              <div style={{fontSize:9,color:T.text3,marginTop:2}}>{t("sidebar_try_now","Pruébalo ahora")}</div>
            </div>
          )}

          {/* Job selected indicator */}
          {gs.selectedJob&&(
            <div style={{marginTop:10,padding:"9px 10px",background:"#fafaf9",borderRadius:9,border:`1px solid ${T.border}`}}>
              <div style={{fontSize:9,fontWeight:700,color:T.text3,textTransform:"uppercase",marginBottom:5}}>{t("sidebar_selected_job")}</div>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontSize:16}}>{gs.selectedJob.icon}</span>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{gs.selectedJob.title}</div>
                  <div style={{fontSize:10,color:gs.selectedJob.color,fontWeight:600}}>{gs.selectedJob.salary} €</div>
                </div>
              </div>
              <div style={{display:"flex",gap:5,marginTop:7}}>
                <button data-testid="sidebar-escrow-btn" onClick={()=>navigate("escrow")} style={{flex:1,padding:"4px",borderRadius:6,border:"none",cursor:"pointer",background:T.green,color:"#fff",fontSize:10,fontWeight:700}}>Escrow</button>
                <button data-testid="sidebar-contract-btn" onClick={()=>navigate("contract")} style={{flex:1,padding:"4px",borderRadius:6,border:`1px solid ${T.border}`,cursor:"pointer",background:"#fff",color:T.text2,fontSize:10,fontWeight:600}}>Contract</button>
              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="jc-main-content" style={{flex:1,padding:"24px 22px",minWidth:0,overflowY:"auto"}}>
          {renderPage()}
        </main>
      </div>

      {/* Bottom navigation — mobile only */}
      <nav className="jc-bottom-nav" data-testid="bottom-nav" style={{
        display:"none", position:"fixed", bottom:0, left:0, right:0, zIndex:90,
        background:"rgba(255,255,255,0.97)", backdropFilter:"blur(14px)",
        borderTop:`1.5px solid ${T.border}`, height:60,
        alignItems:"stretch", boxShadow:"0 -4px 20px rgba(0,0,0,0.08)",
      }}>
        {[
          { key:"home",   label:t("nav_home") },
          { key:"jobs",   label:t("nav_jobs") },
          { key:"map",    label:t("nav_map") },
          { key:"chat",   label:t("nav_chat"), badge: gs.unreadMessages },
          { key:"verify", label:t("nav_profile") },
        ].map(item=>(
          <button key={item.key} onClick={()=>navigate(item.key)} data-testid={`bottom-nav-${item.key}`} style={{
            flex:1, background:"none", border:"none", cursor:"pointer",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            gap:2, padding:"4px 0", position:"relative",
            borderTop: page===item.key ? `2px solid ${T.green}` : "2px solid transparent",
            transition:"all 0.15s",
          }}>
            <span style={{ fontSize:12, fontWeight:page===item.key?700:500, color:page===item.key?T.green:T.text3 }}>{item.label}</span>
            {item.badge>0 && <div style={{ position:"absolute",top:8,right:"22%",width:14,height:14,borderRadius:"50%",background:T.red,border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#fff" }}>{item.badge}</div>}
          </button>
        ))}
      </nav>
    </div>
  );
}

// Wrapper cu Routes — necesar pentru React Router
// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function AppRouter() {
  const location = useLocation();
  // CRITICAL: Check URL fragment synchronously for session_id (prevents race conditions)
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/login"            element={<Login/>}/>
      <Route path="/register"         element={<Register/>}/>
      <Route path="/verify-email"     element={<VerifyEmail/>}/>
      <Route path="/forgot-password"  element={<ForgotPassword/>}/>
      <Route path="/reset-password"   element={<ResetPassword/>}/>
      <Route path="*"                 element={<ConnectJobApp/>}/>
    </Routes>
  );
}

function App() {
  return <AppRouter />;
}
export default App;
