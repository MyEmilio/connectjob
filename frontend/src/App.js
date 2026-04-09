import { useState, useEffect, useRef, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "./context/AuthContext";
import api from "./services/api";
import { getSocket } from "./services/socket";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MapPage from "./pages/MapPage";
import LanguageSwitcher from "./components/LanguageSwitcher";
import PostJobPage from "./pages/PostJobPage";
import usePushNotifications from "./hooks/usePushNotifications";

/* ═══════════════════════════════════════════════════════════════
   JOOBCONNECT — Aplicație Completă Unificată
   Toate modulele conectate cu navigare globală și date partajate
   ═══════════════════════════════════════════════════════════════ */

// ── Design tokens ─────────────────────────────────────────────
const T = {
  green:  "#059669", greenDark:"#047857", greenLight:"#34d399",
  amber:  "#f59e0b", amberDark:"#d97706",
  blue:   "#3b82f6", blueDark:"#1d4ed8",
  purple: "#8b5cf6", pink:"#ec4899",
  red:    "#ef4444", orange:"#ea580c",
  dark:   "#0f172a", dark2:"#1e293b", dark3:"#334155",
  text:   "#1c1917", text2:"#57534e", text3:"#a8a29e",
  border: "#e7e5e4", bg:"#fafaf9", white:"#ffffff",
};

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

// ── Mock data ─────────────────────────────────────────────────
const JOBS = [
  { id:1, title:"Curățare piscinã",    lat:46.7712, lng:23.6236, salary:150, category:"Curățenie",   employer:"SC CleanPro SRL",   employerInitials:"CP", rating:4.8, reviews:34, distance:2.3, color:T.green,  icon:"🏊", type:"part-time", urgent:false, phone:"+40722123456", description:"Curățare și întreținere piscinã rezidențială. Echipament asigurat.", skills:["Curățenie","Chimie piscinã"] },
  { id:2, title:"Plimbare câini",      lat:46.7780, lng:23.5990, salary:50,  category:"Animale",     employer:"Maria Constantin",  employerInitials:"MC", rating:4.9, reviews:28, distance:1.1, color:T.purple, icon:"🐕", type:"part-time", urgent:true,  phone:"+40733987654", description:"Plimbare zilnică a 2 labradors prietenoși, 45 minute.", skills:["Animale","Responsabilitate"] },
  { id:3, title:"Reparații electrice", lat:46.7575, lng:23.5957, salary:120, category:"Construcții", employer:"Andrei Electricul", employerInitials:"AE", rating:4.7, reviews:52, distance:3.7, color:T.amber,  icon:"⚡", type:"full-time", urgent:false, phone:"+40744456789", description:"Reparații și instalații electrice. Necesar autorizație ANRE.", skills:["Electric","ANRE"] },
  { id:4, title:"Grădinărit / Cosit",  lat:46.7650, lng:23.6100, salary:80,  category:"Grădină",    employer:"Ion Grădinarul",    employerInitials:"IG", rating:4.6, reviews:19, distance:1.8, color:T.greenLight, icon:"🌿", type:"part-time", urgent:false, phone:"+40755111222", description:"Tuns gazon, plantat flori, îngrijit grădina.", skills:["Grădinărit","Fizic"] },
  { id:5, title:"Livrare colete",      lat:46.7820, lng:23.6300, salary:90,  category:"Transport",  employer:"SpeedCourier SRL",  employerInitials:"SC", rating:4.5, reviews:87, distance:4.2, color:T.blue,   icon:"📦", type:"full-time", urgent:true,  phone:"+40766333444", description:"Livrare colete în zona Cluj. Necesar permis categoria B.", skills:["Șofer","GPS"] },
  { id:6, title:"Baby-sitting",        lat:46.7490, lng:23.5800, salary:60,  category:"Îngrijire",  employer:"Elena Popescu",     employerInitials:"EP", rating:5.0, reviews:12, distance:0.9, color:T.pink,   icon:"👶", type:"part-time", urgent:false, phone:"+40777555666", description:"Îngrijire copil 3 ani, weekenduri.", skills:["Îngrijire","Răbdare"] },
  { id:7, title:"Zugrăvit / Vopsit",  lat:46.7700, lng:23.6400, salary:200, category:"Construcții", employer:"PictorPro SRL",     employerInitials:"PP", rating:4.8, reviews:41, distance:3.1, color:T.orange, icon:"🖌️", type:"full-time",urgent:true,  phone:"+40788777888", description:"Zugrăvit interior/exterior. Materiale asigurate.", skills:["Zugrăvit","Atenție"] },
];

// ── Categorii OLX-style ───────────────────────────────────────
const CATEGORIES = [
  { key:"constructii",  icon:"🏗️",  label:"Construcții & Renovări",    color:"#ea580c", sub:["Zidărie","Zugrăvit","Instalații","Tâmplărie","Electricitate","Sanitare","Gresie"] },
  { key:"curatenie",    icon:"🧹",  label:"Curățenie",                 color:"#059669", sub:["Casnic","Birouri","Piscine","Geamuri","Post-construcție","Mochete"] },
  { key:"ingrijire",    icon:"🤱",  label:"Îngrijire Persoane",        color:"#ec4899", sub:["Baby-sitting","Vârstnici","Persoane cu dizabilități","Au pair"] },
  { key:"animale",      icon:"🐾",  label:"Animale de companie",       color:"#7c3aed", sub:["Plimbare","Îngrijire","Dresaj","Pet-sitting","Veterinar"] },
  { key:"gradina",      icon:"🌿",  label:"Grădini & Exterior",        color:"#16a34a", sub:["Tuns gazon","Plantat","Irigații","Tăiat arbori","Design grădină"] },
  { key:"transport",    icon:"🚗",  label:"Transport & Livrări",       color:"#3b82f6", sub:["Livrări colete","Taxi","Șofer personal","Mutări","Curierat"] },
  { key:"it",           icon:"💻",  label:"IT & Digital",              color:"#6366f1", sub:["Web & App","Reparații PC","Rețele","SEO","Social Media","Design"] },
  { key:"educatie",     icon:"📚",  label:"Educație & Cursuri",        color:"#f59e0b", sub:["Meditații","Limbi străine","Muzică","Sport & Fitness","Arte"] },
  { key:"gastronomie",  icon:"👨‍🍳", label:"Gastronomie",               color:"#ef4444", sub:["Bucătar","Ospătar","Catering","Barman","Patiserie"] },
  { key:"frumusete",    icon:"💅",  label:"Frumusețe & Wellness",      color:"#db2777", sub:["Coafor","Estetică","Manichiură","Masaj","Make-up"] },
  { key:"reparatii",    icon:"🔧",  label:"Reparații & Service",       color:"#92400e", sub:["Auto","Electrocasnice","Mobilier","Calculatoare","Ceasuri"] },
  { key:"evenimente",   icon:"🎉",  label:"Evenimente & Divertisment", color:"#0891b2", sub:["Fotograf","Videograf","Muzician","Animator","Organizator"] },
];

const CONVERSATIONS = [
  { id:1, jobId:1, unread:2, online:true,  lastMsg:"Ești disponibil mâine?",        time:"10:32",
    messages:[
      {id:1,from:"them",text:"Bună ziua! Am văzut că ai aplicat pentru curățare piscinã.",time:"10:28"},
      {id:2,from:"me",  text:"Da! Sunt interesat. Am 3 ani experiență.",time:"10:29"},
      {id:3,from:"them",text:"Excelent! Ce program preferi?",time:"10:30"},
      {id:4,from:"me",  text:"Prefer dimineața, 8-12.",time:"10:31"},
      {id:5,from:"them",text:"Ești disponibil mâine?",time:"10:32"},
    ]},
  { id:2, jobId:2, unread:0, online:false, lastMsg:"Câinii sunt doi labradors 🐕",  time:"Ieri",
    messages:[
      {id:1,from:"them",text:"Salut! Ai experiență cu câini mari?",time:"09:15"},
      {id:2,from:"me",  text:"Da, am crescut cu câini mari!",time:"09:18"},
      {id:3,from:"them",text:"Câinii mei sunt doi labradors 🐕",time:"09:20"},
    ]},
  { id:3, jobId:3, unread:1, online:true,  lastMsg:"Pot începe luni.",              time:"Luni",
    messages:[
      {id:1,from:"me",  text:"Bună ziua! Ai autorizație ANRE?",time:"14:00"},
      {id:2,from:"them",text:"Da, 5 ani experiență. Am autorizație.",time:"14:05"},
      {id:3,from:"them",text:"Pot începe luni, am toate sculele.",time:"14:06"},
    ]},
];

const REVIEWS = [
  { id:1, jobId:1, author:"Elena M.",   rating:5, text:"Profesionist, punctual, piscinã impecabilă!", date:"Acum 2 zile", verified:true  },
  { id:2, jobId:1, author:"Dan C.",     rating:5, text:"Recomandat cu căldură! Superb.", date:"Acum 5 zile", verified:true },
  { id:3, jobId:2, author:"Maria C.",   rating:5, text:"Câinii mei îl adoră! Foarte de încredere.", date:"Săptămâna trecută", verified:true },
];

// ── Reusable components ───────────────────────────────────────
function Avatar({ initials, color=T.green, size=36, online=false }) {
  return (
    <div style={{ position:"relative", flexShrink:0 }}>
      <div style={{
        width:size, height:size, borderRadius:"50%", flexShrink:0,
        background:`linear-gradient(135deg,${color},${color}99)`,
        display:"flex", alignItems:"center", justifyContent:"center",
        color:"#fff", fontWeight:700, fontSize:size>44?16:12,
        fontFamily:"Outfit,sans-serif", boxShadow:`0 2px 8px ${color}44`,
      }}>{initials}</div>
      {online && <div style={{ position:"absolute",bottom:1,right:1,width:10,height:10,borderRadius:"50%",background:"#22c55e",border:"2px solid #fff" }}/>}
    </div>
  );
}

function Btn({ children, onClick, variant="primary", size="md", color=T.green, disabled=false, style={} }) {
  const sizes = { sm:"8px 14px", md:"11px 20px", lg:"14px 28px" };
  const base = {
    border:"none", borderRadius:10, cursor:disabled?"not-allowed":"pointer",
    fontWeight:700, fontFamily:"DM Sans,sans-serif",
    fontSize: size==="sm"?12:size==="lg"?16:14,
    padding: sizes[size], transition:"all 0.2s", display:"inline-flex",
    alignItems:"center", justifyContent:"center", gap:6, ...style,
  };
  if (variant==="primary") return <button onClick={onClick} disabled={disabled} style={{ ...base, background:disabled?"#e7e5e4":`linear-gradient(135deg,${color},${color}cc)`, color:disabled?"#a8a29e":"#fff", boxShadow:disabled?"none":`0 4px 12px ${color}44` }}>{children}</button>;
  if (variant==="outline") return <button onClick={onClick} disabled={disabled} style={{ ...base, background:"#fff", border:`1.5px solid ${T.border}`, color:T.text2 }}>{children}</button>;
  if (variant==="ghost")   return <button onClick={onClick} disabled={disabled} style={{ ...base, background:"transparent", color:T.text3 }}>{children}</button>;
  return <button onClick={onClick} disabled={disabled} style={base}>{children}</button>;
}

function Card({ children, style={}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background:T.white, borderRadius:16, border:`1.5px solid ${T.border}`,
      boxShadow:"0 2px 12px rgba(0,0,0,0.04)", ...style,
      cursor:onClick?"pointer":"default",
      transition:"transform 0.2s, box-shadow 0.2s",
    }}
      onMouseEnter={e=>{ if(onClick){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.09)";} }}
      onMouseLeave={e=>{ if(onClick){e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,0.04)";} }}
    >{children}</div>
  );
}

function Stars({ rating, size=14 }) {
  return (
    <div style={{ display:"flex", gap:2 }}>
      {[1,2,3,4,5].map(i=>(
        <span key={i} style={{ fontSize:size, color:i<=Math.round(rating)?"#f59e0b":"#e7e5e4" }}>★</span>
      ))}
    </div>
  );
}

function Badge({ children, color=T.green }) {
  return <span style={{ background:`${color}15`, color, border:`1px solid ${color}33`, borderRadius:999, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{children}</span>;
}

function Loader({ text="Se încarcă..." }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 20px", gap:12 }}>
      <div style={{ width:40,height:40,borderRadius:"50%",border:`3px solid ${T.border}`,borderTopColor:T.green,animation:"spin 0.8s linear infinite" }}/>
      <div style={{ fontSize:13, color:T.text3 }}>{text}</div>
    </div>
  );
}

// ── Sparkline ─────────────────────────────────────────────────
function Sparkline({ data, color=T.green, height=36 }) {
  const max=Math.max(...data), min=Math.min(...data), range=max-min||1;
  const w=100, h=height;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-min)/range)*(h-6)-3}`).join(" ");
  const id=`g${color.replace(/[^a-z0-9]/gi,"")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",height}} preserveAspectRatio="none">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${id})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}


function JobCardRow({ job, promoted=false, navigate, update, t }) {
  const { t: tFallback } = useTranslation("t");
  const tr = t || tFallback;
  return (
    <div onClick={()=>{ update({selectedJob:job}); navigate("map"); }}
      style={{ background:T.white, borderRadius:12, border:promoted?`2px solid ${T.amber}`:`1.5px solid ${T.border}`, padding:"12px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:12, transition:"all 0.15s", boxShadow:promoted?`0 4px 16px ${T.amber}22`:"none", position:"relative" }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor=promoted?T.amber:job.color+"66"; e.currentTarget.style.background="#fafffe"; e.currentTarget.style.boxShadow=`0 4px 16px ${job.color}22`; }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor=promoted?T.amber:T.border; e.currentTarget.style.background=T.white; e.currentTarget.style.boxShadow=promoted?`0 4px 16px ${T.amber}22`:"none"; }}
    >
      {promoted && <div style={{ position:"absolute",top:-7,left:12,background:`linear-gradient(135deg,${T.amber},${T.amberDark})`,color:"#fff",borderRadius:999,padding:"2px 9px",fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.08em" }}>⭐ {tr("home_stats_promoted")}</div>}
      <div style={{ width:46,height:46,borderRadius:12,background:`${job.color||T.green}15`,border:`1.5px solid ${job.color||T.green}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0 }}>{job.icon||"💼"}</div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:2 }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text }}>{job.title}</div>
          {job.urgent&&<Badge color={T.red}>{tr("job_urgent_badge")}</Badge>}
          {job.second_job&&<Badge color={T.blue}>💼 2nd job</Badge>}
        </div>
        <div style={{ fontSize:11,color:T.text3 }}>👤 {job.employer||"—"} · 📂 {job.category||tr("job_diverse_cat")} · {job.type==="full-time"?tr("job_fulltime"):tr("job_parttime")}{job.work_duration?` · ${job.work_duration}`:""}</div>
        <div style={{ display:"flex",gap:4,marginTop:4,flexWrap:"wrap" }}>
          {(job.skills||[]).slice(0,3).map(s=><Badge key={s} color={job.color||T.green}>{s}</Badge>)}
        </div>
      </div>
      <div style={{ textAlign:"right",flexShrink:0 }}>
        <div style={{ fontFamily:"Outfit,sans-serif",fontSize:18,fontWeight:800,color:job.color||T.green }}>{job.salary}</div>
        <div style={{ fontSize:10,color:T.text3 }}>{tr("job_per_day")}</div>
        {job.distance&&<div style={{ fontSize:11,color:T.text3,marginTop:2 }}>📍 {job.distance}{tr("km")}</div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  PAGE: HOME / DASHBOARD
// ══════════════════════════════════════════════════════════════
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
        {/* Header */}
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

        {/* Stats bar */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",background:"#f8fafc",borderBottom:`1px solid ${T.border}` }}>
          {[{v:"2 min",l:t("hiw_stat1_label")},{v:"12",l:t("hiw_stat2_label")},{v:"100%",l:t("hiw_stat3_label")}].map(s=>(
            <div key={s.l} style={{ padding:"12px 8px",textAlign:"center",borderRight:`1px solid ${T.border}` }}>
              <div style={{ fontFamily:"Outfit,sans-serif",fontWeight:800,fontSize:18,color:T.green }}>{s.v}</div>
              <div style={{ fontSize:10,color:T.text3,marginTop:2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Steps */}
        <div style={{ padding:"20px 24px" }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{ display:"flex",gap:14,marginBottom:i<STEPS.length-1?16:0,animation:`fadeIn 0.4s ease ${i*0.08}s both` }}>
              {/* Left: icon + connector */}
              <div style={{ display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0 }}>
                <div style={{ width:46,height:46,borderRadius:14,background:`${step.color}12`,border:`2px solid ${step.color}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,position:"relative" }}>
                  {step.icon}
                  <div style={{ position:"absolute",top:-8,right:-8,background:step.color,color:"#fff",borderRadius:999,minWidth:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,border:"2px solid #fff" }}>{i+1}</div>
                </div>
                {i<STEPS.length-1 && <div style={{ width:2,flex:1,background:`linear-gradient(${step.color}44,${STEPS[i+1].color}22)`,marginTop:6,minHeight:14 }}/>}
              </div>
              {/* Right: content */}
              <div style={{ flex:1,paddingTop:4,paddingBottom:i<STEPS.length-1?0:0 }}>
                <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:3 }}>
                  <span style={{ fontWeight:700,fontSize:14,color:T.text }}>{step.title}</span>
                  <span style={{ background:`${step.color}15`,color:step.color,border:`1px solid ${step.color}33`,borderRadius:999,padding:"1px 7px",fontSize:9,fontWeight:800,letterSpacing:"0.06em" }}>{step.tag}</span>
                </div>
                <p style={{ fontSize:12,color:T.text3,margin:0,lineHeight:1.5 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Benefits */}
        <div style={{ margin:"0 24px 20px",background:`linear-gradient(135deg,${T.green}08,${T.blue}08)`,border:`1.5px solid ${T.green}22`,borderRadius:14,padding:"14px 16px" }}>
          <div style={{ fontWeight:700,fontSize:12,color:T.text,marginBottom:10 }}>{t("hiw_why_title")}</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:7 }}>
            {[t("hiw_benefit_1"),t("hiw_benefit_2"),t("hiw_benefit_3"),t("hiw_benefit_4"),t("hiw_benefit_5"),t("hiw_benefit_6")].map(b=>(
              <div key={b} style={{ fontSize:12,color:T.text2,display:"flex",alignItems:"center",gap:6 }}>{b}</div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding:"0 24px 24px",display:"flex",gap:9 }}>
          <button onClick={onClose} style={{ flex:1,padding:"12px",borderRadius:12,border:"none",cursor:"pointer",background:`linear-gradient(135deg,${T.green},${T.greenDark})`,color:"#fff",fontWeight:700,fontSize:14,fontFamily:"DM Sans,sans-serif",boxShadow:`0 4px 16px ${T.green}44` }}>
            {t("hiw_cta")}
          </button>
        </div>
      </div>
    </div>
  );
}

function PageHome({ gs, update, navigate }) {
  const { t } = useTranslation("t");
  const allJobs = gs.jobs || [];
  const promotedJobs = allJobs.filter(j => j.promoted);
  const recentJobs = allJobs.slice(0, 6);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showFuelCalc, setShowFuelCalc] = useState(false);
  const [showTransport, setShowTransport] = useState(false);
  
  // Push notifications hook
  const { isSupported, isSubscribed, permission, loading: notifLoading, subscribe, unsubscribe } = usePushNotifications();

  const getCatCount = (cat) => allJobs.filter(j => {
    const jc = (j.category||"").toLowerCase();
    return jc === cat.key || jc === cat.label.toLowerCase() || cat.label.toLowerCase().includes(jc) || jc.includes(cat.key);
  }).length;
  
  // Handle notification toggle
  const handleNotificationToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
      {showHowItWorks && <HowItWorksModal onClose={()=>setShowHowItWorks(false)}/>}
      {showFuelCalc && <FuelCalculatorModal from="" to="" onClose={()=>setShowFuelCalc(false)}/>}
      {showTransport && <TransportSchedule from="" to="" onClose={()=>setShowTransport(false)}/>}

      {/* Compact hero */}
      <div className="jc-hero" style={{ background:`linear-gradient(135deg,${T.dark} 0%,${T.dark2} 60%,#0d3d26 100%)`, borderRadius:18, padding:"22px 26px", marginBottom:24, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute",top:-40,right:-40,width:180,height:180,borderRadius:"50%",background:"rgba(5,150,105,0.08)" }}/>
        <div style={{ position:"relative",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}>
          <div>
            <div style={{ fontSize:12,color:"#64748b",marginBottom:4 }}>{new Date().toLocaleDateString("ro",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</div>
            <h1 className="jc-hero-title" style={{ fontFamily:"Outfit,sans-serif",fontSize:24,fontWeight:800,color:"#f1f5f9",margin:"0 0 6px" }}>{t("home_greeting")}, {gs.user.name.split(" ")[0]}! 👋</h1>
            <p style={{ color:"#94a3b8",fontSize:13,margin:0 }}>
              {allJobs.length > 0 ? <><strong style={{color:T.greenLight}}>{allJobs.length} {t("jobs_ads_label")}</strong> {t("home_jobs_available")}</> : t("home_no_jobs_hero")}
            </p>
          </div>
          <div className="jc-hero-btns" style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            <Btn onClick={()=>navigate("map")} color={T.green} size="sm">{t("home_on_map_btn")}</Btn>
            <Btn onClick={()=>{ update({jobsCategory:""}); navigate("jobs"); }} color={T.blue} size="sm">{t("home_search_btn")}</Btn>
            {!gs.user.verified && <Btn onClick={()=>navigate("verify")} variant="outline" size="sm" style={{borderColor:"#334155",color:"#94a3b8",background:"transparent"}}>{t("home_verify_btn")}</Btn>}
            {/* How it works button */}
            <button
              onClick={()=>setShowHowItWorks(true)}
              style={{ padding:"7px 13px",borderRadius:10,border:"1.5px solid rgba(52,211,153,0.35)",background:"rgba(52,211,153,0.08)",color:T.greenLight,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"DM Sans,sans-serif",animation:"ringPulse 2.4s ease-in-out infinite",transition:"all 0.2s" }}
              onMouseEnter={e=>{ e.currentTarget.style.background="rgba(52,211,153,0.18)"; e.currentTarget.style.borderColor=T.greenLight; e.currentTarget.style.animation="none"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="rgba(52,211,153,0.08)"; e.currentTarget.style.borderColor="rgba(52,211,153,0.35)"; e.currentTarget.style.animation="ringPulse 2.4s ease-in-out infinite"; }}
            >
              <span style={{ fontSize:15 }}>💡</span> {t("home_hiw_btn")}
            </button>
          </div>
        </div>
      </div>

      {/* ══════ QUICK ACTIONS — Program Transport & Calculator Rută ══════ */}
      <div className="jc-quick-actions" style={{ marginBottom:28 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14 }}>
          <h2 style={{ fontFamily:"Outfit,sans-serif",fontSize:18,fontWeight:800,color:T.text,margin:0 }}>🚀 Acțiuni rapide</h2>
          <div style={{ flex:1,height:1,background:T.border }}/>
        </div>
        <div className="jc-quick-btns" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
          {/* Calculator Rută */}
          <button
            data-testid="fuel-calculator-btn"
            onClick={()=>setShowFuelCalc(true)}
            className="jc-action-card"
            style={{
              background:"linear-gradient(135deg,#f59e0b 0%,#d97706 100%)",
              border:"none",borderRadius:16,padding:"20px 18px",cursor:"pointer",
              display:"flex",flexDirection:"column",alignItems:"flex-start",gap:10,
              boxShadow:"0 6px 24px rgba(245,158,11,0.35)",transition:"all 0.25s ease",
              textAlign:"left",position:"relative",overflow:"hidden",minHeight:120,
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px) scale(1.02)";e.currentTarget.style.boxShadow="0 12px 32px rgba(245,158,11,0.45)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0) scale(1)";e.currentTarget.style.boxShadow="0 6px 24px rgba(245,158,11,0.35)";}}
          >
            <div style={{position:"absolute",top:-20,right:-20,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,0.12)"}}/>
            <div style={{position:"absolute",bottom:-30,left:-10,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.08)"}}/>
            <div style={{fontSize:36,marginBottom:4,position:"relative"}}>⛽</div>
            <div style={{position:"relative"}}>
              <div style={{fontFamily:"Outfit,sans-serif",fontSize:17,fontWeight:800,color:"#fff",marginBottom:4}}>Calculator Rută</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.85)",lineHeight:1.4}}>Distanță, cost carburant și comparație transport</div>
            </div>
          </button>

          {/* Program Transport */}
          <button
            data-testid="transport-schedule-btn"
            onClick={()=>setShowTransport(true)}
            className="jc-action-card"
            style={{
              background:"linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)",
              border:"none",borderRadius:16,padding:"20px 18px",cursor:"pointer",
              display:"flex",flexDirection:"column",alignItems:"flex-start",gap:10,
              boxShadow:"0 6px 24px rgba(37,99,235,0.35)",transition:"all 0.25s ease",
              textAlign:"left",position:"relative",overflow:"hidden",minHeight:120,
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px) scale(1.02)";e.currentTarget.style.boxShadow="0 12px 32px rgba(37,99,235,0.45)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0) scale(1)";e.currentTarget.style.boxShadow="0 6px 24px rgba(37,99,235,0.35)";}}
          >
            <div style={{position:"absolute",top:-20,right:-20,width:100,height:100,borderRadius:"50%",background:"rgba(255,255,255,0.12)"}}/>
            <div style={{position:"absolute",bottom:-30,left:-10,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.08)"}}/>
            <div style={{fontSize:36,marginBottom:4,position:"relative"}}>🚇</div>
            <div style={{position:"relative"}}>
              <div style={{fontFamily:"Outfit,sans-serif",fontSize:17,fontWeight:800,color:"#fff",marginBottom:4}}>Program Transport</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.85)",lineHeight:1.4}}>Orare autobuze, metrouri și trenuri</div>
            </div>
          </button>
        </div>
        
        {/* Push Notifications Toggle */}
        {isSupported && (
          <button
            data-testid="notifications-toggle-btn"
            onClick={handleNotificationToggle}
            disabled={notifLoading}
            className="jc-notification-btn"
            style={{
              marginTop:14,
              width:"100%",
              background: isSubscribed 
                ? "linear-gradient(135deg,#059669 0%,#047857 100%)" 
                : "linear-gradient(135deg,#6366f1 0%,#4f46e5 100%)",
              border:"none",borderRadius:14,padding:"16px 20px",cursor: notifLoading ? "wait" : "pointer",
              display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,
              boxShadow: isSubscribed 
                ? "0 4px 20px rgba(5,150,105,0.3)" 
                : "0 4px 20px rgba(99,102,241,0.3)",
              transition:"all 0.25s ease",
              opacity: notifLoading ? 0.7 : 1,
            }}
            onMouseEnter={e=>{ if(!notifLoading) e.currentTarget.style.transform="translateY(-2px)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; }}
          >
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:28}}>{isSubscribed ? "🔔" : "🔕"}</div>
              <div style={{textAlign:"left"}}>
                <div style={{fontFamily:"Outfit,sans-serif",fontSize:15,fontWeight:700,color:"#fff"}}>
                  {isSubscribed ? "Notificări activate" : "Activează notificările"}
                </div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.8)"}}>
                  {isSubscribed 
                    ? "Vei primi alerte pentru mesaje și aplicări" 
                    : "Fii primul care află de joburi noi"}
                </div>
              </div>
            </div>
            <div style={{
              background:"rgba(255,255,255,0.2)",
              borderRadius:8,padding:"8px 14px",
              fontSize:12,fontWeight:700,color:"#fff",
            }}>
              {notifLoading ? "..." : isSubscribed ? "ON" : "OFF"}
            </div>
          </button>
        )}
      </div>

      {/* CATEGORY GRID — main feature */}
      <div style={{ marginBottom:28 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
          <div>
            <h2 style={{ fontFamily:"Outfit,sans-serif",fontSize:20,fontWeight:800,color:T.text,margin:"0 0 2px" }}>{t("home_categories_title")}</h2>
            <p style={{ fontSize:12,color:T.text3,margin:0 }}>{t("home_categories_subtitle")}</p>
          </div>
          <Btn variant="ghost" size="sm" onClick={()=>navigate("jobs")}>{t("home_see_all_arrow")}</Btn>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:10 }}>
          {CATEGORIES.map(cat => {
            const cnt = getCatCount(cat);
            const label = t(`cat_${cat.key}`, { defaultValue: cat.label });
            return (
              <div key={cat.key}
                onClick={()=>{ update({jobsCategory:cat.key}); navigate("jobs"); }}
                style={{ background:T.white,borderRadius:14,border:`1.5px solid ${T.border}`,padding:"14px 16px",cursor:"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",gap:12,position:"relative",overflow:"hidden" }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor=cat.color+"88"; e.currentTarget.style.background=cat.color+"08"; e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 6px 20px ${cat.color}22`; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background=T.white; e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}
              >
                <div style={{ width:44,height:44,borderRadius:12,background:`${cat.color}15`,border:`1.5px solid ${cat.color}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>{cat.icon}</div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontWeight:700,fontSize:12,color:T.text,lineHeight:1.3 }}>{label}</div>
                  {cnt > 0 && <div style={{ fontSize:11,color:cat.color,fontWeight:600,marginTop:2 }}>{cnt} {t("jobs_ads_label")}</div>}
                </div>
              </div>
            );
          })}
          <div
            onClick={()=>{ update({jobsCategory:"diverse"}); navigate("jobs"); }}
            style={{ background:"#f8fafc",borderRadius:14,border:`1.5px dashed ${T.border}`,padding:"14px 16px",cursor:"pointer",transition:"all 0.2s",display:"flex",alignItems:"center",gap:12 }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor="#94a3b8"; e.currentTarget.style.background="#f1f5f9"; e.currentTarget.style.transform="translateY(-2px)"; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background="#f8fafc"; e.currentTarget.style.transform=""; }}
          >
            <div style={{ width:44,height:44,borderRadius:12,background:"#e2e8f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>✨</div>
            <div>
              <div style={{ fontWeight:700,fontSize:12,color:T.text,lineHeight:1.3 }}>{t("home_diverse_label")}</div>
              <div style={{ fontSize:11,color:T.text3,marginTop:2 }}>{t("home_diverse_sublabel")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Two columns - responsive */}
      <div className="jc-home-grid" style={{ display:"grid",gridTemplateColumns:"1fr 320px",gap:16 }}>
        <div>
          {promotedJobs.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
                <h3 style={{ fontFamily:"Outfit,sans-serif",fontSize:15,fontWeight:700,color:T.amber,margin:0 }}>{t("home_promoted_section")}</h3>
                <div style={{ flex:1,height:1,background:`${T.amber}44` }}/>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {promotedJobs.slice(0,3).map(job=><JobCardRow key={job.id||job._id} job={job} promoted navigate={navigate} update={update} t={t}/>)}
              </div>
            </div>
          )}
          <div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <h3 style={{ fontFamily:"Outfit,sans-serif",fontSize:15,fontWeight:700,color:T.text,margin:0 }}>{t("home_recent_section")}</h3>
              <Btn variant="ghost" size="sm" onClick={()=>navigate("jobs")}>{t("home_all_ads_arrow")}</Btn>
            </div>
            {recentJobs.length > 0 ? (
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {recentJobs.map(job=><JobCardRow key={job.id||job._id} job={job} navigate={navigate} update={update} t={t}/>)}
              </div>
            ) : (
              <Card style={{ padding:"32px",textAlign:"center" }}>
                <div style={{ fontSize:40,marginBottom:10 }}>📋</div>
                <div style={{ fontSize:14,fontWeight:600,color:T.text,marginBottom:8 }}>{t("home_no_ads")}</div>
                <div style={{ fontSize:12,color:T.text3,marginBottom:16 }}>{t("home_no_ads_sub")}</div>
                {gs.user.role === "employer" && <Btn onClick={()=>navigate("post_job")} color={T.green}>{t("home_post_ad_btn")}</Btn>}
              </Card>
            )}
          </div>
        </div>

        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <Card style={{ padding:"16px 18px" }}>
            <h3 style={{ fontFamily:"Outfit,sans-serif",fontSize:15,fontWeight:700,color:T.text,margin:"0 0 12px" }}>{t("home_stats_title")}</h3>
            {[
              { icon:"📋", label:t("home_stats_active"),   value:allJobs.length,                        color:T.green  },
              { icon:"🔥", label:t("home_stats_urgent"),   value:allJobs.filter(j=>j.urgent).length,    color:T.red    },
              { icon:"⭐", label:t("home_stats_promoted"), value:promotedJobs.length,                   color:T.amber  },
              { icon:"📂", label:t("home_stats_cats"),     value:new Set(allJobs.map(j=>j.category||t("home_diverse_label")).filter(Boolean)).size, color:T.blue },
            ].map(s=>(
              <div key={s.label} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${T.border}` }}>
                <span style={{ fontSize:12,color:T.text2 }}>{s.icon} {s.label}</span>
                <span style={{ fontWeight:800,color:s.color,fontSize:15,fontFamily:"Outfit,sans-serif" }}>{s.value||"—"}</span>
              </div>
            ))}
          </Card>
          <Card style={{ padding:"16px 18px" }}>
            <h3 style={{ fontFamily:"Outfit,sans-serif",fontSize:15,fontWeight:700,color:T.text,margin:"0 0 14px" }}>{t("home_activity_title")}</h3>
            {[
              { icon:"💬", text:t("home_activity_1"), time:"2 min", color:T.green },
              { icon:"👁️", text:t("home_activity_2"), time:"1h",    color:T.blue },
              { icon:"🎯", text:t("home_activity_3"), time:"2h",    color:T.purple },
            ].map((a,i)=>(
              <div key={i} style={{ display:"flex",gap:10,padding:"8px 0",borderBottom:i<2?`1px solid ${T.border}`:"none" }}>
                <div style={{ width:30,height:30,borderRadius:8,background:`${a.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0 }}>{a.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12,color:T.text,fontWeight:500 }}>{a.text}</div>
                  <div style={{ fontSize:10,color:T.text3,marginTop:2 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </Card>
          <Card style={{ padding:"16px 18px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
              <h3 style={{ fontFamily:"Outfit,sans-serif",fontSize:15,fontWeight:700,color:T.text,margin:0 }}>{t("home_profile_card")}</h3>
              <span style={{ fontFamily:"Outfit,sans-serif",fontSize:18,fontWeight:800,color:T.green }}>78%</span>
            </div>
            <div style={{ height:6,borderRadius:999,background:T.border,marginBottom:12,overflow:"hidden" }}>
              <div style={{ height:"100%",borderRadius:999,background:`linear-gradient(90deg,${T.green},${T.greenLight})`,width:"78%",transition:"width 1s ease" }}/>
            </div>
            {[
              { label:t("home_profile_basic"),    done:true },
              { label:t("home_profile_identity"), done:gs.user.verified },
              { label:t("home_profile_reviews_label"), done:false },
            ].map(item=>(
              <div key={item.label} style={{ display:"flex",alignItems:"center",gap:8,padding:"4px 0" }}>
                <div style={{ width:16,height:16,borderRadius:"50%",background:item.done?T.green:T.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",flexShrink:0 }}>{item.done?"✓":""}</div>
                <span style={{ fontSize:12,color:item.done?T.text:T.text3 }}>{item.label}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
//  PAGE: JOBS BROWSER
// ══════════════════════════════════════════════════════════════
function PageJobs({ gs, update, navigate }) {
  const { t } = useTranslation("t");
  const [category, setCategory]         = useState(gs.jobsCategory || "Toate");
  const [subcategory, setSubcategory]   = useState("");
  const [urgent, setUrgent]             = useState(false);
  const [workDuration, setWorkDuration] = useState("");
  const [secondJob, setSecondJob]       = useState(false);
  const [sortBy, setSortBy]             = useState("recent");
  const [searchText, setSearchText]     = useState("");

  const allJobs = gs.jobs || [];
  const selectedCatObj = CATEGORIES.find(c => c.key === category);

  const jobMatchesCat = (job, catKey) => {
    if (catKey === "Toate") return true;
    if (catKey === "diverse") {
      return !CATEGORIES.some(c => {
        const jc = (job.category||"").toLowerCase();
        return jc === c.key || jc === c.label.toLowerCase() || c.label.toLowerCase().includes(jc) || jc.includes(c.key);
      });
    }
    const cat = CATEGORIES.find(c => c.key === catKey);
    if (!cat) return false;
    const jc = (job.category||"").toLowerCase();
    return jc === catKey || jc === cat.label.toLowerCase() || cat.label.toLowerCase().includes(jc) || jc.includes(catKey);
  };

  const filtered = allJobs.filter(j => {
    if (searchText && !j.title?.toLowerCase().includes(searchText.toLowerCase()) && !(j.description||"").toLowerCase().includes(searchText.toLowerCase())) return false;
    if (!jobMatchesCat(j, category)) return false;
    if (subcategory && !(j.skills||[]).some(s => s.toLowerCase().includes(subcategory.toLowerCase()))) return false;
    if (urgent && !j.urgent) return false;
    if (workDuration === "permanent" && j.type !== "full-time") return false;
    if (workDuration === "ore" && j.work_duration !== "ore") return false;
    if (workDuration === "zile" && j.work_duration !== "zile") return false;
    if (secondJob && !j.second_job) return false;
    return true;
  });

  const sorted = [...filtered].sort((a,b) => {
    if (sortBy === "salary_desc") return b.salary - a.salary;
    if (sortBy === "distance")    return (a.distance||999) - (b.distance||999);
    return (b.promoted?1:0) - (a.promoted?1:0);
  });

  const promotedInView = sorted.filter(j => j.promoted);
  const urgentInView   = sorted.filter(j => !j.promoted && j.urgent);
  const regularInView  = sorted.filter(j => !j.promoted && !j.urgent);

  const diverseJobs = category === "Toate" ? allJobs.filter(j => !CATEGORIES.some(c => {
    const jc = (j.category||"").toLowerCase();
    return jc === c.key || jc === c.label.toLowerCase() || c.label.toLowerCase().includes(jc) || jc.includes(c.key);
  })) : [];

  const FilterToggle = ({active, onClick, children, color=T.green}) => (
    <button onClick={onClick} style={{ padding:"5px 12px",borderRadius:999,border:"none",cursor:"pointer",background:active?color:"#f5f5f4",color:active?"#fff":T.text2,fontSize:11,fontWeight:600,transition:"all 0.15s",whiteSpace:"nowrap" }}>{children}</button>
  );

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap" }}>
          <h1 style={{ fontFamily:"Outfit,sans-serif",fontSize:22,fontWeight:800,color:T.text,margin:0 }}>
            {selectedCatObj ? `${selectedCatObj.icon} ${t(`cat_${selectedCatObj.key}`,{defaultValue:selectedCatObj.label})}` : category==="diverse"?t("jobs_title_diverse"):t("jobs_title_all")}
          </h1>
          <Badge color={T.green}>{sorted.length} {t("jobs_ads_label")}</Badge>
          {gs.user.role === "employer" && (
            <Btn size="sm" color={T.green} onClick={()=>navigate("post_job")} style={{marginLeft:"auto"}}>{t("jobs_post_btn")}</Btn>
          )}
        </div>

        <div style={{ position:"relative",marginBottom:12 }}>
          <div style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:16 }}>🔍</div>
          <input value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder={t("jobs_search_ph")} style={{ width:"100%",height:44,borderRadius:12,border:`1.5px solid ${T.border}`,paddingLeft:40,paddingRight:16,fontSize:14,fontFamily:"DM Sans,sans-serif",outline:"none",boxSizing:"border-box",background:T.white }} onFocus={e=>e.target.style.border=`1.5px solid ${T.green}`} onBlur={e=>e.target.style.border=`1.5px solid ${T.border}`}/>
        </div>

        <div style={{ overflowX:"auto",paddingBottom:4,marginBottom:10 }}>
          <div style={{ display:"flex",gap:6,minWidth:"max-content" }}>
            <FilterToggle active={category==="Toate"} onClick={()=>{ setCategory("Toate"); setSubcategory(""); }}>{t("jobs_all_tab")}</FilterToggle>
            {CATEGORIES.map(cat=>(
              <FilterToggle key={cat.key} active={category===cat.key} onClick={()=>{ setCategory(cat.key); setSubcategory(""); }} color={cat.color}>
                {cat.icon} {t(`cat_${cat.key}`,{defaultValue:cat.label})}
              </FilterToggle>
            ))}
            <FilterToggle active={category==="diverse"} onClick={()=>{ setCategory("diverse"); setSubcategory(""); }} color={T.text3}>{t("jobs_diverse_tab")}</FilterToggle>
          </div>
        </div>

        {selectedCatObj && (
          <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginBottom:10 }}>
            <button onClick={()=>setSubcategory("")} style={{ padding:"3px 10px",borderRadius:999,border:`1px solid ${subcategory===""?selectedCatObj.color:T.border}`,cursor:"pointer",background:subcategory===""?`${selectedCatObj.color}15`:"transparent",color:subcategory===""?selectedCatObj.color:T.text3,fontSize:11,fontWeight:600 }}>{t("jobs_all_tab")}</button>
            {(t(`cat_${selectedCatObj.key}_sub`,{returnObjects:true,defaultValue:selectedCatObj.sub})||selectedCatObj.sub).map(s=>(
              <button key={s} onClick={()=>setSubcategory(subcategory===s?"":s)} style={{ padding:"3px 10px",borderRadius:999,border:`1px solid ${subcategory===s?selectedCatObj.color:T.border}`,cursor:"pointer",background:subcategory===s?`${selectedCatObj.color}15`:"transparent",color:subcategory===s?selectedCatObj.color:T.text3,fontSize:11 }}>{s}</button>
            ))}
          </div>
        )}

        <Card style={{ padding:"10px 14px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
            <span style={{ fontSize:11,fontWeight:700,color:T.text3,textTransform:"uppercase",letterSpacing:"0.06em",whiteSpace:"nowrap" }}>{t("jobs_filters_label")}</span>
            <FilterToggle active={urgent} onClick={()=>setUrgent(!urgent)} color={T.red}>{t("jobs_urgent_filter")}</FilterToggle>
            <FilterToggle active={secondJob} onClick={()=>setSecondJob(!secondJob)} color={T.blue}>{t("jobs_second_filter")}</FilterToggle>
            <div style={{ display:"flex",gap:4 }}>
              {[{k:"",l:t("jobs_any_duration")},{k:"ore",l:t("jobs_hours")},{k:"zile",l:t("jobs_days")},{k:"permanent",l:t("jobs_permanent")}].map(opt=>(
                <button key={opt.k} onClick={()=>setWorkDuration(opt.k)} style={{ padding:"4px 10px",borderRadius:999,border:`1px solid ${workDuration===opt.k?T.green:T.border}`,cursor:"pointer",background:workDuration===opt.k?`${T.green}15`:"transparent",color:workDuration===opt.k?T.green:T.text3,fontSize:11,fontWeight:600 }}>{opt.l}</button>
              ))}
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:6,marginLeft:"auto" }}>
              <span style={{ fontSize:11,color:T.text3 }}>{t("jobs_sort_label")}</span>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ fontSize:11,borderRadius:8,border:`1px solid ${T.border}`,padding:"4px 8px",cursor:"pointer",outline:"none" }}>
                <option value="recent">{t("jobs_sort_recent")}</option>
                <option value="salary_desc">{t("jobs_sort_salary")}</option>
                <option value="distance">{t("jobs_sort_distance")}</option>
              </select>
            </div>
          </div>
        </Card>
      </div>

      {promotedInView.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
            <h3 style={{ fontFamily:"Outfit,sans-serif",fontSize:15,fontWeight:700,color:T.amber,margin:0 }}>{t("jobs_promoted_section")}</h3>
            <div style={{ flex:1,height:1,background:`${T.amber}44` }}/>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {promotedInView.map(job=><JobCardRow key={job.id||job._id} job={job} promoted navigate={navigate} update={update} t={t}/>)}
          </div>
        </div>
      )}

      {urgentInView.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
            <h3 style={{ fontFamily:"Outfit,sans-serif",fontSize:15,fontWeight:700,color:T.red,margin:0 }}>{t("jobs_urgent_section")}</h3>
            <div style={{ flex:1,height:1,background:`${T.red}44` }}/>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {urgentInView.map(job=><JobCardRow key={job.id||job._id} job={job} navigate={navigate} update={update} t={t}/>)}
          </div>
        </div>
      )}

      <div>
        {regularInView.length > 0 ? (
          <>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
              <h3 style={{ fontFamily:"Outfit,sans-serif",fontSize:15,fontWeight:700,color:T.text,margin:0 }}>{t("jobs_regular_section")}</h3>
              <div style={{ flex:1,height:1,background:T.border }}/>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {regularInView.map(job=><JobCardRow key={job.id||job._id} job={job} navigate={navigate} update={update} t={t}/>)}
            </div>
          </>
        ) : sorted.length === 0 && (
          <div style={{ textAlign:"center",padding:"60px 20px",color:T.text3 }}>
            <div style={{ fontSize:48,marginBottom:12 }}>🔍</div>
            <div style={{ fontSize:16,fontWeight:700,color:T.text,marginBottom:8 }}>{t("jobs_no_results_title")}</div>
            <div style={{ fontSize:13 }}>{t("jobs_no_results_sub")}</div>
            <Btn onClick={()=>{ setCategory("Toate"); setUrgent(false); setWorkDuration(""); setSecondJob(false); setSearchText(""); }} variant="outline" size="sm" style={{marginTop:16}}>{t("jobs_reset_filters")}</Btn>
          </div>
        )}
      </div>

      {category === "Toate" && diverseJobs.length > 0 && (
        <div style={{ marginTop:28 }}>
          <div style={{ background:"linear-gradient(135deg,#f8fafc,#f1f5f9)",borderRadius:16,border:`1.5px dashed ${T.border}`,padding:"16px 20px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
              <div>
                <h3 style={{ fontFamily:"Outfit,sans-serif",fontSize:16,fontWeight:700,color:T.text,margin:"0 0 4px" }}>{t("jobs_diverse_title")}</h3>
                <p style={{ fontSize:12,color:T.text3,margin:0 }}>{t("jobs_diverse_desc")}</p>
              </div>
              <Badge color={T.text3}>{diverseJobs.length} {t("jobs_ads_label")}</Badge>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {diverseJobs.map(job=><JobCardRow key={job.id||job._id} job={job} navigate={navigate} update={update} t={t}/>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  PAGE: MAP
// ══════════════════════════════════════════════════════════════
function PageMap({ gs, update, navigate }) {
  const { t } = useTranslation("t");
  const [selected, setSelected] = useState(gs.selectedJob);
  const [filter, setFilter]     = useState("Toate");
  const [dark, setDark]         = useState(false);
  const cats = ["Toate", ...new Set((gs.jobs||[]).map(j=>j.category))];
  const filtered = filter==="Toate" ? (gs.jobs||[]) : (gs.jobs||[]).filter(j=>j.category===filter);
  const cLat=46.7700, cLng=23.6050;

  const pos = (job) => ({
    left:`${50+(job.lng-cLng)*320}%`,
    top: `${50-(job.lat-cLat)*380}%`,
  });

  const ROUTES=[
    {mode:"🚶",label:t("route_pedestrian"),time:"23 min",dist:"1.8 km",color:T.green},
    {mode:"🚲",label:t("route_bike"),time:"8 min",dist:"1.8 km",color:T.blue},
    {mode:"🚗",label:t("route_car"),time:"5 min",dist:"2.1 km",color:T.amber},
    {mode:"🚌",label:t("route_transit"),time:"18 min",dist:"2.4 km",color:T.purple},
  ];

  useEffect(()=>{ if(gs.selectedJob) setSelected(gs.selectedJob); },[gs.selectedJob]);

  return (
    <div style={{ display:"flex", gap:14, height:"calc(100vh - 130px)", minHeight:520, animation:"fadeIn 0.3s ease" }}>
      {/* Map */}
      <div style={{ flex:1, position:"relative", borderRadius:18, overflow:"hidden", border:`1.5px solid ${T.border}` }}>
        <div style={{
          width:"100%", height:"100%", position:"relative",
          background:dark?"linear-gradient(135deg,#0a0f1a,#0f1f2e,#081a10)":"linear-gradient(160deg,#d4f0d4,#c8e8c8,#b8deb8,#cce8e8)",
        }}>
          <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:dark?0.12:0.18 }}>
            {[15,25,35,45,55,65,75,85].map(p=>(
              <g key={p}>
                <line x1={`${p}%`} y1="0" x2={`${p}%`} y2="100%" stroke={dark?"#4ade80":"#059669"} strokeWidth="0.8"/>
                <line x1="0" y1={`${p}%`} x2="100%" y2={`${p}%`} stroke={dark?"#4ade80":"#059669"} strokeWidth="0.8"/>
              </g>
            ))}
            {[25,50,75].map(p=>(
              <g key={`r${p}`}>
                <line x1={`${p}%`} y1="0" x2={`${p}%`} y2="100%" stroke={dark?"#1e4d3a":"#059669"} strokeWidth="3"/>
                <line x1="0" y1={`${p}%`} x2="100%" y2={`${p}%`} stroke={dark?"#1e4d3a":"#059669"} strokeWidth="3"/>
              </g>
            ))}
          </svg>

          {/* City label */}
          <div style={{ position:"absolute",top:12,left:"50%",transform:"translateX(-50%)",background:dark?"rgba(15,23,42,0.85)":"rgba(255,255,255,0.88)",backdropFilter:"blur(8px)",borderRadius:999,padding:"5px 16px",fontSize:12,fontWeight:700,color:dark?"#94a3b8":T.text2,border:dark?"1px solid #1e293b":`1px solid ${T.border}` }}>
            📍 Cluj-Napoca, România · {filtered.length} joburi
          </div>

          {/* User dot */}
          <div style={{ position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",zIndex:10 }}>
            <div style={{ width:14,height:14,borderRadius:"50%",background:T.blue,border:"3px solid #fff",boxShadow:"0 0 0 8px rgba(59,130,246,0.2)",animation:"userPulse 2s ease-out infinite" }}/>
          </div>

          {/* Pins */}
          {filtered.map(job=>{
            const p=pos(job), sel=selected?.id===job.id;
            return (
              <div key={job.id} onClick={()=>{ setSelected(job); update({selectedJob:job}); }}
                style={{ position:"absolute",...p,transform:"translate(-50%,-100%)",cursor:"pointer",zIndex:sel?20:5,animation:`pinDrop 0.4s cubic-bezier(0.175,0.885,0.32,1.275) ${job.id*0.07}s both` }}>
                <div style={{
                  background:sel?job.color:"#fff",border:`2px solid ${job.color}`,
                  borderRadius:sel?"12px 12px 12px 0":"50%",
                  width:sel?"auto":38,height:sel?"auto":38,
                  padding:sel?"6px 11px":0,
                  display:"flex",alignItems:"center",justifyContent:"center",gap:5,
                  boxShadow:sel?`0 6px 20px ${job.color}66`:"0 2px 10px rgba(0,0,0,0.15)",
                  transition:"all 0.25s cubic-bezier(0.175,0.885,0.32,1.275)",
                  whiteSpace:"nowrap",
                }}>
                  <span style={{fontSize:sel?14:20}}>{job.icon}</span>
                  {sel&&<span style={{fontSize:12,fontWeight:700,color:"#fff",fontFamily:"DM Sans,sans-serif"}}>{job.salary} RON</span>}
                  {job.urgent&&!sel&&<div style={{position:"absolute",top:-4,right:-4,width:11,height:11,borderRadius:"50%",background:T.red,border:"2px solid #fff",animation:"urgentPulse 1s ease-in-out infinite"}}/>}
                </div>
                <div style={{width:0,height:0,margin:"0 auto",borderLeft:"5px solid transparent",borderRight:"5px solid transparent",borderTop:`7px solid ${job.color}`}}/>
              </div>
            );
          })}

          {/* Controls */}
          <div style={{ position:"absolute",bottom:14,right:14,display:"flex",flexDirection:"column",gap:6 }}>
            {[
              {icon:"🗺️",action:()=>setDark(d=>!d)},
              {icon:"📍",action:()=>{}},
            ].map((b,i)=>(
              <button key={i} onClick={b.action} style={{ width:36,height:36,borderRadius:9,background:dark?"rgba(30,41,59,0.9)":"rgba(255,255,255,0.9)",border:dark?"1px solid #334155":`1px solid ${T.border}`,backdropFilter:"blur(8px)",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>{b.icon}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div style={{ width:300,display:"flex",flexDirection:"column",gap:10 }}>
        {/* Filter chips */}
        <Card style={{ padding:"12px 14px" }}>
          <div style={{ fontSize:10,fontWeight:700,color:T.text3,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8 }}>Categorie</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
            {cats.map(c=>(
              <button key={c} onClick={()=>setFilter(c)} style={{ padding:"4px 10px",borderRadius:999,border:"none",cursor:"pointer",background:filter===c?T.green:"#f5f5f4",color:filter===c?"#fff":T.text2,fontSize:11,fontWeight:600,transition:"all 0.15s" }}>{c}</button>
            ))}
          </div>
        </Card>

        {/* Job detail or list */}
        {selected ? (
          <div style={{ flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:10 }}>
            <Card style={{ padding:"16px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                <div style={{ fontSize:34 }}>{selected.icon}</div>
                <div style={{ display:"flex",gap:6 }}>
                  {selected.urgent&&<Badge color={T.red}>🔥 Urgent</Badge>}
                  <Badge color={selected.color}>{selected.type}</Badge>
                </div>
              </div>
              <h3 style={{ fontFamily:"Outfit,sans-serif",fontSize:17,fontWeight:800,color:T.text,margin:"0 0 4px" }}>{selected.title}</h3>
              <div style={{ fontSize:12,color:T.text3,marginBottom:8 }}>👤 {selected.employer}</div>
              <div style={{ fontSize:24,fontWeight:800,color:selected.color,fontFamily:"Outfit,sans-serif",marginBottom:10 }}>{selected.salary} <span style={{fontSize:13,color:T.text3,fontFamily:"DM Sans,sans-serif",fontWeight:400}}>RON/zi</span></div>
              <p style={{ fontSize:12,color:T.text2,lineHeight:1.6,marginBottom:12 }}>{selected.description}</p>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:14 }}>
                {selected.skills.map(s=><Badge key={s} color={selected.color}>{s}</Badge>)}
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14 }}>
                <div style={{ background:"#fafaf9",borderRadius:8,padding:"8px",textAlign:"center" }}><div style={{fontSize:14,fontWeight:700}}>⭐ {selected.rating}</div><div style={{fontSize:10,color:T.text3}}>Rating</div></div>
                <div style={{ background:"#fafaf9",borderRadius:8,padding:"8px",textAlign:"center" }}><div style={{fontSize:14,fontWeight:700,color:T.green}}>📍 {selected.distance}km</div><div style={{fontSize:10,color:T.text3}}>Distanță</div></div>
              </div>

              {/* Routes */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10,fontWeight:700,color:T.text3,textTransform:"uppercase",marginBottom:7 }}>Trasee</div>
                {ROUTES.map(r=>(
                  <div key={r.mode} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 8px",borderRadius:7,marginBottom:4,background:"#fafaf9",border:`1px solid ${T.border}`,cursor:"pointer" }}
                    onMouseEnter={e=>e.currentTarget.style.background="#f0fdf4"}
                    onMouseLeave={e=>e.currentTarget.style.background="#fafaf9"}
                  >
                    <span style={{fontSize:13}}>{r.mode} {r.label}</span>
                    <span style={{fontSize:12,color:r.color,fontWeight:700}}>{r.time} · {r.dist}</span>
                  </div>
                ))}
              </div>

              <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                <Btn onClick={()=>navigate("escrow")} color={selected.color} size="md" style={{width:"100%",justifyContent:"center"}}>🔒 Aplică + Escrow</Btn>
                <Btn onClick={()=>navigate("contract")} variant="outline" size="md" style={{width:"100%",justifyContent:"center"}}>📝 Contract direct</Btn>
                <Btn onClick={()=>navigate("chat")} variant="outline" size="md" style={{width:"100%",justifyContent:"center"}}>💬 Trimite mesaj</Btn>
              </div>
            </Card>
          </div>
        ) : (
          <div style={{ flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8 }}>
            {filtered.map(job=>(
              <div key={job.id} onClick={()=>{ setSelected(job); update({selectedJob:job}); }}
                style={{ background:T.white,borderRadius:12,border:`1.5px solid ${T.border}`,padding:"10px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"all 0.15s" }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor=job.color+"66"; e.currentTarget.style.background="#fafffe"; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor=T.border; e.currentTarget.style.background=T.white; }}
              >
                <div style={{width:38,height:38,borderRadius:10,background:`${job.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{job.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{job.title}</div>
                  <div style={{fontSize:10,color:T.text3}}>📍 {job.distance}km · ⭐ {job.rating}</div>
                </div>
                <div style={{fontSize:14,fontWeight:800,color:job.color,fontFamily:"Outfit,sans-serif",flexShrink:0}}>{job.salary}RON</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
//  PAGE: CHAT
// ══════════════════════════════════════════════════════════════
function PageChat({ gs, update, navigate }) {
  const { t } = useTranslation("t");
  const [convs, setConvs]       = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [input, setInput]       = useState("");
  const [typing, setTyping]     = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim]   = useState("");
  const [recTime, setRecTime]   = useState(0);
  const [voiceLang, setVoiceLang] = useState("ro-RO");
  const [modal, setModal]       = useState(null); // "whatsapp" | "video" | "report" | "block_confirm"
  const [reportMsg, setReportMsg] = useState(null); // mesajul raportat (sau null pt user)
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportStatus, setReportStatus] = useState(""); // mesaj feedback
  const recRef = useRef(null);
  const timerRef = useRef(null);
  const bottomRef = useRef(null);

  const [isDemo, setIsDemo] = useState(false);
  const active = convs.find(c=>c.id===activeId);
  const fmt = s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  // Date demo pentru cand nu exista conversatii reale
  const DEMO_CONVS = [
    { id:"demo1", user1_id:"me", user2_id:"other1", user2_name:"SC CleanPro SRL", user2_initials:"CP", job_title:"Curățare piscinã", last_msg:"Ești disponibil mâine?", unread:2 },
    { id:"demo2", user1_id:"me", user2_id:"other2", user2_name:"Maria Constantin", user2_initials:"MC", job_title:"Plimbare câini", last_msg:"Câinii sunt doi labradors 🐕", unread:0 },
    { id:"demo3", user1_id:"me", user2_id:"other3", user2_name:"Andrei Electricul", user2_initials:"AE", job_title:"Reparații electrice", last_msg:"Pot începe luni.", unread:1 },
  ];
  const DEMO_MESSAGES = {
    demo1:[
      {id:1,sender_id:"other1",sender_initials:"CP",text:"Bună ziua! Am văzut că ai aplicat pentru curățare piscinã.",created_at:new Date().toISOString()},
      {id:2,sender_id:"me",sender_initials:"AI",text:"Da! Sunt interesat. Am 3 ani experiență.",created_at:new Date().toISOString()},
      {id:3,sender_id:"other1",sender_initials:"CP",text:"Excelent! Ce program preferi?",created_at:new Date().toISOString()},
      {id:4,sender_id:"me",sender_initials:"AI",text:"Prefer dimineața, 8-12.",created_at:new Date().toISOString()},
      {id:5,sender_id:"other1",sender_initials:"CP",text:"Ești disponibil mâine?",created_at:new Date().toISOString()},
    ],
    demo2:[
      {id:1,sender_id:"other2",sender_initials:"MC",text:"Salut! Ai experiență cu câini mari?",created_at:new Date().toISOString()},
      {id:2,sender_id:"me",sender_initials:"AI",text:"Da, am crescut cu câini mari!",created_at:new Date().toISOString()},
      {id:3,sender_id:"other2",sender_initials:"MC",text:"Câinii mei sunt doi labradors 🐕",created_at:new Date().toISOString()},
    ],
    demo3:[
      {id:1,sender_id:"me",sender_initials:"AI",text:"Bună ziua! Ai autorizație ANRE?",created_at:new Date().toISOString()},
      {id:2,sender_id:"other3",sender_initials:"AE",text:"Da, 5 ani experiență. Am autorizație.",created_at:new Date().toISOString()},
      {id:3,sender_id:"other3",sender_initials:"AE",text:"Pot începe luni, am toate sculele.",created_at:new Date().toISOString()},
    ],
  };

  // Incarca conversatii din API
  useEffect(()=>{
    api.get("/messages/conversations").then(r=>{
      if(r.data && r.data.length>0){
        setConvs(r.data);
        setActiveId(r.data[0].id);
        setIsDemo(false);
      } else {
        // Fallback demo cand nu exista conversatii reale
        setConvs(DEMO_CONVS);
        setActiveId("demo1");
        setMessages(DEMO_MESSAGES["demo1"]);
        setIsDemo(true);
      }
    }).catch(()=>{
      setConvs(DEMO_CONVS);
      setActiveId("demo1");
      setMessages(DEMO_MESSAGES["demo1"]);
      setIsDemo(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Incarca mesajele conversatiei active
  useEffect(()=>{
    if(!activeId) return;
    if(isDemo){
      setMessages(DEMO_MESSAGES[activeId]||[]);
      setConvs(p=>p.map(c=>c.id===activeId?{...c,unread:0}:c));
      return;
    }
    api.get(`/messages/conversations/${activeId}`).then(r=>setMessages(r.data)).catch(()=>{});
    setConvs(p=>p.map(c=>c.id===activeId?{...c,unread:0}:c));
    const socket = getSocket();
    if(socket) socket.emit("join_conversation", activeId);
  },[activeId]);

  // Asculta mesaje noi via socket
  useEffect(()=>{
    const socket = getSocket();
    if(!socket) return;
    const onMsg = (msg) => {
      if(String(msg.conversation_id) === String(activeId)) {
        setMessages(p=>[...p, msg]);
      }
      setConvs(p=>p.map(c=>String(c.id)===String(msg.conversation_id)?{...c,last_msg:msg.text,last_time:msg.created_at}:c));
    };
    const onTyping = ({conversation_id, is_typing}) => {
      if(String(conversation_id)===String(activeId)) setTyping(is_typing);
    };
    socket.on("new_message", onMsg);
    socket.on("typing", onTyping);
    return()=>{ socket.off("new_message", onMsg); socket.off("typing", onTyping); };
  },[activeId]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages,typing]);
  useEffect(()=>{
    if(isListening){ setRecTime(0); timerRef.current=setInterval(()=>setRecTime(t=>t+1),1000); }
    else clearInterval(timerRef.current);
    return()=>clearInterval(timerRef.current);
  },[isListening]);

  const startVoice = ()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR) return;
    const r=new SR(); r.lang=voiceLang; r.interimResults=true; r.continuous=true;
    r.onstart=()=>setIsListening(true);
    r.onresult=(e)=>{
      let fin="",int="";
      for(let i=e.resultIndex;i<e.results.length;i++){
        if(e.results[i].isFinal) fin+=e.results[i][0].transcript+" ";
        else int+=e.results[i][0].transcript;
      }
      if(fin) setInput(p=>(p+" "+fin).trim());
      setInterim(int.trim());
    };
    r.onend=()=>{ setIsListening(false); setInterim(""); };
    recRef.current=r; r.start();
  };
  const stopVoice = ()=>{ recRef.current?.stop(); setIsListening(false); setInterim(""); };

  const send = ()=>{
    const base=input.trim(), extra=interim.trim();
    const txt=base&&extra&&!base.endsWith(extra)?`${base} ${extra}`.trim():(base||extra);
    if(!txt||!activeId) return;
    if(isListening) stopVoice();
    setInput(""); setInterim("");

    if(isDemo){
      // Mod demo: adauga mesajul local si simuleaza raspuns
      const myMsg={id:Date.now(),sender_id:"me",sender_initials:gs.user?.initials||"EU",text:txt,created_at:new Date().toISOString()};
      setMessages(p=>[...p, myMsg]);
      setConvs(p=>p.map(c=>c.id===activeId?{...c,last_msg:txt}:c));
      setTyping(true);
      setTimeout(()=>{
        setTyping(false);
        const rep=["Mulțumesc! Revin curând.","Perfect, vorbim mâine!","Înțeles, te sun.","Excelent!"][Math.floor(Math.random()*4)];
        const repMsg={id:Date.now()+1,sender_id:"other",sender_initials:"??",text:rep,created_at:new Date().toISOString()};
        setMessages(p=>[...p, repMsg]);
      },1000+Math.random()*800);
      return;
    }

    const socket = getSocket();
    if(socket) {
      socket.emit("send_message", { conversation_id: activeId, text: txt });
    } else {
      api.post(`/messages/conversations/${activeId}/send`, { text: txt })
        .then(r=>setMessages(p=>[...p, r.data]))
        .catch(()=>{});
    }
  };

  const LANGS=[{code:"ro-RO",flag:"🇷🇴",name:"Română"},{code:"en-GB",flag:"🇬🇧",name:"English"},{code:"fr-FR",flag:"🇫🇷",name:"Français"},{code:"de-DE",flag:"🇩🇪",name:"Deutsch"}];

  return (
    <div style={{ display:"flex", gap:0, height:"calc(100vh - 130px)", minHeight:500, borderRadius:18, overflow:"hidden", border:`1.5px solid ${T.border}`, animation:"fadeIn 0.3s ease" }}>

      {/* Call modals */}
      {modal==="whatsapp" && (
        <div style={{ position:"fixed",inset:0,zIndex:999,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
          <div style={{ background:T.white,borderRadius:20,padding:"28px 24px",maxWidth:400,width:"100%" }}>
            <div style={{ textAlign:"center",marginBottom:20 }}>
              <div style={{ fontSize:48,marginBottom:10 }}>💬</div>
              <h3 style={{ fontFamily:"Outfit,sans-serif",fontSize:20,fontWeight:800,color:T.text,margin:"0 0 6px" }}>{t("chat_whatsapp_title")}</h3>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:16 }}>
              {[
                {icon:"📞",label:t("chat_voice_call"),href:`https://wa.me/`},
                {icon:"📹",label:t("chat_video_call_btn"),href:`https://wa.me/`},
                {icon:"💬",label:t("chat_message_btn"),href:`https://wa.me/`},
              ].map(opt=>(
                <a key={opt.label} href={opt.href} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>
                  <Btn color="#25d366" style={{width:"100%",justifyContent:"center"}}>{opt.icon} {opt.label}</Btn>
                </a>
              ))}
            </div>
            <Btn variant="outline" onClick={()=>setModal(null)} style={{width:"100%",justifyContent:"center"}}>✕ Închide</Btn>
          </div>
        </div>
      )}

      {modal==="video" && (
        <div style={{ position:"fixed",inset:0,zIndex:999,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
          <div style={{ background:T.white,borderRadius:20,padding:"28px 24px",maxWidth:420,width:"100%" }}>
            <div style={{ textAlign:"center",marginBottom:20 }}>
              <div style={{ fontSize:48,marginBottom:10 }}>📹</div>
              <h3 style={{ fontFamily:"Outfit,sans-serif",fontSize:20,fontWeight:800,color:T.text,margin:"0 0 6px" }}>{t("chat_video_title")}</h3>
            </div>
            <div style={{ display:"flex",gap:8,marginBottom:16 }}>
              {[{icon:"🎥",label:"Google Meet",color:"#1a73e8",href:"https://meet.google.com/new"},{icon:"📹",label:"Zoom",color:"#2d8cff",href:"https://zoom.us/start/videomeeting"},{icon:"💼",label:"Teams",color:"#6264a7",href:"https://teams.microsoft.com"}].map(p=>(
                <a key={p.label} href={p.href} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none",flex:1}}>
                  <Btn color={p.color} style={{width:"100%",justifyContent:"center",flexDirection:"column",height:72,gap:4}} size="sm">
                    <span style={{fontSize:22}}>{p.icon}</span>{p.label}
                  </Btn>
                </a>
              ))}
            </div>
            <Btn variant="outline" onClick={()=>setModal(null)} style={{width:"100%",justifyContent:"center"}}>✕ Închide</Btn>
          </div>
        </div>
      )}

      {/* Modal raportare */}
      {modal==="report" && (
        <div style={{ position:"fixed",inset:0,zIndex:999,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
          <div style={{ background:T.white,borderRadius:20,padding:"28px 24px",maxWidth:440,width:"100%",animation:"slideUpModal 0.3s ease" }}>
            {reportStatus ? (
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:52,marginBottom:12 }}>✅</div>
                <h3 style={{ fontFamily:"Outfit,sans-serif",fontSize:18,fontWeight:800,color:T.text,margin:"0 0 8px" }}>{t("chat_report_sent_title")}</h3>
                <p style={{ fontSize:13,color:T.text2,marginBottom:20 }}>{reportStatus}</p>
                <Btn onClick={()=>setModal(null)} color={T.green} style={{width:"100%",justifyContent:"center"}}>Închide</Btn>
              </div>
            ) : (
              <>
                <div style={{ textAlign:"center",marginBottom:20 }}>
                  <div style={{ fontSize:40,marginBottom:8 }}>⚠️</div>
                  <h3 style={{ fontFamily:"Outfit,sans-serif",fontSize:18,fontWeight:800,color:T.text,margin:"0 0 4px" }}>{t("chat_report_modal_title")}</h3>
                  <p style={{ fontSize:12,color:T.text3 }}>
                    {active ? (String(active.user1_id)===String(gs.user?.id)?active.user2_name:active.user1_name) : ""}
                  </p>
                </div>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11,fontWeight:700,color:T.text2,textTransform:"uppercase",marginBottom:8 }}>Motiv</div>
                  <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                    {[
                      {k:"limbaj_ofensiv", l:t("chat_report_offensive")},
                      {k:"rasism",         l:t("chat_report_racism")},
                      {k:"hartuire",       l:t("chat_report_harassment")},
                      {k:"spam",           l:t("chat_report_spam")},
                      {k:"frauda",         l:t("chat_report_fraud")},
                      {k:"altele",         l:t("chat_report_other")},
                    ].map(r=>(
                      <div key={r.k} onClick={()=>setReportReason(r.k)} style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:9,cursor:"pointer",border:reportReason===r.k?`2px solid ${T.red}`:`1.5px solid ${T.border}`,background:reportReason===r.k?"#fef2f2":"#fafaf9",transition:"all 0.15s" }}>
                        <div style={{ width:16,height:16,borderRadius:"50%",border:reportReason===r.k?"none":`2px solid ${T.border}`,background:reportReason===r.k?T.red:"transparent",flexShrink:0 }}/>
                        <span style={{ fontSize:13,color:reportReason===r.k?T.red:T.text2,fontWeight:reportReason===r.k?700:400 }}>{r.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <textarea value={reportDetails} onChange={e=>setReportDetails(e.target.value)} placeholder={t("chat_report_details_ph")} rows={2} style={{ width:"100%",borderRadius:9,border:`1.5px solid ${T.border}`,padding:"8px 12px",fontSize:13,resize:"none",outline:"none",marginBottom:14,boxSizing:"border-box",fontFamily:"DM Sans,sans-serif" }} onFocus={e=>e.target.style.border=`1.5px solid ${T.red}`} onBlur={e=>e.target.style.border=`1.5px solid ${T.border}`}/>
                <div style={{ display:"flex",gap:8,marginBottom:10 }}>
                  <Btn onClick={async()=>{
                    if(!reportReason) return;
                    const otherId = active ? (String(active.user1_id)===String(gs.user?.id)?active.user2_id:active.user1_id) : null;
                    if(!otherId) return;
                    try {
                      const res = await api.post("/reports",{ reported_user_id:otherId, message_id: reportMsg?.id||null, reason:reportReason, details:reportDetails });
                      setReportStatus(res.data.message||t("chat_report_sent_msg"));
                    } catch(e){ setReportStatus(e.response?.data?.error||"Raport trimis."); }
                  }} disabled={!reportReason} color={T.red} style={{flex:1,justifyContent:"center"}}>⚠️ Trimite raport</Btn>
                  <Btn onClick={async()=>{
                    const otherId = active ? (String(active.user1_id)===String(gs.user?.id)?active.user2_id:active.user1_id) : null;
                    if(!otherId) return;
                    try {
                      await api.post(`/reports/block/${otherId}`);
                      setReportStatus("Utilizator blocat. Nu vei mai primi mesaje de la acesta.");
                    } catch(e){ setReportStatus(e.response?.data?.error||"Blocat."); }
                  }} variant="outline" style={{flex:1,justifyContent:"center",borderColor:"#fecaca",color:T.red}}>🚫 Blochează</Btn>
                </div>
                <Btn variant="ghost" onClick={()=>setModal(null)} style={{width:"100%",justifyContent:"center"}}>Anulează</Btn>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div style={{ width:270,background:T.dark,display:"flex",flexDirection:"column",flexShrink:0 }}>
        <div style={{ padding:"14px 12px 10px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
            <h3 style={{ color:"#f1f5f9",fontFamily:"Outfit,sans-serif",fontSize:15,fontWeight:700,margin:0 }}>Mesaje</h3>
            <span style={{ background:T.green,color:"#fff",borderRadius:999,padding:"1px 8px",fontSize:11,fontWeight:700 }}>{convs.reduce((a,c)=>a+c.unread,0)} nou</span>
          </div>
        </div>
        <div style={{ flex:1,overflowY:"auto",padding:"0 8px 8px" }}>
          {convs.map(conv=>{
            const otherName = String(conv.user1_id)===String(gs.user?.id) ? conv.user2_name : conv.user1_name;
            const otherInitials = String(conv.user1_id)===String(gs.user?.id) ? conv.user2_initials : conv.user1_initials;
            const timeStr = conv.last_time ? new Date(conv.last_time).toLocaleTimeString("ro",{hour:"2-digit",minute:"2-digit"}) : "";
            return (
              <div key={conv.id} onClick={()=>setActiveId(conv.id)}
                style={{ display:"flex",alignItems:"center",gap:9,padding:"9px",borderRadius:10,cursor:"pointer",marginBottom:2,background:conv.id===activeId?"#1e293b":"transparent",transition:"background 0.12s" }}
                onMouseEnter={e=>{if(conv.id!==activeId)e.currentTarget.style.background="#172035";}}
                onMouseLeave={e=>{if(conv.id!==activeId)e.currentTarget.style.background="transparent";}}
              >
                <Avatar initials={otherInitials||"??"} color={T.green} size={34}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{color:"#f1f5f9",fontWeight:600,fontSize:12}}>{otherName||"?"}</span>
                    <span style={{color:"#475569",fontSize:10}}>{timeStr}</span>
                  </div>
                  <div style={{fontSize:11,color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:1}}>{conv.last_msg}</div>
                </div>
                {conv.unread>0&&<div style={{background:T.green,color:"#fff",borderRadius:999,minWidth:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700}}>{conv.unread}</div>}
              </div>
            );
          })}
        </div>
        {/* Lang picker */}
        <div style={{ padding:"10px 12px",borderTop:"1px solid #1e293b" }}>
          <div style={{ fontSize:10,color:"#475569",fontWeight:700,textTransform:"uppercase",marginBottom:6 }}>🎙️ Limbă vocală</div>
          <div style={{ display:"flex",gap:4 }}>
            {LANGS.map(l=>(
              <button key={l.code} onClick={()=>setVoiceLang(l.code)} style={{ flex:1,padding:"5px 4px",borderRadius:7,border:"none",cursor:"pointer",background:voiceLang===l.code?T.green:"#1e293b",color:voiceLang===l.code?"#fff":"#64748b",fontSize:14,transition:"all 0.15s" }} title={l.name}>{l.flag}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat main */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",background:T.bg,minWidth:0 }}>
        {!active && (
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:T.text3}}>
            <div style={{fontSize:48}}>💬</div>
            <div style={{fontSize:15,fontWeight:600}}>Nicio conversatie activa</div>
            <div style={{fontSize:13}}>Aplica la un job pentru a incepe o conversatie</div>
          </div>
        )}
        {active && (<>
        {/* Header */}
        <div style={{ padding:"10px 16px",background:T.white,borderBottom:`1.5px solid ${T.border}`,display:"flex",alignItems:"center",gap:12 }}>
          <Avatar initials={active?(String(active.user1_id)===String(gs.user?.id)?active.user2_initials:active.user1_initials):"??"} color={T.green} size={38}/>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:14,color:T.text,fontFamily:"Outfit,sans-serif"}}>{active?(String(active.user1_id)===String(gs.user?.id)?active.user2_name:active.user1_name):"?"}</div>
            <div style={{fontSize:11,color:T.text3}}>📋 {active?.job_title||"Conversatie"}</div>
          </div>
          <div style={{ display:"flex",gap:6 }}>
            <button onClick={()=>setModal("whatsapp")} style={{ width:34,height:34,borderRadius:8,border:"none",cursor:"pointer",fontSize:18,background:"linear-gradient(135deg,#25d366,#128c7e)",display:"flex",alignItems:"center",justifyContent:"center" }}>💬</button>
            <button onClick={()=>setModal("video")} style={{ width:34,height:34,borderRadius:8,border:"none",cursor:"pointer",fontSize:18,background:`linear-gradient(135deg,${T.blue},${T.blueDark})`,display:"flex",alignItems:"center",justifyContent:"center" }}>📹</button>
            <button onClick={()=>{ setReportMsg(null); setReportReason(""); setReportDetails(""); setReportStatus(""); setModal("report"); }} title={t("chat_report_modal_title")} style={{ width:34,height:34,borderRadius:8,border:"none",cursor:"pointer",fontSize:16,background:"#fef2f2",border:"1px solid #fecaca",display:"flex",alignItems:"center",justifyContent:"center" }}>⚠️</button>
          </div>
        </div>

        {/* Banner demo */}
        {isDemo && (
          <div style={{ margin:"6px 12px 0",background:"#fef3c7",borderRadius:8,padding:"5px 12px",display:"flex",alignItems:"center",gap:8,border:"1px solid #fde68a",fontSize:11,color:"#92400e" }}>
            <span>⚡</span>
            <span><strong>Mod demonstratie</strong> — Aplică la un job pentru a porni o conversație reală.</span>
          </div>
        )}

        {/* Match banner */}
        <div style={{ margin:"8px 12px 0",background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",borderRadius:10,padding:"7px 14px",display:"flex",alignItems:"center",gap:8,border:"1px solid #bbf7d0" }}>
          <span style={{fontSize:16}}>🎯</span>
          <span style={{fontSize:12,fontWeight:700,color:"#065f46"}}>Match Score: 92%</span>
          <span style={{fontSize:11,color:"#057a55"}}>{t("chat_status_zone")}</span>
          <Btn size="sm" color={T.green} style={{marginLeft:"auto"}} onClick={()=>navigate("map")}>Profil</Btn>
        </div>

        {/* Messages */}
        <div style={{ flex:1,overflowY:"auto",padding:"10px 12px 6px",display:"flex",flexDirection:"column",gap:5 }}>
          {messages.map((msg)=>{
            const isMe = isDemo ? msg.sender_id==="me" : String(msg.sender_id)===String(gs.user?.id);
            const timeStr=msg.created_at?new Date(msg.created_at).toLocaleTimeString("ro",{hour:"2-digit",minute:"2-digit"}):"";
            return (
              <div key={msg.id} style={{ display:"flex",flexDirection:isMe?"row-reverse":"row",alignItems:"flex-end",gap:6,animation:"fadeIn 0.2s ease" }}>
                {!isMe&&<Avatar initials={msg.sender_initials||"??"} color={T.green} size={24}/>}
                <div style={{ maxWidth:"65%" }}>
                  <div style={{ background:isMe?`linear-gradient(135deg,${T.green},${T.greenDark})`:T.white,color:isMe?"#fff":T.text,borderRadius:isMe?"16px 16px 4px 16px":"16px 16px 16px 4px",padding:"8px 12px",fontSize:13,lineHeight:1.5,boxShadow:isMe?`0 2px 8px ${T.green}33`:"0 1px 4px rgba(0,0,0,0.06)",border:isMe?"none":`1.5px solid ${T.border}` }}>{msg.text}</div>
                  <div style={{ fontSize:10,marginTop:2,textAlign:isMe?"right":"left",color:T.text3,paddingLeft:isMe?0:4,paddingRight:isMe?4:0 }}>
                    {timeStr}{isMe&&<span style={{color:T.green}}> ✓✓</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {typing&&(
            <div style={{display:"flex",alignItems:"flex-end",gap:6}}>
              <Avatar initials={active?(String(active.user1_id)===String(gs.user?.id)?active.user2_initials:active.user1_initials):"??"} color={T.green} size={24}/>
              <div style={{background:T.white,border:`1.5px solid ${T.border}`,borderRadius:"16px 16px 16px 4px",padding:"10px 14px"}}>
                <div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:T.text3,animation:`bounce 1.2s ease-in-out ${i*0.2}s infinite`}}/>)}</div>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div style={{ padding:"8px 12px 12px",background:T.white,borderTop:`1.5px solid ${T.border}` }}>
          {interim&&<div style={{ marginBottom:7,padding:"6px 12px",borderRadius:8,background:"#f0fdf4",border:"1px solid #86efac",fontSize:12,color:"#166534",fontStyle:"italic" }}>🎙️ "{interim}"</div>}
          {isListening&&(
            <div style={{ marginBottom:8,background:T.dark2,borderRadius:12,padding:"8px 12px",display:"flex",alignItems:"center",gap:10,border:`1px solid ${T.dark3}` }}>
              <div style={{ width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#ef4444,#dc2626)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,animation:"micGlow 1.5s ease-in-out infinite" }}>🎙️</div>
              <div style={{ display:"flex",alignItems:"center",gap:2,flex:1 }}>
                {Array.from({length:20}).map((_,i)=><div key={i} style={{width:3,borderRadius:999,background:"#fff",height:`${10+Math.sin(i*0.9)*6}px`,animation:`wave ${0.7+(i%4)*0.15}s ease-in-out ${i*0.04}s infinite alternate`}}/>)}
              </div>
              <div style={{ fontFamily:"monospace",fontSize:12,color:"#ef4444",fontWeight:700 }}>⏺ {fmt(recTime)}</div>
              <button onClick={stopVoice} style={{ background:"#ef4444",color:"#fff",border:"none",borderRadius:6,padding:"4px 8px",fontSize:11,fontWeight:700,cursor:"pointer" }}>■</button>
            </div>
          )}
          <div style={{ display:"flex",alignItems:"flex-end",gap:6 }}>
            <div style={{ flex:1,background:"#f5f5f4",borderRadius:12,border:isListening?`1.5px solid #ef4444`:`1.5px solid ${T.border}`,padding:"8px 12px",transition:"border 0.2s" }}>
              <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder={isListening?t("chat_speaking"):t("chat_placeholder")} rows={1} style={{ width:"100%",background:"transparent",border:"none",outline:"none",fontSize:13,fontFamily:"DM Sans,sans-serif",color:T.text,resize:"none",lineHeight:1.5,maxHeight:72 }}/>
            </div>
            <button onClick={isListening?stopVoice:startVoice} style={{ width:38,height:38,borderRadius:10,border:"none",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",background:isListening?"linear-gradient(135deg,#ef4444,#dc2626)":`linear-gradient(135deg,${T.dark},${T.dark3})`,boxShadow:isListening?"0 0 0 3px rgba(239,68,68,0.3)":"none",transition:"all 0.2s" }}>{isListening?"⏹":"🎤"}</button>
            <button onClick={send} disabled={!input.trim()&&!interim.trim()} style={{ width:38,height:38,borderRadius:10,border:"none",cursor:(input.trim()||interim.trim())?"pointer":"not-allowed",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",background:(input.trim()||interim.trim())?`linear-gradient(135deg,${T.green},${T.greenDark})`:"#e7e5e4",boxShadow:(input.trim()||interim.trim())?`0 4px 12px ${T.green}44`:"none",transition:"all 0.2s" }}>➤</button>
          </div>
        </div>
        </>)}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
//  PAGE: ESCROW
// ══════════════════════════════════════════════════════════════
function PageEscrow({ gs, update, navigate }) {
  const { t } = useTranslation("t");
  const job = gs.selectedJob || (gs.jobs||[])[0];
  const [step, setStep]     = useState(0);
  const [method, setMethod] = useState("card");
  const [card, setCard]     = useState({num:"",exp:"",cvv:""});
  const [loading, setLoading] = useState(false);
  const [timer, setTimer]   = useState(0);
  const [disputed, setDisputed] = useState(false);
  const [paymentId, setPaymentId] = useState(null);
  const [apiMsg, setApiMsg] = useState("");
  const fee=job?Math.round(job.salary*0.05):0;
  const total=job?(job.salary+fee):0;
  const fmt=s=>`${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  useEffect(()=>{if(step===2){const iv=setInterval(()=>setTimer(tc=>tc+1),1000);return()=>clearInterval(iv);}},[step]);
  if(!job) return (
    <div style={{textAlign:"center",padding:"60px 24px",color:T.text2}}>
      <div style={{fontSize:52,marginBottom:14}}>🔒</div>
      <div style={{fontFamily:"Outfit,sans-serif",fontSize:18,fontWeight:700,color:T.text,marginBottom:8}}>{t("nav_escrow")}</div>
      <div style={{fontSize:14,marginBottom:24,color:T.text2}}>{t("jobs_no_results_sub","Selectează un job pentru a folosi Escrow.")}</div>
      <Btn onClick={()=>navigate("jobs")} color={T.green} style={{margin:"0 auto"}}>🗂️ {t("nav_jobs")}</Btn>
    </div>
  );

  const fmtCard=v=>v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim();
  const fmtExp=v=>{const c=v.replace(/\D/g,"").slice(0,4);return c.length>2?c.slice(0,2)+"/"+c.slice(2):c;};

  const steps=["Configurare","Plată","Task activ","Finalizat"];

  return (
    <div style={{ maxWidth:520, margin:"0 auto", animation:"fadeIn 0.3s ease" }}>
      {/* Stepper */}
      <div style={{ display:"flex",alignItems:"center",marginBottom:28,padding:"0 4px" }}>
        {steps.map((s,i)=>(
          <div key={s} style={{display:"flex",alignItems:"center",flex:i<steps.length-1?1:"none"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:step>i?T.green:step===i?T.white:"#f5f5f4",border:step===i?`2px solid ${T.green}`:step>i?"none":`2px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:step>i?"#fff":step===i?T.green:T.text3,boxShadow:step===i?`0 0 0 4px ${T.green}22`:"none",transition:"all 0.3s"}}>{step>i?"✓":i+1}</div>
              <span style={{fontSize:9,color:step>=i?T.green:T.text3,fontWeight:600,whiteSpace:"nowrap"}}>{s}</span>
            </div>
            {i<steps.length-1&&<div style={{flex:1,height:2,margin:"0 4px",marginBottom:14,background:step>i?T.green:T.border,transition:"background 0.3s"}}/>}
          </div>
        ))}
      </div>

      {step===0&&(
        <Card style={{padding:"24px"}}>
          <div style={{textAlign:"center",marginBottom:22}}>
            <div style={{fontSize:48,marginBottom:10}}>🔒</div>
            <h3 style={{fontFamily:"Outfit,sans-serif",fontSize:22,fontWeight:800,color:T.text,margin:"0 0 6px"}}>Plată Escrow</h3>
            <p style={{fontSize:13,color:T.text2,lineHeight:1.7}}>Banii sunt <strong>blocați în siguranță</strong> și eliberați doar după confirmarea taskului.</p>
          </div>
          <div style={{background:"#f0fdf4",borderRadius:14,padding:"14px 16px",marginBottom:18,border:"1px solid #bbf7d0"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <span style={{fontSize:26}}>{job.icon}</span>
              <div><div style={{fontWeight:700,fontSize:14,color:T.text}}>{job.title}</div><div style={{fontSize:12,color:"#057a55"}}>👤 {job.employer}</div></div>
            </div>
            {[{l:"Salariu",v:`${job.salary} RON`},{l:`Comision 5%`,v:`${fee} RON`},{l:"Total escrow",v:`${total} RON`,bold:true,color:T.green}].map(r=>(
              <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13}}>
                <span style={{color:T.text2}}>{r.l}</span>
                <span style={{fontWeight:r.bold?800:600,color:r.color||T.text,fontSize:r.bold?15:13}}>{r.v}</span>
              </div>
            ))}
          </div>
          {[{i:"🔒",t:"Angajatorul blochează banii"},{i:"⚡",t:"Lucrătorul execută taskul"},{i:"✅",t:"Ambii confirmă finalizarea"},{i:"💸",t:"Banii eliberați automat"}].map(s=>(
            <div key={s.t} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${T.border}`}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:"#f0fdf4",border:"1px solid #bbf7d0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{s.i}</div>
              <span style={{fontSize:13,color:T.text2}}>{s.t}</span>
            </div>
          ))}
          <Btn onClick={()=>setStep(1)} color={T.green} style={{width:"100%",justifyContent:"center",marginTop:18}} size="lg">💳 Continuă la plată</Btn>
        </Card>
      )}

      {step===1&&(
        <Card style={{padding:"24px"}}>
          <h3 style={{fontFamily:"Outfit,sans-serif",fontSize:20,fontWeight:800,color:T.text,margin:"0 0 18px"}}>💳 Metodă de plată</h3>
          <div style={{display:"flex",gap:8,marginBottom:18}}>
            {[{k:"card",l:"💳 Card"},{k:"bank",l:"🏦 Transfer"},{k:"paypal",l:"🔵 PayPal"}].map(m=>(
              <button key={m.k} onClick={()=>setMethod(m.k)} style={{flex:1,padding:"10px 6px",borderRadius:11,cursor:"pointer",border:method===m.k?`2px solid ${T.green}`:`1.5px solid ${T.border}`,background:method===m.k?"#f0fdf4":"#fafaf9",fontSize:13,fontWeight:700,color:method===m.k?T.green:T.text2,transition:"all 0.2s"}}>{m.l}</button>
            ))}
          </div>
          {method==="card"&&(
            <div style={{marginBottom:18}}>
              <div style={{background:`linear-gradient(135deg,${T.dark},${T.dark2})`,borderRadius:14,padding:"18px",marginBottom:14,height:90,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:-16,right:-16,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.1em"}}>Număr card</div>
                <div style={{fontSize:17,fontFamily:"monospace",color:"#fff",letterSpacing:"0.12em",fontWeight:700}}>{card.num||"•••• •••• •••• ••••"}</div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:11}}>
                  <span style={{color:"rgba(255,255,255,0.4)"}}>Expiră: <span style={{color:"#fff"}}>{card.exp||"MM/YY"}</span></span>
                  <span style={{color:"rgba(255,255,255,0.6)",fontWeight:700}}>VISA</span>
                </div>
              </div>
              {[{l:"Număr card",v:card.num,set:v=>setCard(c=>({...c,num:fmtCard(v)})),ph:"1234 5678 9012 3456"},{l:"Expiră",v:card.exp,set:v=>setCard(c=>({...c,exp:fmtExp(v)})),ph:"MM/YY"},{l:"CVV",v:card.cvv,set:v=>setCard(c=>({...c,cvv:v.slice(0,3)})),ph:"•••",type:"password"}].map(f=>(
                <div key={f.l} style={{marginBottom:10}}>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:T.text2,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>{f.l}</label>
                  <input value={f.v} onChange={e=>f.set(e.target.value)} placeholder={f.ph} type={f.type||"text"} style={{width:"100%",height:42,borderRadius:9,border:`1.5px solid ${T.border}`,padding:"0 12px",fontSize:14,fontFamily:"DM Sans,sans-serif",outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.border=`1.5px solid ${T.green}`} onBlur={e=>e.target.style.border=`1.5px solid ${T.border}`}/>
                </div>
              ))}
            </div>
          )}
          {method==="bank"&&(
            <div style={{background:"#fafaf9",borderRadius:12,padding:"14px",marginBottom:18,border:`1px solid ${T.border}`}}>
              {[{l:"IBAN",v:"RO49 AAAA 1B31 0075 9384 0000"},{l:"Beneficiar",v:"ConnectJob SRL"},{l:"Referință",v:"ESC-2025-001234"},{l:"Sumă",v:`${total} RON`}].map(r=>(
                <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}`,fontSize:13}}>
                  <span style={{color:T.text3}}>{r.l}</span><span style={{fontWeight:600,color:T.text}}>{r.v}</span>
                </div>
              ))}
            </div>
          )}
          {method==="paypal"&&<div style={{textAlign:"center",padding:"20px",background:"#f0f7ff",borderRadius:12,marginBottom:18}}><div style={{fontSize:36,marginBottom:8}}>🔵</div><div style={{fontSize:14,fontWeight:600,color:"#003087"}}>Vei fi redirecționat către PayPal</div></div>}
          <div style={{background:"#fef3c7",borderRadius:9,padding:"9px 13px",marginBottom:14,border:"1px solid #fde68a",display:"flex",gap:8}}>
            <span>🔒</span><span style={{fontSize:12,color:"#92400e"}}>Banii sunt blocați în escrow și <strong>nu pot fi accesați</strong> până la confirmare.</span>
          </div>
          <Btn onClick={async()=>{
            setLoading(true); setApiMsg("");
            try {
              const res = await (await import("./services/api")).default.post("/payments/create-intent",{
                job_id: job.id, payee_id: job.employer_id || 1, amount: job.salary, method
              });
              setPaymentId(res.data.payment_id);
              if (res.data.message) setApiMsg(res.data.message);
              setStep(2);
            } catch(e){ setApiMsg(e.response?.data?.error||"Eroare la procesare"); }
            finally { setLoading(false); }
          }} disabled={loading} color={T.green} style={{width:"100%",justifyContent:"center"}} size="lg">
            {loading?"⏳ Se procesează...":`🔒 Blochează ${total} RON în Escrow`}
          </Btn>
          {apiMsg && <div style={{marginTop:8,fontSize:12,color:"#92400e",background:"#fef3c7",borderRadius:8,padding:"6px 10px"}}>{apiMsg}</div>}
        </Card>
      )}

      {step===2&&(
        <Card style={{padding:"24px",border:`2px solid ${T.green}`}}>
          <div style={{textAlign:"center",marginBottom:18}}>
            <div style={{fontSize:44,marginBottom:10}}>⚡</div>
            <h3 style={{fontFamily:"Outfit,sans-serif",fontSize:20,fontWeight:800,color:T.text,margin:"0 0 6px"}}>Task în desfășurare</h3>
            <div style={{fontFamily:"monospace",fontSize:26,fontWeight:800,color:T.green,background:"#f0fdf4",borderRadius:10,padding:"8px 18px",display:"inline-block",border:"2px solid #bbf7d0"}}>⏱ {fmt(timer)}</div>
          </div>
          <div style={{background:"#f0fdf4",borderRadius:12,padding:"14px",marginBottom:16,border:"1px solid #bbf7d0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontWeight:700,color:"#065f46",fontSize:13}}>💰 Bani blocați</span>
              <span style={{fontSize:20,fontWeight:800,color:T.green,fontFamily:"Outfit,sans-serif"}}>{total} RON</span>
            </div>
            <div style={{height:6,borderRadius:999,background:"#bbf7d0",overflow:"hidden"}}>
              <div style={{height:"100%",background:T.green,borderRadius:999,width:`${Math.min((timer/3600)*100,100)}%`,transition:"width 1s"}}/>
            </div>
          </div>
          {[{l:"Plată blocată",d:true},{l:"Lucrătorul a confirmat",d:true},{l:"Task în execuție",d:timer>0},{l:"Confirmare finalizare",d:false},{l:"Bani eliberați",d:false}].map(s=>(
            <div key={s.l} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 0",borderBottom:`1px solid ${T.border}`}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:s.d?T.green:"#f5f5f4",border:s.d?"none":`2px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",flexShrink:0}}>{s.d?"✓":""}</div>
              <span style={{fontSize:13,color:s.d?T.green:T.text3,fontWeight:s.d?600:400}}>{s.l}</span>
            </div>
          ))}
          <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:16}}>
            <Btn onClick={async()=>{
              setLoading(true);
              try {
                if (paymentId) await (await import("./services/api")).default.post(`/payments/${paymentId}/release`);
                setStep(3); update({escrowActive:null});
              } catch(e){ setApiMsg(e.response?.data?.error||"Eroare"); }
              finally { setLoading(false); }
            }} disabled={loading} color={T.green} style={{width:"100%",justifyContent:"center"}} size="lg">
              {loading?"⏳ Se procesează...":"✅ Confirmă și eliberează banii"}
            </Btn>
            <Btn onClick={async()=>{
              if (paymentId) await (await import("./services/api")).default.post(`/payments/${paymentId}/dispute`).catch(()=>{});
              setDisputed(true);
            }} variant="outline" style={{width:"100%",justifyContent:"center",borderColor:"#fecaca",color:T.red,background:"#fef2f2"}} size="md">⚠️ Deschide dispută</Btn>
          </div>
          {disputed&&<div style={{marginTop:10,background:"#fef2f2",borderRadius:9,padding:"10px 13px",border:"1px solid #fecaca",fontSize:12,color:T.red}}>{t("escrow_dispute_msg")}</div>}
        </Card>
      )}

      {step===3&&(
        <Card style={{padding:"36px 28px",border:`2px solid ${T.green}`,textAlign:"center"}}>
          <div style={{fontSize:62,marginBottom:14,animation:"popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275)"}}>🎉</div>
          <h2 style={{fontFamily:"Outfit,sans-serif",fontSize:24,fontWeight:800,color:T.text,margin:"0 0 8px"}}>{t("escrow_task_done_title")}</h2>
          <p style={{fontSize:14,color:T.text2,marginBottom:20}}>{t("escrow_task_done_msg")}</p>
          <div style={{display:"flex",gap:10}}>
            <Btn onClick={()=>navigate("reviews")} color={T.amber} style={{flex:1,justifyContent:"center"}}>⭐ Lasă recenzie</Btn>
            <Btn onClick={()=>navigate("home")} variant="outline" style={{flex:1,justifyContent:"center"}}>🏠 Acasă</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  PAGE: CONTRACT
// ══════════════════════════════════════════════════════════════
function PageContract({ gs, update, navigate }) {
  const { t } = useTranslation("t");
  const job=gs.selectedJob||(gs.jobs||[])[0];
  const [step,setStep]=useState(0);
  const [name,setName]=useState("");
  const [agree,setAgree]=useState(false);
  const [loading,setLoading]=useState(false);
  const [contractDbId, setContractDbId]=useState(null);
  const [apiError, setApiError]=useState("");
  if(!job) return (
    <div style={{textAlign:"center",padding:"60px 24px",color:T.text2}}>
      <div style={{fontSize:52,marginBottom:14}}>📝</div>
      <div style={{fontFamily:"Outfit,sans-serif",fontSize:18,fontWeight:700,color:T.text,marginBottom:8}}>Niciun job selectat</div>
      <div style={{fontSize:14,marginBottom:24,color:T.text2}}>Selectează un job din lista de locuri de muncă pentru a genera contractul.</div>
      <Btn onClick={()=>navigate("jobs")} color={T.green} style={{margin:"0 auto"}}>🗂️ Caută joburi</Btn>
    </div>
  );
  const date=new Date().toLocaleDateString("ro",{year:"numeric",month:"long",day:"numeric"});
  const contractId=`JC-${Date.now().toString().slice(-6)}`;

  return (
    <div style={{maxWidth:600,margin:"0 auto",animation:"fadeIn 0.3s ease"}}>
      {step===0&&(
        <Card style={{overflow:"hidden"}}>
          <div style={{background:`linear-gradient(135deg,${T.dark},${T.dark2})`,padding:"22px 26px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3}}>{t("contract_services_title")}</div>
              <div style={{fontFamily:"Outfit,sans-serif",fontSize:18,fontWeight:800,color:"#f1f5f9"}}>ConnectJob</div>
              <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Nr. {contractId}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:"#64748b"}}>Data emiterii</div>
              <div style={{fontSize:12,color:"#94a3b8",fontWeight:600}}>{date}</div>
            </div>
          </div>
          <div style={{padding:"22px 26px",maxHeight:380,overflowY:"auto"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
              {[{l:t("contract_employer_lbl"),v:job.employer},{l:t("contract_provider_lbl"),v:"Alexandru Ionescu"},{l:t("contract_service_lbl"),v:job.title},{l:t("contract_category_lbl"),v:job.category},{l:t("contract_remuneration_lbl"),v:`${job.salary} RON`},{l:t("contract_payment_lbl"),v:t("contract_payment_method")}].map(r=>(
                <div key={r.l} style={{background:"#fafaf9",borderRadius:9,padding:"9px 11px",border:`1px solid ${T.border}`}}>
                  <div style={{fontSize:9,color:T.text3,fontWeight:700,textTransform:"uppercase",marginBottom:2}}>{r.l}</div>
                  <div style={{fontSize:13,fontWeight:600,color:T.text}}>{r.v}</div>
                </div>
              ))}
            </div>
            {[{n:"1.",title:t("contract_clause1_title"),tx:`Prestatorul se obligă să execute serviciul de ${job.title} conform cerințelor angajatorului.`},{n:"2.",title:t("contract_clause2_title"),tx:`Suma de ${job.salary} RON va fi plătită prin Escrow ConnectJob după confirmare.`},{n:"3.",title:t("contract_clause3_title"),tx:t("contract_clause3_text")},{n:"4.",title:t("contract_clause4_title"),tx:t("contract_clause4_text")},{n:"5.",title:t("contract_clause5_title"),tx:t("contract_clause5_text")}].map(c=>(
              <div key={c.n} style={{marginBottom:10,padding:"11px",background:"#fafaf9",borderRadius:9,border:`1px solid ${T.border}`}}>
                <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:3}}>{c.n} {c.title}</div>
                <div style={{fontSize:12,color:T.text2,lineHeight:1.7}}>{c.tx}</div>
              </div>
            ))}
          </div>
          <div style={{padding:"14px 26px 22px"}}>
            <Btn onClick={()=>setStep(1)} color={T.green} style={{width:"100%",justifyContent:"center"}} size="lg">{t("contract_sign_cta")}</Btn>
          </div>
        </Card>
      )}

      {step===1&&(
        <Card style={{padding:"28px 26px"}}>
          <div style={{textAlign:"center",marginBottom:22}}>
            <div style={{fontSize:44,marginBottom:10}}>✍️</div>
            <h3 style={{fontFamily:"Outfit,sans-serif",fontSize:20,fontWeight:800,color:T.text,margin:"0 0 6px"}}>{t("contract_digital_sig")}</h3>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:T.text2,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:7}}>{t("contract_fullname_lbl")}</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder={t("contract_fullname_ph")} style={{width:"100%",height:52,borderRadius:11,border:`1.5px solid ${T.border}`,padding:"0 16px",fontSize:20,fontFamily:"Georgia,serif",color:T.text,outline:"none",boxSizing:"border-box",fontStyle:"italic"}} onFocus={e=>e.target.style.border=`1.5px solid ${T.green}`} onBlur={e=>e.target.style.border=`1.5px solid ${T.border}`}/>
            {name&&<div style={{marginTop:8,padding:"10px 14px",background:"#fafaf9",borderRadius:9,border:"1px dashed #d1d5db",fontFamily:"Georgia,serif",fontSize:22,color:T.text,fontStyle:"italic",textAlign:"center"}}>{name}</div>}
          </div>
          <div onClick={()=>setAgree(!agree)} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:18,cursor:"pointer",padding:"11px",borderRadius:9,background:agree?"#f0fdf4":"#fafaf9",border:agree?"1px solid #bbf7d0":`1px solid ${T.border}`,transition:"all 0.2s"}}>
            <div style={{width:19,height:19,borderRadius:5,flexShrink:0,marginTop:1,background:agree?T.green:T.white,border:agree?"none":`2px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff"}}>{agree?"✓":""}</div>
            <span style={{fontSize:12,color:T.text2,lineHeight:1.6}}>{t("contract_confirm_terms")}</span>
          </div>
          <Btn onClick={async()=>{
            if(!name.trim()||!agree) return;
            setLoading(true); setApiError("");
            try {
              const apiModule = await import("./services/api");
              const api = apiModule.default;
              // Creeaza contractul daca nu exista
              let cid = contractDbId;
              if (!cid) {
                const res = await api.post("/contracts",{ job_id: job.id||1, worker_id: gs.user.id||1, content: contractId });
                cid = res.data.id; setContractDbId(cid);
              }
              // Semneaza
              await api.post(`/contracts/${cid}/sign`,{ signature: name });
              setStep(2); update({signedContracts:[...(gs.signedContracts||[]),contractId]});
            } catch(e){ setApiError(e.response?.data?.error||"Eroare la semnare"); }
            finally{ setLoading(false); }
          }} disabled={!name.trim()||!agree||loading} color={T.green} style={{width:"100%",justifyContent:"center"}} size="lg">
            {loading?t("contract_signing"):t("contract_sign_now")}
          </Btn>
          {apiError && <div style={{marginTop:8,fontSize:12,color:"#dc2626",background:"#fef2f2",borderRadius:8,padding:"6px 10px"}}>{apiError}</div>}
        </Card>
      )}

      {step===2&&(
        <Card style={{padding:"36px 28px",border:`2px solid ${T.green}`,textAlign:"center"}}>
          <div style={{fontSize:62,marginBottom:14,animation:"popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275)"}}>📜</div>
          <h2 style={{fontFamily:"Outfit,sans-serif",fontSize:24,fontWeight:800,color:T.text,margin:"0 0 8px"}}>{t("contract_success_title")}</h2>
          <p style={{fontSize:14,color:T.text2,marginBottom:20}}>{t("contract_success_msg")}</p>
          <div style={{display:"flex",gap:10}}>
            <Btn color={T.green} style={{flex:1,justifyContent:"center"}}>📥 Descarcă PDF</Btn>
            <Btn onClick={()=>navigate("escrow")} variant="outline" style={{flex:1,justifyContent:"center"}}>🔒 Mergi la Escrow</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
//  PAGE: VERIFY IDENTITY
// ══════════════════════════════════════════════════════════════
function PageVerify({ gs, update, navigate }) {
  const { t } = useTranslation("t");
  const [step,setStep]=useState(gs.user.verified?4:0);
  const [phone,setPhone]=useState("");
  const [otp,setOtp]=useState(["","","","","",""]);
  const [otpSent,setOtpSent]=useState(false);
  const [otpTimer,setOtpTimer]=useState(0);
  const [docType,setDocType]=useState("");
  const [docOk,setDocOk]=useState(false);
  const [loading,setLoading]=useState(false);
  const [score,setScore]=useState(0);
  const fileRef=useRef(null);
  const videoRef=useRef(null);
  const timerRef=useRef(null);
  useEffect(()=>{if(otpTimer>0){timerRef.current=setTimeout(()=>setOtpTimer(t=>t-1),1000);}return()=>clearTimeout(timerRef.current);},[otpTimer]);

  const steps=[t("verify_step1"),t("verify_step2"),t("verify_step3"),t("verify_step4")];

  if(step===4||gs.user.verified) return (
    <div style={{maxWidth:480,margin:"0 auto",textAlign:"center",padding:"60px 20px",animation:"fadeIn 0.3s ease"}}>
      <div style={{fontSize:72,marginBottom:16}}>✅</div>
      <h2 style={{fontFamily:"Outfit,sans-serif",fontSize:28,fontWeight:800,color:T.text,margin:"0 0 10px"}}>{t("verify_success_title")}</h2>
      <p style={{fontSize:15,color:T.text2,marginBottom:24}}>{t("verify_success_msg")}</p>
      <div style={{display:"inline-flex",alignItems:"center",gap:12,background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",border:`2px solid ${T.green}`,borderRadius:14,padding:"14px 22px",marginBottom:24}}>
        <Avatar initials={gs.user.initials} color={T.green} size={46}/>
        <div style={{textAlign:"left"}}>
          <div style={{fontWeight:700,fontSize:16,color:T.text,fontFamily:"Outfit,sans-serif"}}>{gs.user.name}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
            <span style={{background:T.green,color:"#fff",borderRadius:999,padding:"1px 9px",fontSize:11,fontWeight:700}}>✓ Verificat</span>
          </div>
        </div>
      </div>
      <Btn onClick={()=>navigate("home")} color={T.green} size="lg" style={{width:"100%",justifyContent:"center"}}>🏠 Înapoi acasă</Btn>
    </div>
  );

  return (
    <div style={{maxWidth:480,margin:"0 auto",animation:"fadeIn 0.3s ease"}}>
      {/* Stepper */}
      <div style={{display:"flex",alignItems:"center",marginBottom:28,padding:"0 4px"}}>
        {steps.map((s,i)=>(
          <div key={s} style={{display:"flex",alignItems:"center",flex:i<steps.length-1?1:"none"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:step>i?T.green:step===i?T.white:"#f5f5f4",border:step===i?`2px solid ${T.green}`:step>i?"none":`2px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:step>i?"#fff":step===i?T.green:T.text3,boxShadow:step===i?`0 0 0 4px ${T.green}22`:"none",transition:"all 0.3s"}}>{step>i?"✓":i+1}</div>
              <span style={{fontSize:9,color:step>=i?T.green:T.text3,fontWeight:600,whiteSpace:"nowrap"}}>{s}</span>
            </div>
            {i<steps.length-1&&<div style={{flex:1,height:2,margin:"0 4px",marginBottom:14,background:step>i?T.green:T.border,transition:"background 0.3s"}}/>}
          </div>
        ))}
      </div>

      {step===0&&(
        <Card style={{padding:"28px 24px"}}>
          <div style={{textAlign:"center",marginBottom:22}}><div style={{fontSize:44,marginBottom:10}}>🛡️</div><h3 style={{fontFamily:"Outfit,sans-serif",fontSize:20,fontWeight:800,color:T.text,margin:"0 0 6px"}}>Verificare Identitate</h3><p style={{fontSize:13,color:T.text2}}>{t("verify_get_badge")} <strong>3x</strong> {t("verify_3x")}</p></div>
          {[{i:"📱",t:t("verify_req_phone")},{i:"🪪",t:t("verify_req_doc")},{i:"🤳",t:t("verify_req_selfie")}].map(s=>(
            <div key={s.t} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 13px",background:"#f0fdf4",borderRadius:9,border:"1px solid #bbf7d0",marginBottom:8}}>
              <span style={{fontSize:18}}>{s.i}</span><span style={{fontSize:13,color:"#057a55",fontWeight:500}}>{s.t}</span>
            </div>
          ))}
          <Btn onClick={()=>setStep(1)} color={T.green} style={{width:"100%",justifyContent:"center",marginTop:16}} size="lg">{t("verify_start_btn")}</Btn>
        </Card>
      )}

      {step===1&&(
        <Card style={{padding:"28px 24px"}}>
          <div style={{textAlign:"center",marginBottom:20}}><div style={{fontSize:42,marginBottom:10}}>📱</div><h3 style={{fontFamily:"Outfit,sans-serif",fontSize:20,fontWeight:800,color:T.text,margin:"0 0 6px"}}>{t("verify_phone_title")}</h3></div>
          {!otpSent?(
            <>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:T.text2,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>{t("verify_phone_lbl")}</label>
                <div style={{display:"flex",gap:8}}>
                  <div style={{padding:"0 12px",background:"#f5f5f4",borderRadius:9,border:`1.5px solid ${T.border}`,display:"flex",alignItems:"center",fontSize:14,fontWeight:600,whiteSpace:"nowrap"}}>🇷🇴 +40</div>
                  <input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))} placeholder="722 123 456" maxLength={9} style={{flex:1,height:44,borderRadius:9,border:`1.5px solid ${T.border}`,padding:"0 12px",fontSize:15,fontFamily:"DM Sans,sans-serif",outline:"none",letterSpacing:"0.1em"}} onFocus={e=>e.target.style.border=`1.5px solid ${T.green}`} onBlur={e=>e.target.style.border=`1.5px solid ${T.border}`}/>
                </div>
              </div>
              <Btn onClick={async()=>{
                if(phone.length<9)return; setLoading(true);
                try {
                  const apiMod = await import("./services/api");
                  const res = await apiMod.default.post("/kyc/send-otp",{ phone:`+40${phone}` });
                  if(res.data.demo_code) alert(`📱 Cod demo (doar dezvoltare): ${res.data.demo_code}`);
                  setOtpSent(true); setOtpTimer(60);
                } catch(e){ alert(e.response?.data?.error||"Eroare la trimitere SMS"); }
                finally{ setLoading(false); }
              }} disabled={phone.length<9||loading} color={T.green} style={{width:"100%",justifyContent:"center"}} size="lg">{loading?t("verify_sending_sms"):t("verify_send_sms_btn")}</Btn>
            </>
          ):(
            <>
              <p style={{fontSize:13,color:"#057a55",textAlign:"center",marginBottom:14,background:"#f0fdf4",borderRadius:8,padding:"7px",border:"1px solid #bbf7d0"}}>{t("verify_code_sent")} +40 {phone}</p>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:T.text2,textTransform:"uppercase",marginBottom:9}}>{t("verify_code_lbl")}</label>
                <div style={{display:"flex",gap:7,justifyContent:"center"}}>
                  {otp.map((v,i)=>(
                    <input key={i} id={`otp-${i}`} value={v} maxLength={1} onChange={e=>{const n=[...otp];n[i]=e.target.value.slice(-1);setOtp(n);if(e.target.value&&i<5)document.getElementById(`otp-${i+1}`)?.focus();}} style={{width:42,height:50,borderRadius:9,textAlign:"center",border:`1.5px solid ${v?T.green:T.border}`,fontSize:20,fontWeight:800,fontFamily:"Outfit,sans-serif",outline:"none",background:v?"#f0fdf4":"#fff",color:T.text}}/>
                  ))}
                </div>
                {otpTimer>0&&<p style={{fontSize:12,color:T.text3,textAlign:"center",marginTop:7}}>{t("verify_resend_timer")} {otpTimer}s</p>}
              </div>
              <Btn onClick={async()=>{
                const code = otp.join("");
                if(code.length<6)return; setLoading(true);
                try {
                  const apiMod = await import("./services/api");
                  await apiMod.default.post("/kyc/verify-otp",{ phone:`+40${phone}`, code });
                  setStep(2);
                } catch(e){ alert(e.response?.data?.error||"Cod invalid sau expirat"); }
                finally{ setLoading(false); }
              }} disabled={otp.join("").length<6||loading} color={T.green} style={{width:"100%",justifyContent:"center"}} size="lg">{loading?t("verify_verifying_code"):t("verify_check_code")}</Btn>
            </>
          )}
        </Card>
      )}

      {step===2&&(
        <Card style={{padding:"28px 24px"}}>
          <div style={{textAlign:"center",marginBottom:20}}><div style={{fontSize:42,marginBottom:10}}>🪪</div><h3 style={{fontFamily:"Outfit,sans-serif",fontSize:20,fontWeight:800,color:T.text,margin:"0 0 6px"}}>{t("verify_doc_title")}</h3></div>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            {[{k:"ci",l:t("verify_doc_ci")},{k:"pasaport",l:t("verify_doc_passport")},{k:"permis",l:t("verify_doc_license")}].map(d=>(
              <button key={d.k} onClick={()=>setDocType(d.k)} style={{flex:1,padding:"9px 4px",borderRadius:10,cursor:"pointer",border:docType===d.k?`2px solid ${T.green}`:`1.5px solid ${T.border}`,background:docType===d.k?"#f0fdf4":"#fafaf9",fontSize:12,fontWeight:700,color:docType===d.k?T.green:T.text2,transition:"all 0.2s"}}>{d.l}</button>
            ))}
          </div>
          <input type="file" ref={fileRef} accept="image/*,.pdf" style={{display:"none"}} onChange={async(e)=>{
            const file=e.target.files[0]; if(!file)return;
            setLoading(true);
            try {
              const fd=new FormData(); fd.append("document",file);
              const apiMod = await import("./services/api");
              await apiMod.default.post("/kyc/upload-document",fd,{headers:{"Content-Type":"multipart/form-data"}});
              setDocOk(true);
            } catch(err){ alert("Eroare la incarcare document"); }
            finally{ setLoading(false); }
          }}/>
          <div onClick={()=>!docOk&&fileRef.current?.click()} style={{border:docOk?`2px solid ${T.green}`:`2px dashed ${T.border}`,borderRadius:12,padding:"26px 18px",textAlign:"center",cursor:docOk?"default":"pointer",background:docOk?"#f0fdf4":"#fafaf9",marginBottom:18,transition:"all 0.2s"}}
            onMouseEnter={e=>{if(!docOk)e.currentTarget.style.borderColor=T.green;}}
            onMouseLeave={e=>{if(!docOk)e.currentTarget.style.borderColor=T.border;}}
          >
            {loading?<div><div style={{fontSize:28,animation:"spin 1s linear infinite"}}>⏳</div><div style={{fontSize:13,color:"#057a55",marginTop:6}}>{t("verify_processing")}</div></div>:docOk?<div><div style={{fontSize:36}}>✅</div><div style={{fontSize:13,fontWeight:700,color:T.green,marginTop:6}}>{t("verify_doc_uploaded")}</div></div>:<div><div style={{fontSize:32}}>📤</div><div style={{fontSize:13,fontWeight:600,color:T.text,marginTop:8}}>{t("verify_upload_click")}</div><div style={{fontSize:11,color:T.text3,marginTop:3}}>{t("verify_upload_formats")}</div></div>}
          </div>
          {docOk&&<Btn onClick={()=>setStep(3)} color={T.green} style={{width:"100%",justifyContent:"center"}} size="lg">{t("verify_continue_selfie")}</Btn>}
        </Card>
      )}

      {step===3&&(
        <Card style={{padding:"28px 24px"}}>
          <div style={{textAlign:"center",marginBottom:18}}><div style={{fontSize:42,marginBottom:10}}>🤳</div><h3 style={{fontFamily:"Outfit,sans-serif",fontSize:20,fontWeight:800,color:T.text,margin:"0 0 6px"}}>{t("verify_selfie_title")}</h3></div>
          <div style={{borderRadius:14,overflow:"hidden",background:T.dark,marginBottom:14,height:190,position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <video ref={videoRef} autoPlay muted playsInline style={{width:"100%",height:"100%",objectFit:"cover",transform:"scaleX(-1)"}} onLoadedMetadata={()=>{try{navigator.mediaDevices?.getUserMedia({video:true}).then(s=>{if(videoRef.current)videoRef.current.srcObject=s;});}catch(e){}}}/>
            <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
              <div style={{width:110,height:140,borderRadius:"50% 50% 50% 50% / 60% 60% 40% 40%",border:"2px dashed rgba(5,150,105,0.7)"}}/>
            </div>
            {loading&&<div style={{position:"absolute",inset:0,background:"rgba(5,150,105,0.9)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:32,marginBottom:8}}>🔍</div><div style={{color:"#fff",fontWeight:700,fontSize:14}}>Se analizează...</div></div>}
          </div>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            {[t("verify_tip_light"),t("verify_tip_camera"),t("verify_tip_neutral")].map(tip=><div key={tip} style={{flex:1,fontSize:10,color:"#057a55",background:"#f0fdf4",borderRadius:7,padding:"5px 3px",textAlign:"center",border:"1px solid #bbf7d0"}}>{tip}</div>)}
          </div>
          <Btn onClick={async()=>{
            if(videoRef.current?.srcObject){videoRef.current.srcObject.getTracks().forEach(t=>t.stop());}
            setLoading(true);
            try {
              const apiMod = await import("./services/api");
              await apiMod.default.post("/kyc/complete");
              let s=0;
              const iv=setInterval(()=>{s+=3;setScore(s);if(s>=96){clearInterval(iv);setStep(4);update({user:{...gs.user,verified:true}});}},30);
            } catch(e){ alert(e.response?.data?.error||"Eroare la verificare"); setLoading(false); }
          }} disabled={loading} color={T.green} style={{width:"100%",justifyContent:"center"}} size="lg">
            {loading?"🔍 Se verifică...":"📸 Fă selfie"}
          </Btn>
        </Card>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
//  PAGE: REVIEWS
// ══════════════════════════════════════════════════════════════
function PageReviews({ gs, update }) {
  const { t } = useTranslation("t");
  const [myRating,setMyRating]=useState(0);
  const [myText,setMyText]=useState("");
  const [submitted,setSubmitted]=useState(false);
  const [reviews,setReviews]=useState([]);
  const [filter,setFilter]=useState(null);

  useEffect(()=>{
    if(filter===null) setFilter(t("reviews_all_filter"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[t]);

  useEffect(()=>{
    if(!gs.user?.id) return;
    api.get(`/reviews/${gs.user.id}`).then(r=>setReviews(r.data.reviews||[])).catch(()=>{});
  },[gs.user?.id]);

  const submit=async()=>{
    if(!myRating||!myText.trim())return;
    try {
      await api.post("/reviews",{ target_id: gs.user.id, rating: myRating, text: myText });
      const r={id:Date.now(),reviewer_name:gs.user.name,reviewer_initials:gs.user.initials,rating:myRating,text:myText,created_at:new Date().toISOString(),reviewer_verified:gs.user.verified};
      setReviews(p=>[r,...p]);
      setSubmitted(true);
    } catch{}
  };

  const avg=reviews.length?(reviews.reduce((a,r)=>a+r.rating,0)/reviews.length).toFixed(1):"0.0";

  return (
    <div style={{animation:"fadeIn 0.3s ease"}}>
      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:16,marginBottom:24}}>
        <Card style={{padding:"24px",textAlign:"center"}}>
          <div style={{fontFamily:"Outfit,sans-serif",fontSize:52,fontWeight:800,color:T.text,lineHeight:1}}>{avg}</div>
          <Stars rating={parseFloat(avg)} size={20}/>
          <div style={{fontSize:13,color:T.text3,marginTop:8}}>{reviews.length} recenzii</div>
          <div style={{marginTop:12}}>
            {[5,4,3,2,1].map(s=>{
              const count=reviews.filter(r=>r.rating===s).length;
              return (
                <div key={s} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:11,color:T.text3,width:8}}>{s}</span>
                  <span style={{fontSize:12}}>★</span>
                  <div style={{flex:1,height:5,borderRadius:999,background:T.border,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:999,background:T.amber,width:`${(count/reviews.length)*100}%`}}/>
                  </div>
                  <span style={{fontSize:11,color:T.text3,width:12}}>{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <div>
          {/* Write review */}
          {!submitted?(
            <Card style={{padding:"20px",marginBottom:14}}>
              <h3 style={{fontFamily:"Outfit,sans-serif",fontSize:16,fontWeight:700,color:T.text,margin:"0 0 14px"}}>✍️ Lasă o recenzie</h3>
              <div style={{display:"flex",gap:6,marginBottom:12}}>
                {[1,2,3,4,5].map(s=>(
                  <button key={s} onClick={()=>setMyRating(s)} style={{width:36,height:36,borderRadius:8,border:`1.5px solid ${s<=myRating?T.amber:T.border}`,background:s<=myRating?"#fef3c7":"#fafaf9",fontSize:18,cursor:"pointer",transition:"all 0.15s"}}>★</button>
                ))}
              </div>
              <textarea value={myText} onChange={e=>setMyText(e.target.value)} placeholder="Descrie experiența ta..." rows={3} style={{width:"100%",borderRadius:10,border:`1.5px solid ${T.border}`,padding:"9px 12px",fontSize:13,fontFamily:"DM Sans,sans-serif",resize:"none",outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.border=`1.5px solid ${T.green}`} onBlur={e=>e.target.style.border=`1.5px solid ${T.border}`}/>
              <Btn onClick={submit} disabled={!myRating||!myText.trim()} color={T.green} style={{width:"100%",justifyContent:"center",marginTop:10}}>⭐ Publică recenzia</Btn>
            </Card>
          ):(
            <Card style={{padding:"20px",marginBottom:14,border:`2px solid ${T.green}`,textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:8}}>🎉</div>
              <div style={{fontFamily:"Outfit,sans-serif",fontSize:16,fontWeight:700,color:T.text}}>Recenzie publicată!</div>
            </Card>
          )}

          {/* Filters */}
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {[t("reviews_all_filter"),t("reviews_verified_filter2"),t("reviews_5stars"),t("reviews_4stars")].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{padding:"5px 12px",borderRadius:999,border:"none",cursor:"pointer",background:filter===f?T.green:"#f5f5f4",color:filter===f?"#fff":T.text2,fontSize:11,fontWeight:600,transition:"all 0.15s"}}>{f}</button>
            ))}
          </div>

          {/* Review list */}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {reviews.filter(r=>{
              if(filter===t("reviews_verified_filter2"))return r.reviewer_verified;
              if(filter===t("reviews_5stars"))return r.rating===5;
              if(filter===t("reviews_4stars"))return r.rating===4;
              return true;
            }).map(r=>(
              <Card key={r.id} style={{padding:"14px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Avatar initials={r.reviewer_initials||r.reviewer_name?.slice(0,2)||"??"} color={T.green} size={32}/>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:T.text}}>{r.reviewer_name||"Anonim"}</div>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:1}}>
                        <Stars rating={r.rating} size={11}/>
                        {r.reviewer_verified&&<span style={{background:"#f0fdf4",color:T.green,borderRadius:999,padding:"1px 7px",fontSize:10,fontWeight:700}}>✓ Verificat</span>}
                      </div>
                    </div>
                  </div>
                  <span style={{fontSize:11,color:T.text3}}>{r.created_at?new Date(r.created_at).toLocaleDateString("ro"):""}</span>
                </div>
                <p style={{fontSize:13,color:T.text2,lineHeight:1.6,margin:0}}>{r.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  PAGE: ANALYTICS (Dashboard angajator)
// ══════════════════════════════════════════════════════════════
function PageAnalytics({ gs }) {
  const { t } = useTranslation("t");
  const [period,setPeriod]=useState("7z");
  const d7={views:[12,18,15,22,30,28,35],apps:[2,3,2,4,6,5,8]};
  const d30={views:[45,52,38,61,55,70,48,65,72,80,55,68,74,90,82,95,78,88,100,92,85,110,98,105,92,88,115,108,120,118],apps:[8,10,7,12,9,14,8,13,15,16,10,12,14,18,16,19,14,17,20,18,16,22,19,21,18,17,23,21,24,23]};
  const d=period==="7z"?d7:d30;

  return (
    <div style={{animation:"fadeIn 0.3s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{fontFamily:"Outfit,sans-serif",fontSize:24,fontWeight:800,color:T.text,margin:"0 0 4px"}}>{t("analytics_employer_title")}</h2>
          <p style={{fontSize:13,color:T.text3,margin:0}}>{t("analytics_realtime_desc")}</p>
        </div>
        <div style={{display:"flex",background:"#f5f5f4",borderRadius:9,padding:3,gap:2}}>
          {[{k:"7z",l:t("analytics_7days")},{k:"30z",l:t("analytics_30days")}].map(p=>(
            <button key={p.k} onClick={()=>setPeriod(p.k)} style={{padding:"7px 14px",borderRadius:7,border:"none",cursor:"pointer",background:period===p.k?T.white:"transparent",color:period===p.k?T.text:T.text3,fontWeight:700,fontSize:12,fontFamily:"DM Sans,sans-serif",boxShadow:period===p.k?"0 1px 4px rgba(0,0,0,0.08)":"none",transition:"all 0.2s"}}>{p.l}</button>
          ))}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:14,marginBottom:22}}>
        {[
          {i:"👁️",l:t("analytics_views"),v:"746",trend:"+23%",c:T.blue,s:d.views},
          {i:"📨",l:t("analytics_apps"),v:"54",trend:"+15%",c:T.green,s:d.apps},
          {i:"💬",l:t("analytics_contacts"),v:"23",trend:"+8%",c:T.purple,s:[1,1,2,2,3,2,4,3,5,4,6,5]},
          {i:"🎯",l:t("analytics_conversion"),v:"7.2%",trend:"+1.2%",c:T.amber,s:[5,5.8,6,5.5,6.2,6.8,7.1,6.9,7.2,7.0,7.3,7.2]},
        ].map(s=>(
          <Card key={s.l} style={{padding:"18px 18px 12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div style={{width:38,height:38,borderRadius:10,background:`${s.c}15`,border:`1px solid ${s.c}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{s.i}</div>
              <Badge color={s.c}>↑ {s.trend}</Badge>
            </div>
            <div style={{fontFamily:"Outfit,sans-serif",fontSize:26,fontWeight:800,color:T.text,marginBottom:2}}>{s.v}</div>
            <div style={{fontSize:12,color:T.text3,marginBottom:10}}>{s.l}</div>
            <Sparkline data={s.s} color={s.c}/>
          </Card>
        ))}
      </div>

      {/* Jobs performance */}
      <Card>
        <div style={{padding:"16px 20px 12px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h3 style={{fontFamily:"Outfit,sans-serif",fontSize:16,fontWeight:700,color:T.text,margin:0}}>{t("analytics_perf_title")}</h3>
          <Btn color={T.green} size="sm">+ Job nou</Btn>
        </div>
        {(gs.jobs||[]).slice(0,4).map((job,i)=>(
          <div key={job.id} style={{padding:"14px 20px",borderBottom:i<3?`1px solid ${T.border}`:"none",cursor:"pointer",transition:"background 0.12s"}}
            onMouseEnter={e=>e.currentTarget.style.background="#fafffe"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}
          >
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,borderRadius:9,background:`${job.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{job.icon}</div>
                <div><div style={{fontWeight:700,fontSize:14,color:T.text,fontFamily:"Outfit,sans-serif"}}>{job.title}</div><div style={{fontSize:11,color:T.text3}}>📋 {job.category} · {job.salary} {t("analytics_per_day")}</div></div>
              </div>
              <Badge color={T.green}>● activ</Badge>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {[{l:"Vizualizări",v:job.rating*50|0,c:T.blue},{l:"Aplicări",v:job.reviews,c:T.green},{l:"Contacte",v:Math.round(job.reviews*0.3),c:T.purple},{l:"Conversie",v:`${(job.reviews/(job.rating*50)*100).toFixed(1)}%`,c:T.amber}].map(m=>(
                <div key={m.l} style={{textAlign:"center",padding:"6px 4px",background:"#fafaf9",borderRadius:7}}>
                  <div style={{fontSize:14,fontWeight:800,color:m.c,fontFamily:"Outfit,sans-serif"}}>{m.v}</div>
                  <div style={{fontSize:9,color:T.text3}}>{m.l}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
//  PAGE: ADMIN — Moderare rapoarte
// ══════════════════════════════════════════════════════════════
function PageAdmin({ gs }) {
  const { t } = useTranslation("t");
  const [reports, setReports]   = useState([]);
  const [stats, setStats]       = useState(null);
  const [filter, setFilter]     = useState("pending");
  const [loading, setLoading]   = useState(true);
  const [actioning, setActioning] = useState(null);

  const REASONS = {
    limbaj_ofensiv:t("admin_reason_offensive"), rasism:t("admin_reason_racism"),
    hartuire:t("admin_reason_harassment"), spam:t("admin_reason_spam"),
    frauda:t("admin_reason_fraud"), altele:t("admin_reason_other"),
  };

  useEffect(()=>{
    setLoading(true);
    Promise.all([
      api.get(`/reports?status=${filter}`),
      api.get("/reports/stats"),
    ]).then(([r, s])=>{ setReports(r.data); setStats(s.data); })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[filter]);

  const takeAction = async (reportId, action) => {
    setActioning(reportId);
    const labels = { warn:t("admin_action_warned"), suspend:t("admin_action_suspended"), ban:t("admin_action_banned"), dismiss:t("admin_action_dismissed") };
    try {
      await api.post(`/reports/${reportId}/action`,{ action, note: labels[action] });
      setReports(p=>p.filter(r=>r.id!==reportId));
    } catch(e){ alert(e.response?.data?.error||"Eroare"); }
    finally { setActioning(null); }
  };

  if (gs.user.role !== "admin") return (
    <div style={{ textAlign:"center", padding:"60px 20px" }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
      <h3 style={{ fontFamily:"Outfit,sans-serif", color:T.text }}>Acces rezervat administratorilor</h3>
    </div>
  );

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
      <h2 style={{ fontFamily:"Outfit,sans-serif", fontSize:22, fontWeight:800, color:T.text, margin:"0 0 20px" }}>{t("admin_title")}</h2>

      {/* Stats */}
      {stats && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:12, marginBottom:22 }}>
          {[
            {l:t("admin_total"), v:stats.total, c:T.blue},
            {l:t("admin_pending_stat"),   v:stats.pending, c:T.amber},
            {l:t("admin_actioned_stat"),      v:stats.actioned, c:T.green},
            {l:t("admin_suspended_stat"),     v:stats.suspended, c:T.orange},
            {l:t("admin_banned_stat"),         v:stats.banned, c:T.red},
          ].map(s=>(
            <Card key={s.l} style={{ padding:"14px 16px", textAlign:"center" }}>
              <div style={{ fontFamily:"Outfit,sans-serif", fontSize:28, fontWeight:800, color:s.c }}>{s.v}</div>
              <div style={{ fontSize:11, color:T.text3 }}>{s.l}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:6, marginBottom:16 }}>
        {["pending","reviewed","actioned","dismissed"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:"6px 14px", borderRadius:999, border:"none", cursor:"pointer", fontSize:12, fontWeight:700, background:filter===f?T.green:"#f5f5f4", color:filter===f?"#fff":T.text2 }}>
            {f==="pending"?t("admin_tab_pending"):f==="actioned"?t("admin_tab_actioned"):f==="dismissed"?t("admin_tab_dismissed"):t("admin_tab_reviewed")}
          </button>
        ))}
      </div>

      {loading && <Loader text={t("admin_loading")}/>}

      {!loading && reports.length === 0 && (
        <Card style={{ padding:40, textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:8 }}>✅</div>
          <div style={{ color:T.text3 }}>{t("admin_no_reports")}</div>
        </Card>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {reports.map(r=>(
          <Card key={r.id} style={{ padding:"16px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:`${T.red}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>⚠️</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14, color:T.text }}>{REASONS[r.reason]||r.reason}</div>
                  <div style={{ fontSize:11, color:T.text3 }}>{new Date(r.created_at).toLocaleDateString("ro",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
                </div>
              </div>
              <Badge color={r.status==="pending"?T.amber:r.status==="actioned"?T.green:T.text3}>
                {r.status==="pending"?"⏳ Pending":r.status==="actioned"?"✅ Acționat":"❌ Respins"}
              </Badge>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
              <div style={{ background:"#fafaf9", borderRadius:8, padding:"10px 12px" }}>
                <div style={{ fontSize:10, fontWeight:700, color:T.text3, textTransform:"uppercase", marginBottom:3 }}>{t("admin_reported_by")}</div>
                <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{r.reporter_id?.name||"?"}</div>
                <div style={{ fontSize:11, color:T.text3 }}>{r.reporter_id?.email}</div>
              </div>
              <div style={{ background:"#fef2f2", borderRadius:8, padding:"10px 12px", border:"1px solid #fecaca" }}>
                <div style={{ fontSize:10, fontWeight:700, color:T.red, textTransform:"uppercase", marginBottom:3 }}>{t("admin_reported_user")}</div>
                <div style={{ fontSize:13, fontWeight:600, color:T.text }}>{r.reported_user_id?.name||"?"}</div>
                <div style={{ fontSize:11, color:T.text3 }}>{r.reported_user_id?.email}</div>
                <div style={{ display:"flex", gap:6, marginTop:4 }}>
                  <Badge color={r.reported_user_id?.status==="active"?T.green:T.red}>{r.reported_user_id?.status||"active"}</Badge>
                  {r.reported_user_id?.warnings_count > 0 && <Badge color={T.amber}>⚠️ {r.reported_user_id.warnings_count} avert.</Badge>}
                </div>
              </div>
            </div>

            {r.details && (
              <div style={{ background:"#f8fafc", borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:12, color:T.text2, borderLeft:`3px solid ${T.amber}` }}>
                "{r.details}"
              </div>
            )}

            {r.status === "pending" && (
              <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                <button onClick={()=>takeAction(r.id,"warn")} disabled={actioning===r.id} style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${T.amber}`, cursor:"pointer", background:"#fef3c7", color:"#92400e", fontSize:12, fontWeight:700 }}>
                  {t("admin_action_warn")}
                </button>
                <button onClick={()=>takeAction(r.id,"suspend")} disabled={actioning===r.id} style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${T.orange}`, cursor:"pointer", background:"#fff7ed", color:T.orange, fontSize:12, fontWeight:700 }}>
                  {t("admin_action_suspend")}
                </button>
                <button onClick={()=>takeAction(r.id,"ban")} disabled={actioning===r.id} style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${T.red}`, cursor:"pointer", background:"#fef2f2", color:T.red, fontSize:12, fontWeight:700 }}>
                  {t("admin_action_ban")}
                </button>
                <button onClick={()=>takeAction(r.id,"dismiss")} disabled={actioning===r.id} style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${T.border}`, cursor:"pointer", background:"#fafaf9", color:T.text3, fontSize:12, fontWeight:600 }}>
                  {t("admin_action_dismiss")}
                </button>
              </div>
            )}
            {r.action_taken && <div style={{ marginTop:8, fontSize:11, color:T.green, fontWeight:600 }}>✓ {r.action_taken}</div>}
          </Card>
        ))}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
//  PAGE CALENDAR — Agendă personală cu programări & alerte
// ══════════════════════════════════════════════════════════════
const SCHEDULE_TYPE_DEFS = [
  { key:"maintenance", icon:"🏠", color:"#3b82f6" },
  { key:"garden",      icon:"🌿", color:"#10b981" },
  { key:"dogwalk",     icon:"🐕", color:"#f59e0b" },
  { key:"cleaning",    icon:"🧹", color:"#8b5cf6" },
  { key:"repair",      icon:"🔧", color:"#ef4444" },
  { key:"other",       icon:"⭐", color:"#6b7280" },
];

function PageCalendar({ gs, update }) {
  const { t } = useTranslation("t");
  const SCHEDULE_TYPES = SCHEDULE_TYPE_DEFS.map(d => ({
    ...d,
    label: t(`sched_${d.key}`, { defaultValue: d.key }),
  }));
  const today = new Date();
  const todayStr = today.toISOString().slice(0,10);
  const [curMonth, setCurMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const emptyForm = { title:"", type:"maintenance", date:todayStr, time:"09:00", location:"", client:"", notes:"", recurring:"none", reminderMin:30 };
  const [form, setForm] = useState(emptyForm);
  const events = gs.schedule || [];

  // Persist to localStorage whenever events change
  useEffect(() => {
    try { localStorage.setItem("jc_schedule", JSON.stringify(events)); } catch(e){}
  }, [events]);

  // Request notification permission once
  useEffect(() => {
    if(typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Schedule browser notifications for upcoming events (next 7 days)
  useEffect(() => {
    const timers = [];
    const now = Date.now();
    events.forEach(ev => {
      if(!ev.date || !ev.time) return;
      const evTs = new Date(`${ev.date}T${ev.time}`).getTime();
      const alertTs = evTs - (ev.reminderMin || 30) * 60000;
      const diff = alertTs - now;
      if(diff > 0 && diff < 86400000 * 7) {
        const timer = setTimeout(() => {
          if(typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification(`⏰ ${ev.title}`, {
              body: `${ev.time}${ev.client ? " · " + ev.client : ""}${ev.location ? " · " + ev.location : ""}`,
              icon: "/logo192.png"
            });
          }
        }, diff);
        timers.push(timer);
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [events]);

  const year = curMonth.getFullYear();
  const month = curMonth.getMonth();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const firstDayRaw = new Date(year, month, 1).getDay(); // 0=Sun
  const startOffset = firstDayRaw === 0 ? 6 : firstDayRaw - 1; // Monday-first

  const cells = [];
  for(let i=0; i<startOffset; i++) cells.push(null);
  for(let d=1; d<=daysInMonth; d++) cells.push(d);
  while(cells.length % 7 !== 0) cells.push(null);

  const toDateStr = (d) => `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  const isRecurringOnDay = (ev, dateStr) => {
    if(ev.date > dateStr) return false;
    if(ev.recurring === "weekly") {
      return new Date(ev.date+"T12:00").getDay() === new Date(dateStr+"T12:00").getDay();
    }
    if(ev.recurring === "monthly") {
      return ev.date.slice(8) === dateStr.slice(8);
    }
    return false;
  };

  const eventsForDate = (dateStr) =>
    events.filter(ev => ev.date === dateStr || (ev.recurring !== "none" && isRecurringOnDay(ev, dateStr)));

  const selectedEvents = eventsForDate(selectedDate);

  const typeObj = (key) => SCHEDULE_TYPES.find(s => s.key === key) || SCHEDULE_TYPES[5];

  const openAdd = () => {
    setForm({ ...emptyForm, date: selectedDate });
    setEditId(null);
    setShowForm(true);
  };

  const openEdit = (ev) => {
    setForm({ ...ev });
    setEditId(ev.id);
    setShowForm(true);
  };

  const saveEvent = () => {
    if(!form.title.trim() || !form.date) return;
    if(editId) {
      update({ schedule: events.map(e => e.id === editId ? { ...form, id: editId } : e) });
    } else {
      update({ schedule: [...events, { ...form, id: Date.now() }] });
    }
    setShowForm(false);
  };

  const deleteEvent = (id) => update({ schedule: events.filter(e => e.id !== id) });

  const MONTH_NAMES = t("cal_months",{returnObjects:true,defaultValue:["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"]});
  const DAY_SHORT   = t("cal_days_short",{returnObjects:true,defaultValue:["Lu","Ma","Mi","Jo","Vi","Sâ","Du"]});

  // Count upcoming events for header badge
  const upcomingCount = events.filter(ev => ev.date >= todayStr).length;

  const inputSt = { width:"100%", height:40, borderRadius:9, border:`1.5px solid ${T.border}`, padding:"0 12px", fontSize:13, color:T.text, outline:"none", boxSizing:"border-box", background:"#fff" };
  const labelSt = { fontSize:11, fontWeight:700, color:T.text2, textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:4 };

  return (
    <div style={{maxWidth:680, margin:"0 auto", animation:"fadeIn 0.3s ease"}}>

      {/* Month navigator */}
      <Card style={{padding:"16px 18px 14px", marginBottom:12}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12}}>
          <button onClick={()=>setCurMonth(new Date(year,month-1,1))} style={{width:34,height:34,borderRadius:9,border:`1.5px solid ${T.border}`,background:"#fff",cursor:"pointer",fontSize:16,color:T.text2,display:"flex",alignItems:"center",justifyContent:"center"}}>◀</button>
          <div>
            <div style={{fontFamily:"Outfit,sans-serif",fontSize:17,fontWeight:800,color:T.text,textAlign:"center"}}>{MONTH_NAMES[month]} {year}</div>
            {upcomingCount>0 && <div style={{fontSize:11,color:T.green,fontWeight:700,textAlign:"center"}}>📅 {upcomingCount} {t("cal_upcoming_count","programări viitoare")}</div>}
          </div>
          <button onClick={()=>setCurMonth(new Date(year,month+1,1))} style={{width:34,height:34,borderRadius:9,border:`1.5px solid ${T.border}`,background:"#fff",cursor:"pointer",fontSize:16,color:T.text2,display:"flex",alignItems:"center",justifyContent:"center"}}>▶</button>
        </div>

        {/* Day headers */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
          {DAY_SHORT.map(d=>(
            <div key={d} style={{textAlign:"center",fontSize:10,fontWeight:700,color:T.text3,padding:"3px 0"}}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
          {cells.map((d,i) => {
            if(!d) return <div key={i} style={{minHeight:44}}/>;
            const dateStr = toDateStr(d);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dayEvs = eventsForDate(dateStr);
            return (
              <div key={i} onClick={()=>setSelectedDate(dateStr)} style={{
                borderRadius:9, padding:"5px 2px 4px", cursor:"pointer", minHeight:44, textAlign:"center",
                background: isSelected ? T.green : isToday ? "#f0fdf4" : "#fafaf9",
                border: isToday && !isSelected ? `2px solid ${T.green}` : `1.5px solid transparent`,
                transition:"all 0.15s",
              }}>
                <div style={{fontSize:12,fontWeight:isToday||isSelected?800:500,color:isSelected?"#fff":isToday?T.green:T.text,marginBottom:3}}>{d}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:2,justifyContent:"center"}}>
                  {dayEvs.slice(0,4).map((ev,j)=>(
                    <div key={j} style={{width:5,height:5,borderRadius:"50%",background:isSelected?"rgba(255,255,255,0.8)":typeObj(ev.type).color}}/>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Legend */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10,padding:"0 2px"}}>
        {SCHEDULE_TYPES.map(tp=>(
          <div key={tp.key} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:T.text2}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:tp.color}}/>
            <span>{tp.icon} {tp.label}</span>
          </div>
        ))}
      </div>

      {/* Selected day events */}
      <Card style={{padding:"16px 18px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{fontFamily:"Outfit,sans-serif",fontSize:14,fontWeight:700,color:T.text}}>
            {new Date(selectedDate+"T12:00").toLocaleDateString("ro",{weekday:"long",day:"numeric",month:"long"})}
            {selectedDate === todayStr && <span style={{marginLeft:8,fontSize:11,padding:"2px 8px",borderRadius:20,background:T.green,color:"#fff",fontWeight:700}}>{t("home_today")}</span>}
          </div>
          <Btn onClick={openAdd} color={T.green} size="sm">+ {t("cal_add","Adaugă")}</Btn>
        </div>

        {selectedEvents.length === 0 ? (
          <div style={{textAlign:"center",padding:"28px 0",color:T.text3}}>
            <div style={{fontSize:36,marginBottom:8}}>📭</div>
            <div style={{fontSize:13}}>{t("cal_no_events","Nicio programare în această zi")}</div>
            <div style={{fontSize:12,marginTop:4,color:T.text3}}>{t("cal_no_events_hint","Apasă + Adaugă pentru a programa o lucrare")}</div>
          </div>
        ) : selectedEvents.sort((a,b)=>a.time>b.time?1:-1).map(ev => {
          const tp = typeObj(ev.type);
          return (
            <div key={ev.id} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px",borderRadius:10,background:"#fafaf9",border:`1px solid ${T.border}`,marginBottom:8}}>
              <div style={{width:42,height:42,borderRadius:11,background:tp.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{tp.icon}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,color:T.text,fontSize:14,marginBottom:2}}>{ev.title}</div>
                <div style={{fontSize:12,color:T.text2}}>
                  {ev.time && <span>🕐 {ev.time}</span>}
                  {ev.client && <span> · 👤 {ev.client}</span>}
                  {ev.location && <span> · 📍 {ev.location}</span>}
                </div>
                {ev.notes && <div style={{fontSize:11,color:T.text3,marginTop:3,fontStyle:"italic"}}>{ev.notes}</div>}
                <div style={{display:"flex",gap:5,marginTop:6,flexWrap:"wrap"}}>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:tp.color+"18",color:tp.color,fontWeight:700}}>{tp.icon} {tp.label}</span>
                  {ev.recurring!=="none" && <span style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:"#fef3c7",color:"#92400e",fontWeight:700}}>🔁 {ev.recurring==="weekly"?t("cal_weekly","Săptămânal"):t("cal_monthly","Lunar")}</span>}
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:"#ede9fe",color:"#5b21b6",fontWeight:700}}>⏰ -{ev.reminderMin}min</span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <button onClick={()=>openEdit(ev)} style={{fontSize:11,padding:"3px 8px",borderRadius:6,border:`1px solid ${T.border}`,cursor:"pointer",background:"#fff",color:T.text2}}>✏️</button>
                <button onClick={()=>deleteEvent(ev.id)} style={{fontSize:11,padding:"3px 8px",borderRadius:6,border:"1px solid #fecaca",cursor:"pointer",background:"#fef2f2",color:"#dc2626"}}>🗑️</button>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Upcoming events list */}
      {events.filter(ev=>ev.date>=todayStr&&ev.date>selectedDate).sort((a,b)=>a.date>b.date?1:a.time>b.time?1:-1).slice(0,5).length > 0 && (
        <Card style={{padding:"16px 18px",marginTop:12}}>
          <div style={{fontFamily:"Outfit,sans-serif",fontSize:14,fontWeight:700,color:T.text,marginBottom:10}}>📆 {t("cal_coming_soon","Urmează în curând")}</div>
          {events.filter(ev=>ev.date>=todayStr&&ev.date>selectedDate).sort((a,b)=>a.date>b.date?1:a.time>b.time?1:-1).slice(0,5).map(ev=>{
            const tp=typeObj(ev.type);
            const evDate=new Date(ev.date+"T12:00").toLocaleDateString("ro",{weekday:"short",day:"numeric",month:"short"});
            return (
              <div key={ev.id} onClick={()=>setSelectedDate(ev.date)} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 10px",borderRadius:9,cursor:"pointer",marginBottom:6,background:"#fafaf9",border:`1px solid ${T.border}`}}>
                <div style={{width:32,height:32,borderRadius:8,background:tp.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{tp.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.title}</div>
                  <div style={{fontSize:11,color:T.text2}}>{evDate} {ev.time && `· ${ev.time}`} {ev.client && `· ${ev.client}`}</div>
                </div>
                <div style={{fontSize:10,padding:"3px 8px",borderRadius:20,background:tp.color+"18",color:tp.color,fontWeight:700,flexShrink:0}}>{evDate}</div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Add/Edit form modal */}
      {showForm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowForm(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"20px 20px 0 0",padding:"22px 18px 32px",width:"100%",maxWidth:500,maxHeight:"88vh",overflowY:"auto",animation:"slideUp 0.3s ease"}}>
            <div style={{fontFamily:"Outfit,sans-serif",fontSize:16,fontWeight:800,color:T.text,marginBottom:14,textAlign:"center"}}>
              {editId ? `✏️ ${t("cal_edit_title","Editează programare")}` : `➕ ${t("cal_add_title","Programare nouă")}`}
            </div>

            {/* Type selector */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:14}}>
              {SCHEDULE_TYPES.map(tp=>(
                <div key={tp.key} onClick={()=>setForm(f=>({...f,type:tp.key}))} style={{
                  padding:"9px 4px",borderRadius:10,cursor:"pointer",textAlign:"center",
                  background:form.type===tp.key?tp.color+"18":"#fafaf9",
                  border:form.type===tp.key?`2px solid ${tp.color}`:`1.5px solid ${T.border}`,
                  transition:"all 0.15s"
                }}>
                  <div style={{fontSize:22}}>{tp.icon}</div>
                  <div style={{fontSize:10,fontWeight:700,color:form.type===tp.key?tp.color:T.text2,marginTop:2}}>{tp.label}</div>
                </div>
              ))}
            </div>

            {[
              {label:t("cal_f_title","Titlu / Descriere *"), key:"title", ph:t("cal_f_title_ph","ex: Tuns gazon la Vila Ionescu")},
              {label:t("cal_f_client","Client / Proprietar"), key:"client", ph:t("cal_f_client_ph","ex: Familia Popescu")},
              {label:t("cal_f_location","Adresă / Locație"), key:"location", ph:t("cal_f_location_ph","ex: Str. Rozelor 12, Cluj")},
              {label:t("cal_f_notes","Note"), key:"notes", ph:t("cal_f_notes_ph","Detalii suplimentare...")},
            ].map(f=>(
              <div key={f.key} style={{marginBottom:10}}>
                <label style={labelSt}>{f.label}</label>
                <input value={form[f.key]||""} onChange={e=>setForm(v=>({...v,[f.key]:e.target.value}))} placeholder={f.ph} style={inputSt}/>
              </div>
            ))}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div>
                <label style={labelSt}>Data *</label>
                <input type="date" value={form.date} onChange={e=>setForm(v=>({...v,date:e.target.value}))} style={inputSt}/>
              </div>
              <div>
                <label style={labelSt}>Ora</label>
                <input type="time" value={form.time} onChange={e=>setForm(v=>({...v,time:e.target.value}))} style={inputSt}/>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
              <div>
                <label style={labelSt}>{t("cal_recurring","Recurență")}</label>
                <select value={form.recurring} onChange={e=>setForm(v=>({...v,recurring:e.target.value}))} style={{...inputSt}}>
                  <option value="none">{t("cal_once","O singură dată")}</option>
                  <option value="weekly">{t("cal_weekly","Săptămânal")} 🔁</option>
                  <option value="monthly">{t("cal_monthly","Lunar")} 🔁</option>
                </select>
              </div>
              <div>
                <label style={labelSt}>{t("cal_reminder","Alertă înainte")}</label>
                <select value={form.reminderMin} onChange={e=>setForm(v=>({...v,reminderMin:parseInt(e.target.value)}))} style={{...inputSt}}>
                  <option value={15}>15 {t("cal_min","minute")}</option>
                  <option value={30}>30 {t("cal_min","minute")}</option>
                  <option value={60}>1 {t("cal_hour","oră")}</option>
                  <option value={120}>2 {t("cal_hours","ore")}</option>
                  <option value={1440}>1 {t("cal_day_before","zi înainte")}</option>
                </select>
              </div>
            </div>

            <Btn onClick={saveEvent} color={T.green} style={{width:"100%",justifyContent:"center"}} size="lg" disabled={!form.title?.trim()||!form.date}>
              {editId ? `💾 ${t("cal_save","Salvează modificările")}` : `✅ ${t("cal_add_event","Adaugă programare")}`}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN APP — Navigation + React Router
// ══════════════════════════════════════════════════════════════
function ConnectJobApp() {
  const { user, loading: authLoading, logout } = useAuth();
  const { t, i18n } = useTranslation("t");
  const [gs, updateGs] = useGlobalState();
  const [page, setPage] = useState("home");
  const [loadingPage, setLoadingPage] = useState(false);
  const [pwaShow, setPwaShow] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const prevPage = useRef("home");

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
          role: user.role,
        }
      });
    }
  }, [user]);

  // Incarca joburi reale din backend si le pune in globalState
  useEffect(() => {
    if (!user) return;
    api.get("/jobs").then(r => updateGs({ jobs: r.data.jobs || r.data })).catch(()=>{});
  }, [user]);

  const navigate = useCallback((to) => {
    if(to===page) return;
    setLoadingPage(true);
    prevPage.current = page;
    setTimeout(()=>{ setPage(to); setLoadingPage(false); }, 200);
  }, [page]);

  const update = useCallback((patch) => updateGs(patch), [updateGs]);

  const NAV = [
    { key:"home",      icon:"🏠", label:t("nav_home") },
    { key:"jobs",      icon:"🗂️", label:t("nav_jobs") },
    { key:"map",       icon:"🗺️", label:t("nav_map"),      badge: null },
    { key:"chat",      icon:"💬", label:t("nav_chat"),     badge: gs.unreadMessages },
    { key:"escrow",    icon:"🔒", label:t("nav_escrow") },
    { key:"calendar",   icon:"📅", label:t("nav_calendar","Agendă") },
    { key:"contract",  icon:"📝", label:t("nav_contract") },
    { key:"reviews",   icon:"⭐", label:t("nav_reviews") },
    { key:"analytics", icon:"📊", label:t("nav_analytics") },
    { key:"post_job",  icon:"➕", label:t("nav_post_job"),  hidden: gs.user.role !== "employer" },
    { key:"verify",    icon: gs.user.verified?"✅":"🛡️", label: gs.user.verified?t("nav_verified"):t("nav_verify"), badge: gs.user.verified?null:"!" },
    { key:"admin",     icon:"🛡️", label:t("nav_admin"),         hidden: gs.user.role !== "admin" },
  ].filter(item => !item.hidden);

  const PAGE_TITLES = {
    home:      t("nav_home"),
    jobs:      `🗂️ ${t("nav_jobs")}`,
    map:       t("nav_map"),
    chat:      t("nav_chat"),
    escrow:    t("nav_escrow"),
    calendar:  t("nav_calendar","Agendă"),
    contract:  t("nav_contract"),
    reviews:   t("nav_reviews"),
    analytics: t("nav_analytics"),
    post_job:  t("nav_post_job"),
    verify:    t("nav_verify"),
    admin:     `🛡️ ${t("nav_admin")}`,
  };

  const renderPage = () => {
    const props = { gs, update, navigate };
    if(loadingPage) return <Loader text="Se încarcă..."/>;
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
      case "verify":    return <PageVerify    {...props}/>;
      case "admin":     return <PageAdmin     {...props}/>;
      default:          return <PageHome      {...props}/>;
    }
  };

  // Afiseaza spinner cat timp se verifica autentificarea
  if (authLoading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <Loader text="Se incarca..."/>
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
    <div style={{ fontFamily:"DM Sans,sans-serif", background:T.bg, minHeight:"100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap');
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
      <nav style={{ background:"rgba(255,255,255,0.97)",backdropFilter:"blur(14px)",borderBottom:`1.5px solid ${T.border}`,height:58,padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:80,boxShadow:"0 1px 20px rgba(0,0,0,0.05)" }}>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div style={{width:32,height:32,borderRadius:10,background:`linear-gradient(135deg,${T.green},${T.greenLight})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,boxShadow:`0 3px 10px ${T.green}44`}}>⚡</div>
          <span style={{fontFamily:"Outfit,sans-serif",fontWeight:900,fontSize:18,color:T.text,letterSpacing:"-0.02em"}}>Connect<span style={{color:T.green}}>Job</span></span>
        </div>

        {/* Page title */}
        <div style={{fontFamily:"Outfit,sans-serif",fontWeight:700,fontSize:15,color:T.text2}}>
          {PAGE_TITLES[page]}
        </div>

        {/* User area */}
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {/* Notifications */}
          <div style={{position:"relative"}}>
            <button style={{width:34,height:34,borderRadius:9,background:"#f5f5f4",border:`1.5px solid ${T.border}`,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>🔔</button>
            {gs.notifications>0&&<div style={{position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:T.red,border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff"}}>{gs.notifications}</div>}
          </div>
          {/* Avatar */}
          <div style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer"}} onClick={()=>navigate("verify")}>
            <Avatar initials={gs.user.initials} color={T.green} size={32}/>
            <div style={{display:"flex",flexDirection:"column"}}>
              <span style={{fontSize:12,fontWeight:700,color:T.text,lineHeight:1}}>{gs.user.name.split(" ")[0]}</span>
              {gs.user.verified&&<span style={{fontSize:9,color:T.green,fontWeight:600}}>✓ Verificat</span>}
            </div>
          </div>
          {/* Selector de limba */}
          <LanguageSwitcher/>
          {/* Logout */}
          <button onClick={logout} title={t("btn_logout")} style={{width:32,height:32,borderRadius:9,background:"#fef2f2",border:"1.5px solid #fecaca",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>🚪</button>
        </div>
      </nav>

      {/* Main layout */}
      <div style={{display:"flex",minHeight:"calc(100vh - 58px)"}}>

        {/* Sidebar navigation */}
        <aside className="jc-desktop-sidebar" style={{ width:210,flexShrink:0,background:T.white,borderRight:`1.5px solid ${T.border}`,padding:"12px 10px",position:"sticky",top:58,height:"calc(100vh - 58px)",overflowY:"auto" }}>
          <div style={{fontSize:9,fontWeight:700,color:T.text3,textTransform:"uppercase",letterSpacing:"0.1em",padding:"6px 10px",marginBottom:4}}>{t("sidebar_nav_label")}</div>
          {NAV.map(item=>(
            <div key={item.key} onClick={()=>navigate(item.key)}
              style={{
                display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:10,cursor:"pointer",marginBottom:2,
                background:page===item.key?`${T.green}12`:"transparent",
                borderLeft:page===item.key?`3px solid ${T.green}`:"3px solid transparent",
                transition:"all 0.15s",position:"relative",
              }}
              onMouseEnter={e=>{if(page!==item.key)e.currentTarget.style.background="#f5f5f4";}}
              onMouseLeave={e=>{if(page!==item.key)e.currentTarget.style.background="transparent";}}
            >
              <span style={{fontSize:17,flexShrink:0}}>{item.icon}</span>
              <span style={{fontSize:13,fontWeight:page===item.key?700:500,color:page===item.key?T.green:T.text2}}>{item.label}</span>
              {item.badge&&<div style={{marginLeft:"auto",background:item.badge==="!"?T.amber:T.red,color:"#fff",borderRadius:999,minWidth:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700}}>{item.badge}</div>}
            </div>
          ))}

          {/* Quick stats in sidebar */}
          <div style={{marginTop:16,padding:"10px",background:`${T.green}08`,borderRadius:10,border:`1px solid ${T.green}22`}}>
            <div style={{fontSize:10,fontWeight:700,color:T.green,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>{t("sidebar_today")}</div>
            {[{l:t("sidebar_views_label"),v:"47"},{l:t("sidebar_new_msgs"),v:`${gs.unreadMessages}`},{l:t("sidebar_matching"),v:"3"}].map(s=>(
              <div key={s.l} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                <span style={{color:T.text3}}>{s.l}</span>
                <span style={{fontWeight:700,color:T.text}}>{s.v}</span>
              </div>
            ))}
          </div>

          {/* Job selected indicator */}
          {gs.selectedJob&&(
            <div style={{marginTop:10,padding:"9px 10px",background:"#fafaf9",borderRadius:9,border:`1px solid ${T.border}`}}>
              <div style={{fontSize:9,fontWeight:700,color:T.text3,textTransform:"uppercase",marginBottom:5}}>{t("sidebar_selected_job")}</div>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontSize:16}}>{gs.selectedJob.icon}</span>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{gs.selectedJob.title}</div>
                  <div style={{fontSize:10,color:gs.selectedJob.color,fontWeight:600}}>{gs.selectedJob.salary} RON</div>
                </div>
              </div>
              <div style={{display:"flex",gap:5,marginTop:7}}>
                <button onClick={()=>navigate("escrow")} style={{flex:1,padding:"4px",borderRadius:6,border:"none",cursor:"pointer",background:T.green,color:"#fff",fontSize:10,fontWeight:700}}>Escrow</button>
                <button onClick={()=>navigate("contract")} style={{flex:1,padding:"4px",borderRadius:6,border:`1px solid ${T.border}`,cursor:"pointer",background:"#fff",color:T.text2,fontSize:10,fontWeight:600}}>Contract</button>
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
      <nav className="jc-bottom-nav" style={{
        display:"none", position:"fixed", bottom:0, left:0, right:0, zIndex:90,
        background:"rgba(255,255,255,0.97)", backdropFilter:"blur(14px)",
        borderTop:`1.5px solid ${T.border}`, height:60,
        alignItems:"stretch", boxShadow:"0 -4px 20px rgba(0,0,0,0.08)",
      }}>
        {[
          { key:"home",  icon:"🏠", label:t("nav_home") },
          { key:"jobs",  icon:"🗂️", label:"Joburi" },
          { key:"map",   icon:"🗺️", label:t("nav_map") },
          { key:"chat",  icon:"💬", label:t("nav_chat"), badge: gs.unreadMessages },
          { key:"verify",icon: gs.user.verified?"✅":"👤", label:gs.user.verified?"Profil":"Profil" },
        ].map(item=>(
          <button key={item.key} onClick={()=>navigate(item.key)} style={{
            flex:1, background:"none", border:"none", cursor:"pointer",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            gap:2, padding:"4px 0", position:"relative",
            borderTop: page===item.key ? `2px solid ${T.green}` : "2px solid transparent",
            transition:"all 0.15s",
          }}>
            <span style={{ fontSize:20 }}>{item.icon}</span>
            <span style={{ fontSize:10, fontWeight:page===item.key?700:500, color:page===item.key?T.green:T.text3 }}>{item.label}</span>
            {item.badge>0 && <div style={{ position:"absolute",top:6,right:"25%",width:14,height:14,borderRadius:"50%",background:T.red,border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#fff" }}>{item.badge}</div>}
          </button>
        ))}
      </nav>

      {/* ── FLOATING BUTTONS: Carburant + Transport ── */}
      <FuelButton
        defaultFrom={gs.selectedJob ? gs.selectedJob.employer : "Madrid"}
        defaultTo={gs.selectedJob ? gs.selectedJob.title : "Barcelona"}
      />
      <TransportButton
        from={gs.selectedJob ? gs.selectedJob.employer : "Madrid"}
        to={gs.selectedJob ? gs.selectedJob.title : "Barcelona"}
      />
    </div>
  );
}

// Wrapper cu Routes — necesar pentru React Router
// Exportat ca default pentru a fi folosit in index.js
function App() {
  return (
    <Routes>
      <Route path="/login"    element={<Login/>}/>
      <Route path="/register" element={<Register/>}/>
      <Route path="*"         element={<ConnectJobApp/>}/>
    </Routes>
  );
}
export default App;

// ══════════════════════════════════════════════════════════════
//  FUEL CALCULATOR MODULE
// ══════════════════════════════════════════════════════════════

/* ═══════════════════════════════════════════════════════════════
   CONNECTJOB — Calculator Rută & Carburant (ViaMichelin style)
   Buton fix în colțul dreapta-jos, vizibil pe toate paginile
   ═══════════════════════════════════════════════════════════════ */

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

