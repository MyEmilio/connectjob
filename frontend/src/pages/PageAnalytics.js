import { useState } from "react";
import { useTranslation } from "react-i18next";
import { T } from "../constants/theme";
import { Card, Badge, Btn, Sparkline } from "../components/shared";

export default function PageAnalytics({ gs }) {
  const { t } = useTranslation("t");
  const [period,setPeriod]=useState("7z");
  const d7={views:[12,18,15,22,30,28,35],apps:[2,3,2,4,6,5,8]};
  const d30={views:[45,52,38,61,55,70,48,65,72,80,55,68,74,90,82,95,78,88,100,92,85,110,98,105,92,88,115,108,120,118],apps:[8,10,7,12,9,14,8,13,15,16,10,12,14,18,16,19,14,17,20,18,16,22,19,21,18,17,23,21,24,23]};
  const d=period==="7z"?d7:d30;

  return (
    <div data-testid="page-analytics" style={{animation:"fadeIn 0.3s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{fontFamily:"Outfit,sans-serif",fontSize:24,fontWeight:800,color:T.text,margin:"0 0 4px"}}>{t("analytics_employer_title")}</h2>
          <p style={{fontSize:13,color:T.text3,margin:0}}>{t("analytics_realtime_desc")}</p>
        </div>
        <div style={{display:"flex",background:"#f5f5f4",borderRadius:9,padding:3,gap:2}}>
          {[{k:"7z",l:t("analytics_7days")},{k:"30z",l:t("analytics_30days")}].map(p=>(
            <button key={p.k} onClick={()=>setPeriod(p.k)} data-testid={`analytics-period-${p.k}`} style={{padding:"7px 14px",borderRadius:7,border:"none",cursor:"pointer",background:period===p.k?T.white:"transparent",color:period===p.k?T.text:T.text3,fontWeight:700,fontSize:12,fontFamily:"DM Sans,sans-serif",boxShadow:period===p.k?"0 1px 4px rgba(0,0,0,0.08)":"none",transition:"all 0.2s"}}>{p.l}</button>
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

      <Card>
        <div style={{padding:"16px 20px 12px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h3 style={{fontFamily:"Outfit,sans-serif",fontSize:16,fontWeight:700,color:T.text,margin:0}}>{t("analytics_perf_title")}</h3>
          <Btn color={T.green} size="sm">+ Job nou</Btn>
        </div>
        {(gs.jobs||[]).slice(0,4).map((job,i)=>(
          <div key={job.id||job._id||i} style={{padding:"14px 20px",borderBottom:i<3?`1px solid ${T.border}`:"none",cursor:"pointer",transition:"background 0.12s"}}
            onMouseEnter={e=>e.currentTarget.style.background="#fafffe"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}
          >
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,borderRadius:9,background:`${job.color||T.green}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{job.icon||"💼"}</div>
                <div><div style={{fontWeight:700,fontSize:14,color:T.text,fontFamily:"Outfit,sans-serif"}}>{job.title}</div><div style={{fontSize:11,color:T.text3}}>📋 {job.category} · {job.salary} {t("analytics_per_day")}</div></div>
              </div>
              <Badge color={T.green}>● activ</Badge>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {[{l:t("analytics_views"),v:(job.rating||0)*50|0,c:T.blue},{l:t("analytics_applications"),v:job.reviews||0,c:T.green},{l:t("analytics_contacts"),v:Math.round((job.reviews||0)*0.3),c:T.purple},{l:t("analytics_conversion"),v:`${((job.reviews||0)/((job.rating||1)*50)*100).toFixed(1)}%`,c:T.amber}].map(m=>(
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
