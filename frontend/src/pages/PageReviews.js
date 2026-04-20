import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { T } from "../constants/theme";
import { Card, Btn, Avatar, Stars } from "../components/shared";
import api from "../services/api";

export default function PageReviews({ gs, update }) {
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
    <div data-testid="page-reviews" style={{animation:"fadeIn 0.3s ease"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:16,marginBottom:24}}>
        <Card style={{padding:"24px",textAlign:"center"}}>
          <div style={{fontFamily:"Outfit,sans-serif",fontSize:52,fontWeight:800,color:T.text,lineHeight:1}}>{avg}</div>
          <Stars rating={parseFloat(avg)} size={20}/>
          <div style={{fontSize:13,color:T.text3,marginTop:8}}>{reviews.length} reseñas</div>
          <div style={{marginTop:12}}>
            {[5,4,3,2,1].map(s=>{
              const count=reviews.filter(r=>r.rating===s).length;
              return (
                <div key={s} style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:11,color:T.text3,width:8}}>{s}</span>
                  <span style={{fontSize:12}}>★</span>
                  <div style={{flex:1,height:5,borderRadius:999,background:T.border,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:999,background:T.amber,width:`${reviews.length?(count/reviews.length)*100:0}%`}}/>
                  </div>
                  <span style={{fontSize:11,color:T.text3,width:12}}>{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <div>
          {!submitted?(
            <Card style={{padding:"20px",marginBottom:14}}>
              <h3 style={{fontFamily:"Outfit,sans-serif",fontSize:16,fontWeight:700,color:T.text,margin:"0 0 14px"}}>✍️ Deja una reseña</h3>
              <div style={{display:"flex",gap:6,marginBottom:12}}>
                {[1,2,3,4,5].map(s=>(
                  <button key={s} onClick={()=>setMyRating(s)} data-testid={`review-star-${s}`} style={{width:36,height:36,borderRadius:8,border:`1.5px solid ${s<=myRating?T.amber:T.border}`,background:s<=myRating?"#fef3c7":"#fafaf9",fontSize:18,cursor:"pointer",transition:"all 0.15s"}}>★</button>
                ))}
              </div>
              <textarea data-testid="review-text-input" value={myText} onChange={e=>setMyText(e.target.value)} placeholder="Describe tu experiencia..." rows={3} style={{width:"100%",borderRadius:10,border:`1.5px solid ${T.border}`,padding:"9px 12px",fontSize:13,fontFamily:"DM Sans,sans-serif",resize:"none",outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.border=`1.5px solid ${T.green}`} onBlur={e=>e.target.style.border=`1.5px solid ${T.border}`}/>
              <Btn data-testid="review-submit-btn" onClick={submit} disabled={!myRating||!myText.trim()} color={T.green} style={{width:"100%",justifyContent:"center",marginTop:10}}>⭐ Publicar reseña</Btn>
            </Card>
          ):(
            <Card style={{padding:"20px",marginBottom:14,border:`2px solid ${T.green}`,textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:8}}>🎉</div>
              <div style={{fontFamily:"Outfit,sans-serif",fontSize:16,fontWeight:700,color:T.text}}>¡Reseña publicada!</div>
            </Card>
          )}

          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {[t("reviews_all_filter"),t("reviews_verified_filter2"),t("reviews_5stars"),t("reviews_4stars")].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} data-testid={`review-filter-${f}`} style={{padding:"5px 12px",borderRadius:999,border:"none",cursor:"pointer",background:filter===f?T.green:"#f5f5f4",color:filter===f?"#fff":T.text2,fontSize:11,fontWeight:600,transition:"all 0.15s"}}>{f}</button>
            ))}
          </div>

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
                      <div style={{fontSize:13,fontWeight:700,color:T.text}}>{r.reviewer_name||"Anónimo"}</div>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:1}}>
                        <Stars rating={r.rating} size={11}/>
                        {r.reviewer_verified&&<span style={{background:"#f0fdf4",color:T.green,borderRadius:999,padding:"1px 7px",fontSize:10,fontWeight:700}}>✓ Verificado</span>}
                      </div>
                    </div>
                  </div>
                  <span style={{fontSize:11,color:T.text3}}>{r.created_at?new Date(r.created_at).toLocaleDateString(undefined):""}</span>
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
