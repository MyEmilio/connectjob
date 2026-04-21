import { useTranslation } from "react-i18next";
import { T } from "../constants/theme";

export function Avatar({ initials, color=T.green, size=36, online=false }) {
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

export function Btn({ children, onClick, variant="primary", size="md", color=T.green, disabled=false, style={} }) {
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

export function Card({ children, style={}, onClick }) {
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

export function Stars({ rating, size=14 }) {
  return (
    <div style={{ display:"flex", gap:2 }}>
      {[1,2,3,4,5].map(i=>(
        <span key={i} style={{ fontSize:size, color:i<=Math.round(rating)?"#f59e0b":"#e7e5e4" }}>★</span>
      ))}
    </div>
  );
}

export function Badge({ children, color=T.green }) {
  return <span style={{ background:`${color}15`, color, border:`1px solid ${color}33`, borderRadius:999, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{children}</span>;
}

export function Loader({ text="Cargando..." }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 20px", gap:12 }}>
      <div style={{ width:40,height:40,borderRadius:"50%",border:`3px solid ${T.border}`,borderTopColor:T.green,animation:"spin 0.8s linear infinite" }}/>
      <div style={{ fontSize:13, color:T.text3 }}>{text}</div>
    </div>
  );
}

export function Sparkline({ data, color=T.green, height=36 }) {
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

export function JobCardRow({ job, promoted=false, navigate, update, t }) {
  const { t: tFallback } = useTranslation("t");
  const tr = t || tFallback;
  return (
    <div onClick={()=>{ update({selectedJob:job}); navigate("map"); }}
      data-testid={`job-card-${job.id||job._id}`}
      style={{ background:T.white, borderRadius:12, border:promoted?`2px solid ${T.amber}`:`1.5px solid ${T.border}`, padding:"12px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:12, transition:"all 0.15s", boxShadow:promoted?`0 4px 16px ${T.amber}22`:"none", position:"relative" }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor=promoted?T.amber:job.color+"66"; e.currentTarget.style.background="#fafffe"; e.currentTarget.style.boxShadow=`0 4px 16px ${job.color}22`; }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor=promoted?T.amber:T.border; e.currentTarget.style.background=T.white; e.currentTarget.style.boxShadow=promoted?`0 4px 16px ${T.amber}22`:"none"; }}
    >
      {promoted && <div style={{ position:"absolute",top:-7,left:12,background:`linear-gradient(135deg,${T.amber},${T.amberDark})`,color:"#fff",borderRadius:999,padding:"2px 9px",fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.08em" }}>⭐ {tr("home_stats_promoted")}</div>}
      {job.is_demo && <div data-testid="demo-badge" style={{ position:"absolute",top:-7,right:12,background:"linear-gradient(135deg,#94a3b8,#64748b)",color:"#fff",borderRadius:999,padding:"2px 9px",fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.08em" }}>{tr("demo_badge")}</div>}
      <div style={{ width:46,height:46,borderRadius:12,background:`${job.color||T.green}15`,border:`1.5px solid ${job.color||T.green}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0 }}>{job.icon||"💼"}</div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:2 }}>
          <div style={{ fontWeight:700,fontSize:14,color:T.text }}>{job.title}</div>
          {job.urgent&&<Badge color={T.red}>{tr("job_urgent_badge")}</Badge>}
          {job.second_job&&<Badge color={T.blue}>💼 2nd job</Badge>}
        </div>
        <div style={{ fontSize:11,color:T.text3 }}>👤 {job.employer||"—"} · 📂 {job.category||tr("job_diverse_cat")} · {job.type==="full-time"?tr("job_fulltime"):tr("job_parttime")}{job.work_duration?` · ${tr(`work_dur_${job.work_duration}`,job.work_duration)}`:""}</div>
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
