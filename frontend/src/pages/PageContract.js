import { useState } from "react";
import { useTranslation } from "react-i18next";
import { T } from "../constants/theme";
import { Card, Btn } from "../components/shared";
import api from "../services/api";

export default function PageContract({ gs, update, navigate }) {
  const { t } = useTranslation("t");
  const job=gs.selectedJob||(gs.jobs||[])[0];
  const [step,setStep]=useState(0);
  const [name,setName]=useState("");
  const [agree,setAgree]=useState(false);
  const [loading,setLoading]=useState(false);
  const [contractDbId, setContractDbId]=useState(null);
  const [apiError, setApiError]=useState("");
  if(!job) return (
    <div data-testid="page-contract" style={{textAlign:"center",padding:"60px 24px",color:T.text2}}>
      <div style={{fontSize:52,marginBottom:14}}>📝</div>
      <div style={{fontFamily:"Outfit,sans-serif",fontSize:18,fontWeight:700,color:T.text,marginBottom:8}}>Ningún trabajo seleccionado</div>
      <div style={{fontSize:14,marginBottom:24,color:T.text2}}>{t("contract_select_job")}</div>
      <Btn onClick={()=>navigate("jobs")} color={T.green} style={{margin:"0 auto"}}>🗂️ Buscar empleos</Btn>
    </div>
  );
  const date=new Date().toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"});
  const contractId=`JC-${Date.now().toString().slice(-6)}`;

  return (
    <div data-testid="page-contract" style={{maxWidth:600,margin:"0 auto",animation:"fadeIn 0.3s ease"}}>
      {step===0&&(
        <Card style={{overflow:"hidden"}}>
          <div style={{background:`linear-gradient(135deg,${T.dark},${T.dark2})`,padding:"22px 26px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3}}>{t("contract_services_title")}</div>
              <div style={{fontFamily:"Outfit,sans-serif",fontSize:18,fontWeight:800,color:"#f1f5f9"}}>ConnectJob</div>
              <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Nº {contractId}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:10,color:"#64748b"}}>Fecha de emisión</div>
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
            {[{n:"1.",title:t("contract_clause1_title"),tx:`El prestador se compromete a ejecutar el servicio de ${job.title} conforme a los requisitos del empleador.`},{n:"2.",title:t("contract_clause2_title"),tx:`La suma de ${job.salary} € será pagada a través de Escrow ConnectJob después de la confirmación.`},{n:"3.",title:t("contract_clause3_title"),tx:t("contract_clause3_text")},{n:"4.",title:t("contract_clause4_title"),tx:t("contract_clause4_text")},{n:"5.",title:t("contract_clause5_title"),tx:t("contract_clause5_text")}].map(c=>(
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
            <input data-testid="contract-name-input" value={name} onChange={e=>setName(e.target.value)} placeholder={t("contract_fullname_ph")} style={{width:"100%",height:52,borderRadius:11,border:`1.5px solid ${T.border}`,padding:"0 16px",fontSize:20,fontFamily:"Georgia,serif",color:T.text,outline:"none",boxSizing:"border-box",fontStyle:"italic"}} onFocus={e=>e.target.style.border=`1.5px solid ${T.green}`} onBlur={e=>e.target.style.border=`1.5px solid ${T.border}`}/>
            {name&&<div style={{marginTop:8,padding:"10px 14px",background:"#fafaf9",borderRadius:9,border:"1px dashed #d1d5db",fontFamily:"Georgia,serif",fontSize:22,color:T.text,fontStyle:"italic",textAlign:"center"}}>{name}</div>}
          </div>
          <div onClick={()=>setAgree(!agree)} data-testid="contract-agree-checkbox" style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:18,cursor:"pointer",padding:"11px",borderRadius:9,background:agree?"#f0fdf4":"#fafaf9",border:agree?"1px solid #bbf7d0":`1px solid ${T.border}`,transition:"all 0.2s"}}>
            <div style={{width:19,height:19,borderRadius:5,flexShrink:0,marginTop:1,background:agree?T.green:T.white,border:agree?"none":`2px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff"}}>{agree?"✓":""}</div>
            <span style={{fontSize:12,color:T.text2,lineHeight:1.6}}>{t("contract_confirm_terms")}</span>
          </div>
          <Btn data-testid="contract-sign-btn" onClick={async()=>{
            if(!name.trim()||!agree) return;
            setLoading(true); setApiError("");
            try {
              let cid = contractDbId;
              if (!cid) {
                const res = await api.post("/contracts",{ job_id: job.id||1, worker_id: gs.user.id||1, content: contractId });
                cid = res.data.id; setContractDbId(cid);
              }
              await api.post(`/contracts/${cid}/sign`,{ signature: name });
              setStep(2); update({signedContracts:[...(gs.signedContracts||[]),contractId]});
            } catch(e){ setApiError(e.response?.data?.error||"Error al firmar"); }
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
            <Btn color={T.green} style={{flex:1,justifyContent:"center"}}>📥 Descargar PDF</Btn>
            <Btn onClick={()=>navigate("escrow")} variant="outline" style={{flex:1,justifyContent:"center"}}>🔒 Ir a Escrow</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
