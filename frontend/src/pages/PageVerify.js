import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { T } from "../constants/theme";
import { Card, Btn, Avatar } from "../components/shared";
import api from "../services/api";

export default function PageVerify({ gs, update, navigate }) {
  const { t } = useTranslation("t");
  const [step,setStep]=useState(gs.user.verified?4:0);
  const [phone,setPhone]=useState("");
  const [otp,setOtp]=useState(["","","","","",""]);
  const [otpSent,setOtpSent]=useState(false);
  const [otpTimer,setOtpTimer]=useState(0);
  const [docType,setDocType]=useState("");
  const [docOk,setDocOk]=useState(false);
  const [loading,setLoading]=useState(false);
  const fileRef=useRef(null);
  const videoRef=useRef(null);
  const timerRef=useRef(null);
  useEffect(()=>{if(otpTimer>0){timerRef.current=setTimeout(()=>setOtpTimer(t=>t-1),1000);}return()=>clearTimeout(timerRef.current);},[otpTimer]);

  const steps=[t("verify_step1"),t("verify_step2"),t("verify_step3"),t("verify_step4")];

  if(step===4||gs.user.verified) return (
    <div data-testid="page-verify" style={{maxWidth:480,margin:"0 auto",textAlign:"center",padding:"60px 20px",animation:"fadeIn 0.3s ease"}}>
      <div style={{fontSize:72,marginBottom:16}}>✅</div>
      <h2 style={{fontFamily:"Outfit,sans-serif",fontSize:28,fontWeight:800,color:T.text,margin:"0 0 10px"}}>{t("verify_success_title")}</h2>
      <p style={{fontSize:15,color:T.text2,marginBottom:24}}>{t("verify_success_msg")}</p>
      <div style={{display:"inline-flex",alignItems:"center",gap:12,background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",border:`2px solid ${T.green}`,borderRadius:14,padding:"14px 22px",marginBottom:24}}>
        <Avatar initials={gs.user.initials} color={T.green} size={46}/>
        <div style={{textAlign:"left"}}>
          <div style={{fontWeight:700,fontSize:16,color:T.text,fontFamily:"Outfit,sans-serif"}}>{gs.user.name}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
            <span style={{background:T.green,color:"#fff",borderRadius:999,padding:"1px 9px",fontSize:11,fontWeight:700}}>✓ Verificado</span>
          </div>
        </div>
      </div>
      <Btn onClick={()=>navigate("home")} color={T.green} size="lg" style={{width:"100%",justifyContent:"center"}}>🏠 Volver al inicio</Btn>
    </div>
  );

  return (
    <div data-testid="page-verify" style={{maxWidth:480,margin:"0 auto",animation:"fadeIn 0.3s ease"}}>
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
          <div style={{textAlign:"center",marginBottom:22}}><div style={{fontSize:44,marginBottom:10}}>🛡️</div><h3 style={{fontFamily:"Outfit,sans-serif",fontSize:20,fontWeight:800,color:T.text,margin:"0 0 6px"}}>Verificación de Identidad</h3><p style={{fontSize:13,color:T.text2}}>{t("verify_get_badge")} <strong>3x</strong> {t("verify_3x")}</p></div>
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
                  <div style={{padding:"0 12px",background:"#f5f5f4",borderRadius:9,border:`1.5px solid ${T.border}`,display:"flex",alignItems:"center",fontSize:14,fontWeight:600,whiteSpace:"nowrap"}}>🇪🇸 +34</div>
                  <input data-testid="verify-phone-input" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))} placeholder="612 345 678" maxLength={9} style={{flex:1,height:44,borderRadius:9,border:`1.5px solid ${T.border}`,padding:"0 12px",fontSize:15,fontFamily:"DM Sans,sans-serif",outline:"none",letterSpacing:"0.1em"}} onFocus={e=>e.target.style.border=`1.5px solid ${T.green}`} onBlur={e=>e.target.style.border=`1.5px solid ${T.border}`}/>
                </div>
              </div>
              <Btn data-testid="verify-send-otp-btn" onClick={async()=>{
                if(phone.length<9)return; setLoading(true);
                try {
                  const res = await api.post("/kyc/send-otp",{ phone:`+34${phone}` });
                  if(res.data.demo_code) alert(`📱 Código demo (solo desarrollo): ${res.data.demo_code}`);
                  setOtpSent(true); setOtpTimer(60);
                } catch(e){ alert(e.response?.data?.error||"Error al enviar SMS"); }
                finally{ setLoading(false); }
              }} disabled={phone.length<9||loading} color={T.green} style={{width:"100%",justifyContent:"center"}} size="lg">{loading?t("verify_sending_sms"):t("verify_send_sms_btn")}</Btn>
            </>
          ):(
            <>
              <p style={{fontSize:13,color:"#057a55",textAlign:"center",marginBottom:14,background:"#f0fdf4",borderRadius:8,padding:"7px",border:"1px solid #bbf7d0"}}>{t("verify_code_sent")} +34 {phone}</p>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:T.text2,textTransform:"uppercase",marginBottom:9}}>{t("verify_code_lbl")}</label>
                <div style={{display:"flex",gap:7,justifyContent:"center"}}>
                  {otp.map((v,i)=>(
                    <input key={i} id={`otp-${i}`} data-testid={`verify-otp-${i}`} value={v} maxLength={1} onChange={e=>{const n=[...otp];n[i]=e.target.value.slice(-1);setOtp(n);if(e.target.value&&i<5)document.getElementById(`otp-${i+1}`)?.focus();}} style={{width:42,height:50,borderRadius:9,textAlign:"center",border:`1.5px solid ${v?T.green:T.border}`,fontSize:20,fontWeight:800,fontFamily:"Outfit,sans-serif",outline:"none",background:v?"#f0fdf4":"#fff",color:T.text}}/>
                  ))}
                </div>
                {otpTimer>0&&<p style={{fontSize:12,color:T.text3,textAlign:"center",marginTop:7}}>{t("verify_resend_timer")} {otpTimer}s</p>}
              </div>
              <Btn data-testid="verify-check-otp-btn" onClick={async()=>{
                const code = otp.join("");
                if(code.length<6)return; setLoading(true);
                try {
                  await api.post("/kyc/verify-otp",{ phone:`+34${phone}`, code });
                  setStep(2);
                } catch(e){ alert(e.response?.data?.error||"Código inválido o expirado"); }
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
              <button key={d.k} onClick={()=>setDocType(d.k)} data-testid={`verify-doc-${d.k}`} style={{flex:1,padding:"9px 4px",borderRadius:10,cursor:"pointer",border:docType===d.k?`2px solid ${T.green}`:`1.5px solid ${T.border}`,background:docType===d.k?"#f0fdf4":"#fafaf9",fontSize:12,fontWeight:700,color:docType===d.k?T.green:T.text2,transition:"all 0.2s"}}>{d.l}</button>
            ))}
          </div>
          <input type="file" ref={fileRef} accept="image/*,.pdf" style={{display:"none"}} onChange={async(e)=>{
            const file=e.target.files[0]; if(!file)return;
            setLoading(true);
            try {
              const fd=new FormData(); fd.append("document",file);
              await api.post("/kyc/upload-document",fd,{headers:{"Content-Type":"multipart/form-data"}});
              setDocOk(true);
            } catch{ alert("Error al subir el documento"); }
            finally{ setLoading(false); }
          }}/>
          <div onClick={()=>!docOk&&fileRef.current?.click()} data-testid="verify-upload-doc" style={{border:docOk?`2px solid ${T.green}`:`2px dashed ${T.border}`,borderRadius:12,padding:"26px 18px",textAlign:"center",cursor:docOk?"default":"pointer",background:docOk?"#f0fdf4":"#fafaf9",marginBottom:18,transition:"all 0.2s"}}
            onMouseEnter={e=>{if(!docOk)e.currentTarget.style.borderColor=T.green;}}
            onMouseLeave={e=>{if(!docOk)e.currentTarget.style.borderColor=T.border;}}
          >
            {loading?<div><div style={{fontSize:28,animation:"spin 1s linear infinite"}}>⏳</div><div style={{fontSize:13,color:"#057a55",marginTop:6}}>{t("verify_processing")}</div></div>:docOk?<div><div style={{fontSize:36}}>✅</div><div style={{fontSize:13,fontWeight:700,color:T.green,marginTop:6}}>{t("verify_doc_uploaded")}</div></div>:<div><div style={{fontSize:32}}>📤</div><div style={{fontSize:13,fontWeight:600,color:T.text,marginTop:8}}>{t("verify_upload_click")}</div><div style={{fontSize:11,color:T.text3,marginTop:3}}>{t("verify_upload_formats")}</div></div>}
          </div>
          {docOk&&<Btn data-testid="verify-continue-selfie" onClick={()=>setStep(3)} color={T.green} style={{width:"100%",justifyContent:"center"}} size="lg">{t("verify_continue_selfie")}</Btn>}
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
            {loading&&<div style={{position:"absolute",inset:0,background:"rgba(5,150,105,0.9)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><div style={{fontSize:32,marginBottom:8}}>🔍</div><div style={{color:"#fff",fontWeight:700,fontSize:14}}>Analizando...</div></div>}
          </div>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            {[t("verify_tip_light"),t("verify_tip_camera"),t("verify_tip_neutral")].map(tip=><div key={tip} style={{flex:1,fontSize:10,color:"#057a55",background:"#f0fdf4",borderRadius:7,padding:"5px 3px",textAlign:"center",border:"1px solid #bbf7d0"}}>{tip}</div>)}
          </div>
          <Btn data-testid="verify-selfie-btn" onClick={async()=>{
            if(videoRef.current?.srcObject){videoRef.current.srcObject.getTracks().forEach(t=>t.stop());}
            setLoading(true);
            try {
              await api.post("/kyc/complete");
              let s=0;
              const iv=setInterval(()=>{s+=3;if(s>=96){clearInterval(iv);setStep(4);update({user:{...gs.user,verified:true}});}},30);
            } catch(e){ alert(e.response?.data?.error||"Error de verificación"); setLoading(false); }
          }} disabled={loading} color={T.green} style={{width:"100%",justifyContent:"center"}} size="lg">
            {loading?"🔍 Verificando...":"📸 Hacer selfie"}
          </Btn>
        </Card>
      )}
    </div>
  );
}
