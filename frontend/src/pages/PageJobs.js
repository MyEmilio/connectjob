import { useState } from "react";
import { useTranslation } from "react-i18next";
import { T, CATEGORIES } from "../constants/theme";
import { Btn, Card, Badge, JobCardRow } from "../components/shared";

export default function PageJobs({ gs, update, navigate }) {
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
    if (catKey === "diverse") return !CATEGORIES.some(c => { const jc = (job.category||"").toLowerCase(); return jc === c.key || jc === c.label.toLowerCase() || c.label.toLowerCase().includes(jc) || jc.includes(c.key); });
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

  const diverseJobs = category === "Toate" ? allJobs.filter(j => !CATEGORIES.some(c => { const jc = (j.category||"").toLowerCase(); return jc === c.key || jc === c.label.toLowerCase() || c.label.toLowerCase().includes(jc) || jc.includes(c.key); })) : [];

  const FilterToggle = ({active, onClick, children, color=T.green}) => (
    <button onClick={onClick} style={{ padding:"5px 12px",borderRadius:999,border:"none",cursor:"pointer",background:active?color:"#f5f5f4",color:active?"#fff":T.text2,fontSize:11,fontWeight:600,transition:"all 0.15s",whiteSpace:"nowrap" }}>{children}</button>
  );

  return (
    <div data-testid="page-jobs" style={{ animation:"fadeIn 0.3s ease" }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap" }}>
          <h1 style={{ fontFamily:"Outfit,sans-serif",fontSize:22,fontWeight:800,color:T.text,margin:0 }}>
            {selectedCatObj ? `${selectedCatObj.icon} ${t(`cat_${selectedCatObj.key}`,{defaultValue:selectedCatObj.label})}` : category==="diverse"?t("jobs_title_diverse"):t("jobs_title_all")}
          </h1>
          <Badge color={T.green}>{sorted.length} {t("jobs_ads_label")}</Badge>
          {gs.user.role === "employer" && <Btn size="sm" color={T.green} onClick={()=>navigate("post_job")} style={{marginLeft:"auto"}}>{t("jobs_post_btn")}</Btn>}
        </div>
        <div style={{ position:"relative",marginBottom:12 }}>
          <div style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:16 }}>🔍</div>
          <input value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder={t("jobs_search_ph")} style={{ width:"100%",height:44,borderRadius:12,border:`1.5px solid ${T.border}`,paddingLeft:40,paddingRight:16,fontSize:14,fontFamily:"DM Sans,sans-serif",outline:"none",boxSizing:"border-box",background:T.white }} onFocus={e=>e.target.style.border=`1.5px solid ${T.green}`} onBlur={e=>e.target.style.border=`1.5px solid ${T.border}`}/>
        </div>
        <div style={{ overflowX:"auto",paddingBottom:4,marginBottom:10 }}>
          <div style={{ display:"flex",gap:6,minWidth:"max-content" }}>
            <FilterToggle active={category==="Toate"} onClick={()=>{setCategory("Toate");setSubcategory("");}}>{t("jobs_all_tab")}</FilterToggle>
            {CATEGORIES.map(cat=>(<FilterToggle key={cat.key} active={category===cat.key} onClick={()=>{setCategory(cat.key);setSubcategory("");}} color={cat.color}>{cat.icon} {t(`cat_${cat.key}`,{defaultValue:cat.label})}</FilterToggle>))}
            <FilterToggle active={category==="diverse"} onClick={()=>{setCategory("diverse");setSubcategory("");}} color={T.text3}>{t("jobs_diverse_tab")}</FilterToggle>
          </div>
        </div>
        {selectedCatObj && (
          <div style={{ display:"flex",gap:5,flexWrap:"wrap",marginBottom:10 }}>
            <button onClick={()=>setSubcategory("")} style={{ padding:"3px 10px",borderRadius:999,border:`1px solid ${subcategory===""?selectedCatObj.color:T.border}`,cursor:"pointer",background:subcategory===""?`${selectedCatObj.color}15`:"transparent",color:subcategory===""?selectedCatObj.color:T.text3,fontSize:11,fontWeight:600 }}>{t("jobs_all_tab")}</button>
            {(t(`cat_${selectedCatObj.key}_sub`,{returnObjects:true,defaultValue:selectedCatObj.sub})||selectedCatObj.sub).map(s=>(<button key={s} onClick={()=>setSubcategory(subcategory===s?"":s)} style={{ padding:"3px 10px",borderRadius:999,border:`1px solid ${subcategory===s?selectedCatObj.color:T.border}`,cursor:"pointer",background:subcategory===s?`${selectedCatObj.color}15`:"transparent",color:subcategory===s?selectedCatObj.color:T.text3,fontSize:11 }}>{s}</button>))}
          </div>
        )}
        <Card style={{ padding:"10px 14px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
            <span style={{ fontSize:11,fontWeight:700,color:T.text3,textTransform:"uppercase",letterSpacing:"0.06em",whiteSpace:"nowrap" }}>{t("jobs_filters_label")}</span>
            <FilterToggle active={urgent} onClick={()=>setUrgent(!urgent)} color={T.red}>{t("jobs_urgent_filter")}</FilterToggle>
            <FilterToggle active={secondJob} onClick={()=>setSecondJob(!secondJob)} color={T.blue}>{t("jobs_second_filter")}</FilterToggle>
            <div style={{ display:"flex",gap:4 }}>
              {[{k:"",l:t("jobs_any_duration")},{k:"ore",l:t("jobs_hours")},{k:"zile",l:t("jobs_days")},{k:"permanent",l:t("jobs_permanent")}].map(opt=>(<button key={opt.k} onClick={()=>setWorkDuration(opt.k)} style={{ padding:"4px 10px",borderRadius:999,border:`1px solid ${workDuration===opt.k?T.green:T.border}`,cursor:"pointer",background:workDuration===opt.k?`${T.green}15`:"transparent",color:workDuration===opt.k?T.green:T.text3,fontSize:11,fontWeight:600 }}>{opt.l}</button>))}
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
      {promotedInView.length>0&&(<div style={{marginBottom:20}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><h3 style={{fontFamily:"Outfit,sans-serif",fontSize:15,fontWeight:700,color:T.amber,margin:0}}>{t("jobs_promoted_section")}</h3><div style={{flex:1,height:1,background:`${T.amber}44`}}/></div><div style={{display:"flex",flexDirection:"column",gap:8}}>{promotedInView.map(job=><JobCardRow key={job.id||job._id} job={job} promoted navigate={navigate} update={update} t={t}/>)}</div></div>)}
      {urgentInView.length>0&&(<div style={{marginBottom:20}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><h3 style={{fontFamily:"Outfit,sans-serif",fontSize:15,fontWeight:700,color:T.red,margin:0}}>{t("jobs_urgent_section")}</h3><div style={{flex:1,height:1,background:`${T.red}44`}}/></div><div style={{display:"flex",flexDirection:"column",gap:8}}>{urgentInView.map(job=><JobCardRow key={job.id||job._id} job={job} navigate={navigate} update={update} t={t}/>)}</div></div>)}
      <div>
        {regularInView.length>0 ? (<><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><h3 style={{fontFamily:"Outfit,sans-serif",fontSize:15,fontWeight:700,color:T.text,margin:0}}>{t("jobs_regular_section")}</h3><div style={{flex:1,height:1,background:T.border}}/></div><div style={{display:"flex",flexDirection:"column",gap:8}}>{regularInView.map(job=><JobCardRow key={job.id||job._id} job={job} navigate={navigate} update={update} t={t}/>)}</div></>) : sorted.length===0&&(
          <div style={{textAlign:"center",padding:"60px 20px",color:T.text3}}><div style={{fontSize:48,marginBottom:12}}>🔍</div><div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:8}}>{t("jobs_no_results_title")}</div><div style={{fontSize:13}}>{t("jobs_no_results_sub")}</div><Btn onClick={()=>{setCategory("Toate");setUrgent(false);setWorkDuration("");setSecondJob(false);setSearchText("");}} variant="outline" size="sm" style={{marginTop:16}}>{t("jobs_reset_filters")}</Btn></div>
        )}
      </div>
      {category==="Toate"&&diverseJobs.length>0&&(
        <div style={{marginTop:28}}><div style={{background:"linear-gradient(135deg,#f8fafc,#f1f5f9)",borderRadius:16,border:`1.5px dashed ${T.border}`,padding:"16px 20px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div><h3 style={{fontFamily:"Outfit,sans-serif",fontSize:16,fontWeight:700,color:T.text,margin:"0 0 4px"}}>{t("jobs_diverse_title")}</h3><p style={{fontSize:12,color:T.text3,margin:0}}>{t("jobs_diverse_desc")}</p></div><Badge color={T.text3}>{diverseJobs.length} {t("jobs_ads_label")}</Badge></div><div style={{display:"flex",flexDirection:"column",gap:8}}>{diverseJobs.map(job=><JobCardRow key={job.id||job._id} job={job} navigate={navigate} update={update} t={t}/>)}</div></div></div>
      )}
    </div>
  );
}
