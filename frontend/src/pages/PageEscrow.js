import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { T } from "../constants/theme";
import { Card, Btn } from "../components/shared";
import api from "../services/api";

export default function PageEscrow({ gs, update, navigate }) {
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
  const [stripeMode, setStripeMode] = useState(null);
  const fee=job?Math.round(job.salary*0.03):0;
  const total=job?(job.salary+fee):0;
  const fmt=s=>`${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  useEffect(()=>{if(step===2){const iv=setInterval(()=>setTimer(tc=>tc+1),1000);return()=>clearInterval(iv);}},[step]);
  useEffect(()=>{api.get("/payments/stripe-config").then(r=>setStripeMode(r.data.configured?"live":"demo")).catch(()=>setStripeMode("demo"));},[]);
  if(!job) return (
    <div data-testid="page-escrow" style={{textAlign:"center",padding:"60px 24px",color:T.text2}}>
      <div style={{fontSize:52,marginBottom:14}}>🔒</div>
      <div style={{fontFamily:"Outfit,sans-serif",fontSize:18,fontWeight:700,color:T.text,marginBottom:8}}>{t("nav_escrow")}</div>
      <div style={{fontSize:14,marginBottom:24,color:T.text2}}>{t("escrow_select_job")}</div>
      <Btn onClick={()=>navigate("jobs")} color={T.green} style={{margin:"0 auto"}}>🗂️ {t("nav_jobs")}</Btn>
    </div>
  );

  const fmtCard=v=>v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim();
  const fmtExp=v=>{const c=v.replace(/\D/g,"").slice(0,4);return c.length>2?c.slice(0,2)+"/"+c.slice(2):c;};

  const steps=[t("escrow_step_config"),t("escrow_step_pay"),t("escrow_step_active"),t("escrow_step_done")];

  return (
    <div data-testid="page-escrow" style={{ maxWidth:520, margin:"0 auto", animation:"fadeIn 0.3s ease" }}>
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
            <h3 style={{fontFamily:"Outfit,sans-serif",fontSize:22,fontWeight:800,color:T.text,margin:"0 0 6px"}}>{t("escrow_title")}</h3>
            <p style={{fontSize:13,color:T.text2,lineHeight:1.7}} dangerouslySetInnerHTML={{__html:t("escrow_desc")}}/>
            {stripeMode==="demo"&&<div data-testid="stripe-demo-badge" style={{display:"inline-block",marginTop:8,padding:"4px 12px",borderRadius:99,background:"#fef3c7",border:"1px solid #fde68a",fontSize:11,fontWeight:700,color:"#92400e"}}>⚡ {t("escrow_demo_badge")}</div>}
          </div>
          <div style={{background:"#f0fdf4",borderRadius:14,padding:"14px 16px",marginBottom:18,border:"1px solid #bbf7d0"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <span style={{fontSize:26}}>{job.icon}</span>
              <div><div style={{fontWeight:700,fontSize:14,color:T.text}}>{job.title}</div><div style={{fontSize:12,color:"#057a55"}}>👤 {job.employer}</div></div>
            </div>
            {[{l:t("escrow_salary"),v:`${job.salary} €`},{l:t("escrow_commission"),v:`${fee} €`},{l:t("escrow_total"),v:`${total} €`,bold:true,color:T.green}].map(r=>(
              <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13}}>
                <span style={{color:T.text2}}>{r.l}</span>
                <span style={{fontWeight:r.bold?800:600,color:r.color||T.text,fontSize:r.bold?15:13}}>{r.v}</span>
              </div>
            ))}
          </div>
          {[{i:"🔒",tx:t("escrow_how_1")},{i:"⚡",tx:t("escrow_how_2")},{i:"✅",tx:t("escrow_how_3")},{i:"💸",tx:t("escrow_how_4")}].map(s=>(
            <div key={s.tx} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${T.border}`}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:"#f0fdf4",border:"1px solid #bbf7d0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{s.i}</div>
              <span style={{fontSize:13,color:T.text2}}>{s.tx}</span>
            </div>
          ))}
          <Btn onClick={()=>setStep(1)} color={T.green} style={{width:"100%",justifyContent:"center",marginTop:18}} size="lg">💳 {t("escrow_continue_pay")}</Btn>
        </Card>
      )}

      {step===1&&(
        <Card style={{padding:"24px"}}>
          <h3 style={{fontFamily:"Outfit,sans-serif",fontSize:20,fontWeight:800,color:T.text,margin:"0 0 18px"}}>💳 {t("escrow_payment_method")}</h3>
          <div style={{display:"flex",gap:8,marginBottom:18}}>
            {[{k:"card",l:"💳 Card"},{k:"bank",l:`🏦 ${t("escrow_transfer")}`},{k:"paypal",l:"🔵 PayPal"}].map(m=>(
              <button key={m.k} onClick={()=>setMethod(m.k)} data-testid={`escrow-method-${m.k}`} style={{flex:1,padding:"10px 6px",borderRadius:11,cursor:"pointer",border:method===m.k?`2px solid ${T.green}`:`1.5px solid ${T.border}`,background:method===m.k?"#f0fdf4":"#fafaf9",fontSize:13,fontWeight:700,color:method===m.k?T.green:T.text2,transition:"all 0.2s"}}>{m.l}</button>
            ))}
          </div>
          {method==="card"&&(
            <div style={{marginBottom:18}}>
              <div style={{background:`linear-gradient(135deg,${T.dark},${T.dark2})`,borderRadius:14,padding:"18px",marginBottom:14,height:90,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:-16,right:-16,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.05)"}}/>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.1em"}}>{t("escrow_card_number")}</div>
                <div style={{fontSize:17,fontFamily:"monospace",color:"#fff",letterSpacing:"0.12em",fontWeight:700}}>{card.num||"•••• •••• •••• ••••"}</div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:11}}>
                  <span style={{color:"rgba(255,255,255,0.4)"}}>{t("escrow_expires")}: <span style={{color:"#fff"}}>{card.exp||"MM/YY"}</span></span>
                  <span style={{color:"rgba(255,255,255,0.6)",fontWeight:700}}>VISA</span>
                </div>
              </div>
              {[{l:t("escrow_card_number"),v:card.num,set:v=>setCard(c=>({...c,num:fmtCard(v)})),ph:"1234 5678 9012 3456"},{l:t("escrow_expires"),v:card.exp,set:v=>setCard(c=>({...c,exp:fmtExp(v)})),ph:"MM/YY"},{l:"CVV",v:card.cvv,set:v=>setCard(c=>({...c,cvv:v.slice(0,3)})),ph:"•••",type:"password"}].map(f=>(
                <div key={f.l} style={{marginBottom:10}}>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:T.text2,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>{f.l}</label>
                  <input value={f.v} onChange={e=>f.set(e.target.value)} placeholder={f.ph} type={f.type||"text"} style={{width:"100%",height:42,borderRadius:9,border:`1.5px solid ${T.border}`,padding:"0 12px",fontSize:14,fontFamily:"DM Sans,sans-serif",outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.border=`1.5px solid ${T.green}`} onBlur={e=>e.target.style.border=`1.5px solid ${T.border}`}/>
                </div>
              ))}
            </div>
          )}
          {method==="bank"&&(
            <div style={{background:"#fafaf9",borderRadius:12,padding:"14px",marginBottom:18,border:`1px solid ${T.border}`}}>
              {[{l:"IBAN",v:"ES91 2100 0418 4502 0005 1332"},{l:t("escrow_beneficiary"),v:"ConnectJob SL"},{l:t("escrow_reference"),v:"ESC-2026-001234"},{l:t("escrow_amount"),v:`${total} €`}].map(r=>(
                <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}`,fontSize:13}}>
                  <span style={{color:T.text3}}>{r.l}</span><span style={{fontWeight:600,color:T.text}}>{r.v}</span>
                </div>
              ))}
            </div>
          )}
          {method==="paypal"&&<div style={{textAlign:"center",padding:"20px",background:"#f0f7ff",borderRadius:12,marginBottom:18}}><div style={{fontSize:36,marginBottom:8}}>🔵</div><div style={{fontSize:14,fontWeight:600,color:"#003087"}}>{t("escrow_paypal_redirect")}</div></div>}
          <div style={{background:"#fef3c7",borderRadius:9,padding:"9px 13px",marginBottom:14,border:"1px solid #fde68a",display:"flex",gap:8}}>
            <span>🔒</span><span style={{fontSize:12,color:"#92400e"}} dangerouslySetInnerHTML={{__html:t("escrow_secure_note")}}/>
          </div>
          <Btn data-testid="escrow-pay-btn" onClick={async()=>{
            setLoading(true); setApiMsg("");
            try {
              const res = await api.post("/payments/create-intent",{
                job_id: job.id, payee_id: job.employer_id || 1, amount: job.salary, method
              });
              setPaymentId(res.data.payment_id);
              if (res.data.message) setApiMsg(res.data.message);
              setStep(2);
            } catch(e){ setApiMsg(e.response?.data?.error||t("escrow_error")); }
            finally { setLoading(false); }
          }} disabled={loading} color={T.green} style={{width:"100%",justifyContent:"center"}} size="lg">
            {loading?`⏳ ${t("escrow_processing")}`:`🔒 ${t("escrow_lock_amount",{amount:total})}`}
          </Btn>
          {apiMsg && <div style={{marginTop:8,fontSize:12,color:"#92400e",background:"#fef3c7",borderRadius:8,padding:"6px 10px"}}>{apiMsg}</div>}
        </Card>
      )}

      {step===2&&(
        <Card style={{padding:"24px",border:`2px solid ${T.green}`}}>
          <div style={{textAlign:"center",marginBottom:18}}>
            <div style={{fontSize:44,marginBottom:10}}>⚡</div>
            <h3 style={{fontFamily:"Outfit,sans-serif",fontSize:20,fontWeight:800,color:T.text,margin:"0 0 6px"}}>{t("escrow_task_active")}</h3>
            <div style={{fontFamily:"monospace",fontSize:26,fontWeight:800,color:T.green,background:"#f0fdf4",borderRadius:10,padding:"8px 18px",display:"inline-block",border:"2px solid #bbf7d0"}}>⏱ {fmt(timer)}</div>
          </div>
          <div style={{background:"#f0fdf4",borderRadius:12,padding:"14px",marginBottom:16,border:"1px solid #bbf7d0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontWeight:700,color:"#065f46",fontSize:13}}>💰 {t("escrow_locked_funds")}</span>
              <span style={{fontSize:20,fontWeight:800,color:T.green,fontFamily:"Outfit,sans-serif"}}>{total} €</span>
            </div>
            <div style={{height:6,borderRadius:999,background:"#bbf7d0",overflow:"hidden"}}>
              <div style={{height:"100%",background:T.green,borderRadius:999,width:`${Math.min((timer/3600)*100,100)}%`,transition:"width 1s"}}/>
            </div>
          </div>
          {[{l:t("escrow_status_locked"),d:true},{l:t("escrow_status_confirmed"),d:true},{l:t("escrow_status_executing"),d:timer>0},{l:t("escrow_status_confirm_done"),d:false},{l:t("escrow_status_released"),d:false}].map(s=>(
            <div key={s.l} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 0",borderBottom:`1px solid ${T.border}`}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:s.d?T.green:"#f5f5f4",border:s.d?"none":`2px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff",flexShrink:0}}>{s.d?"✓":""}</div>
              <span style={{fontSize:13,color:s.d?T.green:T.text3,fontWeight:s.d?600:400}}>{s.l}</span>
            </div>
          ))}
          <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:16}}>
            <Btn data-testid="escrow-release-btn" onClick={async()=>{
              setLoading(true);
              try {
                if (paymentId) await api.post(`/payments/${paymentId}/release`);
                setStep(3); update({escrowActive:null});
              } catch(e){ setApiMsg(e.response?.data?.error||t("escrow_error")); }
              finally { setLoading(false); }
            }} disabled={loading} color={T.green} style={{width:"100%",justifyContent:"center"}} size="lg">
              {loading?`⏳ ${t("escrow_processing")}`:`✅ ${t("escrow_confirm_release")}`}
            </Btn>
            <Btn onClick={async()=>{
              if (paymentId) await api.post(`/payments/${paymentId}/dispute`).catch(()=>{});
              setDisputed(true);
            }} variant="outline" style={{width:"100%",justifyContent:"center",borderColor:"#fecaca",color:T.red,background:"#fef2f2"}} size="md">⚠️ {t("escrow_open_dispute")}</Btn>
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
            <Btn onClick={()=>navigate("reviews")} color={T.amber} style={{flex:1,justifyContent:"center"}}>⭐ {t("escrow_leave_review")}</Btn>
            <Btn onClick={()=>navigate("home")} variant="outline" style={{flex:1,justifyContent:"center"}}>🏠 {t("nav_home")}</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
