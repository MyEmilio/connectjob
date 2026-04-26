import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { T } from "../constants/theme";
import { Card, Btn } from "../components/shared";
import TrustBadges from "../components/TrustBadges";
import api from "../services/api";

// Minimalist escrow flow — Feb 2026 redesign.
// Strict spec: no emojis, sober palette, money-app trust feel.
// Commission rate is fetched dynamically per user tier.
export default function PageEscrow({ gs, update, navigate }) {
  const { t } = useTranslation("t");
  const job = gs.selectedJob || (gs.jobs || [])[0];

  const [step, setStep]           = useState(0);
  const [method, setMethod]       = useState("card");
  const [card, setCard]           = useState({ num:"", exp:"", cvv:"" });
  const [loading, setLoading]     = useState(false);
  const [timer, setTimer]         = useState(0);
  const [disputed, setDisputed]   = useState(false);
  const [paymentId, setPaymentId] = useState(null);
  const [apiMsg, setApiMsg]       = useState("");
  const [stripeMode, setStripeMode] = useState(null);
  const [tierInfo, setTierInfo]   = useState(null);

  // Dynamic commission based on user's tier (founder=0%, EA=3%, standard 3-5-7% by plan)
  const commissionRate = tierInfo?.commission_rate ?? 0.03;
  const fee   = job ? +(job.salary * commissionRate).toFixed(2) : 0;
  const total = job ? +(job.salary + fee).toFixed(2)            : 0;

  const fmt = s => `${String(Math.floor(s/3600)).padStart(2,"0")}:${String(Math.floor((s%3600)/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  useEffect(() => {
    if (step === 2) {
      const iv = setInterval(() => setTimer(tc => tc+1), 1000);
      return () => clearInterval(iv);
    }
  }, [step]);

  useEffect(() => {
    api.get("/payments/stripe-config").then(r => setStripeMode(r.data.configured ? "live" : "demo")).catch(() => setStripeMode("demo"));
    api.get("/stats/my-tier").then(r => setTierInfo(r.data)).catch(() => {});
  }, []);

  if (!job) return (
    <div data-testid="page-escrow" style={{ textAlign:"center", padding:"60px 24px", color:T.text2 }}>
      <div style={{ fontFamily:"Inter,sans-serif", fontSize:20, fontWeight:700, color:T.text, marginBottom:8 }}>{t("nav_escrow","Escrow")}</div>
      <div style={{ fontSize:14, marginBottom:24, color:T.text2 }}>{t("escrow_select_job","Selectează un job pentru a continua")}</div>
      <Btn onClick={() => navigate("jobs")} color={T.primary} style={{ margin:"0 auto" }}>{t("nav_jobs","Joburi")}</Btn>
    </div>
  );

  const fmtCard = v => v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim();
  const fmtExp  = v => { const c = v.replace(/\D/g,"").slice(0,4); return c.length>2 ? c.slice(0,2)+"/"+c.slice(2) : c; };

  const steps = [t("escrow_step_config","Configurare"), t("escrow_step_pay","Plată"), t("escrow_step_active","În curs"), t("escrow_step_done","Finalizat")];

  const labelStyle  = { display:"block", fontSize:11, fontWeight:600, color:T.text2, textTransform:"uppercase", letterSpacing:"0.04em", marginBottom:5 };
  const inputStyle  = { width:"100%", height:42, borderRadius:8, border:`1.5px solid ${T.border}`, padding:"0 12px", fontSize:14, fontFamily:"Inter,sans-serif", outline:"none", boxSizing:"border-box", background:"#fff", color:T.text };

  return (
    <div data-testid="page-escrow" style={{ maxWidth:520, margin:"0 auto", animation:"fadeIn 0.3s ease", fontFamily:"Inter,sans-serif" }}>
      {/* Stepper — minimalist horizontal */}
      <div style={{ display:"flex", alignItems:"center", marginBottom:28, padding:"0 4px" }}>
        {steps.map((s, i) => (
          <div key={s} style={{ display:"flex", alignItems:"center", flex:i<steps.length-1?1:"none" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
              <div style={{
                width:26, height:26, borderRadius:"50%",
                background: step>i ? T.primary : (step===i ? "#fff" : "#fff"),
                border: step===i ? `2px solid ${T.primary}` : (step>i ? "none" : `1.5px solid ${T.border}`),
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:11, fontWeight:700, color: step>i ? "#fff" : (step===i ? T.primary : T.text3),
                transition:"all 0.25s",
              }}>{step>i ? "✓" : i+1}</div>
              <span style={{ fontSize:9, color: step>=i ? T.primary : T.text3, fontWeight:600, whiteSpace:"nowrap" }}>{s}</span>
            </div>
            {i<steps.length-1 && <div style={{ flex:1, height:2, margin:"0 4px", marginBottom:14, background: step>i ? T.primary : T.border, transition:"background 0.25s" }}/>}
          </div>
        ))}
      </div>

      {/* ─── STEP 0 — Summary / Confirmation ────────────────── */}
      {step === 0 && (
        <Card style={{ padding:24, boxShadow:"var(--shadow-sm)" }}>
          <h2 style={{ fontFamily:"Inter,sans-serif", fontSize:22, fontWeight:800, color:T.text, margin:"0 0 6px", letterSpacing:"-0.02em" }}>
            {t("escrow_title","Plată securizată")}
          </h2>
          <p style={{ fontSize:13, color:T.text2, lineHeight:1.6, margin:"0 0 20px" }}>
            {t("escrow_desc_short","Banii sunt blocați în Escrow. Se eliberează doar după ce confirmi că lucrarea a fost finalizată.")}
          </p>

          {stripeMode === "demo" && (
            <div data-testid="stripe-demo-badge" style={{ display:"inline-block", marginBottom:18, padding:"4px 10px", borderRadius:6, background:"#fef3c7", border:"1px solid #fde68a", fontSize:11, fontWeight:700, color:"#92400e", letterSpacing:"0.03em", textTransform:"uppercase" }}>
              {t("escrow_demo_badge","Mod Demo")}
            </div>
          )}

          {/* Job recap (sober card) */}
          <div style={{ background: T.bg, borderRadius:10, padding:"14px 16px", marginBottom:18, border:`1px solid ${T.border}` }}>
            <div style={{ fontWeight:700, fontSize:14, color:T.text, marginBottom:2 }}>{job.title}</div>
            <div style={{ fontSize:12, color:T.text3 }}>{job.employer}</div>
          </div>

          {/* Amount breakdown */}
          <div style={{ marginBottom:22 }}>
            {[
              { l:t("escrow_salary","Sumă"),     v:`${job.salary} €` },
              { l:t("escrow_commission","Comision"), v:`${fee} €${tierInfo?.is_founder ? ` (Founder ${(commissionRate*100).toFixed(0)}%)` : ` (${(commissionRate*100).toFixed(0)}%)`}` },
            ].map(r => (
              <div key={r.l} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", fontSize:13, borderBottom:`1px solid ${T.border}` }}>
                <span style={{ color:T.text2 }}>{r.l}</span>
                <span style={{ fontWeight:600, color:T.text }}>{r.v}</span>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", padding:"14px 0 0", fontSize:15 }}>
              <span style={{ color:T.text, fontWeight:700 }}>{t("escrow_total","Total")}</span>
              <span style={{ fontWeight:800, color:T.text, fontSize:18 }}>{total} €</span>
            </div>
          </div>

          <TrustBadges compact />

          <Btn data-testid="escrow-continue-btn" onClick={() => setStep(1)} color={T.primary} style={{ width:"100%", justifyContent:"center" }} size="lg">
            {t("escrow_continue_pay","Continuă plata")}
          </Btn>
        </Card>
      )}

      {/* ─── STEP 1 — Payment method + form ─────────────────── */}
      {step === 1 && (
        <Card style={{ padding:24, boxShadow:"var(--shadow-sm)" }}>
          <h3 style={{ fontFamily:"Inter,sans-serif", fontSize:18, fontWeight:700, color:T.text, margin:"0 0 16px", letterSpacing:"-0.01em" }}>
            {t("escrow_payment_method","Metodă de plată")}
          </h3>

          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            {[
              { k:"card",   l:t("escrow_method_card","Card") },
              { k:"bank",   l:t("escrow_transfer","Transfer bancar") },
              { k:"paypal", l:"PayPal" },
            ].map(m => (
              <button key={m.k} onClick={() => setMethod(m.k)} data-testid={`escrow-method-${m.k}`} style={{
                flex:1, padding:"11px 6px", borderRadius:8, cursor:"pointer",
                border: method===m.k ? `1.5px solid ${T.primary}` : `1.5px solid ${T.border}`,
                background: method===m.k ? "rgba(22,163,74,0.06)" : "#fff",
                fontSize:13, fontWeight:600,
                color: method===m.k ? T.primary : T.text2,
                fontFamily:"Inter,sans-serif",
                transition:"all 0.2s",
              }}>{m.l}</button>
            ))}
          </div>

          {method === "card" && (
            <div style={{ marginBottom:18 }}>
              {[
                { l:t("escrow_card_number","Număr card"), v:card.num, set:v => setCard(c => ({ ...c, num:fmtCard(v) })), ph:"1234 5678 9012 3456" },
                { l:t("escrow_expires","Expiră"),         v:card.exp, set:v => setCard(c => ({ ...c, exp:fmtExp(v) })),  ph:"MM/YY" },
                { l:"CVV",                                  v:card.cvv, set:v => setCard(c => ({ ...c, cvv:v.slice(0,3) })), ph:"•••", type:"password" },
              ].map(f => (
                <div key={f.l} style={{ marginBottom:12 }}>
                  <label style={labelStyle}>{f.l}</label>
                  <input value={f.v} onChange={e => f.set(e.target.value)} placeholder={f.ph} type={f.type || "text"} style={inputStyle}
                    onFocus={e => e.target.style.border = `1.5px solid ${T.primary}`}
                    onBlur={e => e.target.style.border = `1.5px solid ${T.border}`}
                  />
                </div>
              ))}
            </div>
          )}

          {method === "bank" && (
            <div style={{ background:T.bg, borderRadius:10, padding:14, marginBottom:18, border:`1px solid ${T.border}` }}>
              {[
                { l:"IBAN",                              v:"ES91 2100 0418 4502 0005 1332" },
                { l:t("escrow_beneficiary","Beneficiar"), v:"ConnectJob SL" },
                { l:t("escrow_reference","Referință"),    v:"ESC-2026-001234" },
                { l:t("escrow_amount","Sumă"),            v:`${total} €` },
              ].map(r => (
                <div key={r.l} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${T.border}`, fontSize:13 }}>
                  <span style={{ color:T.text3 }}>{r.l}</span>
                  <span style={{ fontWeight:600, color:T.text, fontVariantNumeric:"tabular-nums" }}>{r.v}</span>
                </div>
              ))}
            </div>
          )}

          {method === "paypal" && (
            <div style={{ textAlign:"center", padding:18, background:T.bg, borderRadius:10, marginBottom:18, border:`1px solid ${T.border}` }}>
              <div style={{ fontSize:14, fontWeight:600, color:T.text }}>{t("escrow_paypal_redirect","Vei fi redirecționat către PayPal")}</div>
            </div>
          )}

          <TrustBadges compact />

          <Btn data-testid="escrow-pay-btn" onClick={async () => {
            setLoading(true); setApiMsg("");
            try {
              const res = await api.post("/payments/create-intent", {
                job_id: job.id, payee_id: job.employer_id || 1, amount: job.salary, method,
              });
              setPaymentId(res.data.payment_id);
              if (res.data.message) setApiMsg(res.data.message);
              setStep(2);
            } catch (e) { setApiMsg(e.response?.data?.error || t("escrow_error","Eroare la plată")); }
            finally   { setLoading(false); }
          }} disabled={loading} color={T.primary} style={{ width:"100%", justifyContent:"center" }} size="lg">
            {loading ? t("escrow_processing","Se procesează...") : t("escrow_lock_amount","Blochează {{amount}} € în Escrow",{ amount:total })}
          </Btn>
          {apiMsg && <div style={{ marginTop:10, fontSize:12, color:"#92400e", background:"#fef3c7", borderRadius:6, padding:"8px 12px" }}>{apiMsg}</div>}
        </Card>
      )}

      {/* ─── STEP 2 — Active / locked funds ─────────────────── */}
      {step === 2 && (
        <Card style={{ padding:24, border:`1.5px solid ${T.primary}`, boxShadow:"var(--shadow-sm)" }}>
          <div style={{ marginBottom:18 }}>
            <h3 style={{ fontFamily:"Inter,sans-serif", fontSize:18, fontWeight:700, color:T.text, margin:"0 0 4px" }}>
              {t("escrow_task_active","Lucrare activă")}
            </h3>
            <div style={{ fontFamily:"monospace", fontSize:24, fontWeight:700, color:T.primary, fontVariantNumeric:"tabular-nums", letterSpacing:"0.02em" }}>
              {fmt(timer)}
            </div>
          </div>

          <div style={{ background:"#f0fdf4", borderRadius:10, padding:14, marginBottom:16, border:"1px solid #bbf7d0" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontWeight:600, color:"#065f46", fontSize:13 }}>{t("escrow_locked_funds","Fonduri blocate")}</span>
              <span style={{ fontSize:18, fontWeight:800, color:T.primary, fontFamily:"Inter,sans-serif" }}>{total} €</span>
            </div>
            <div style={{ height:4, borderRadius:999, background:"#bbf7d0", overflow:"hidden" }}>
              <div style={{ height:"100%", background:T.primary, borderRadius:999, width:`${Math.min((timer/3600)*100,100)}%`, transition:"width 1s" }}/>
            </div>
          </div>

          {[
            { l:t("escrow_status_locked","Plată blocată"),         d:true },
            { l:t("escrow_status_confirmed","Confirmată"),         d:true },
            { l:t("escrow_status_executing","Lucrare în curs"),    d:timer>0 },
            { l:t("escrow_status_confirm_done","Confirmare client"), d:false },
            { l:t("escrow_status_released","Plată eliberată"),     d:false },
          ].map(s => (
            <div key={s.l} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${T.border}` }}>
              <div style={{
                width:16, height:16, borderRadius:"50%",
                background: s.d ? T.primary : "#fff",
                border: s.d ? "none" : `1.5px solid ${T.border}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:9, color:"#fff", flexShrink:0,
              }}>{s.d ? "✓" : ""}</div>
              <span style={{ fontSize:13, color: s.d ? T.text : T.text3, fontWeight: s.d ? 600 : 400 }}>{s.l}</span>
            </div>
          ))}

          <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:18 }}>
            <Btn data-testid="escrow-release-btn" onClick={async () => {
              setLoading(true);
              try {
                if (paymentId) await api.post(`/payments/${paymentId}/release`);
                setStep(3); update({ escrowActive:null });
              } catch (e) { setApiMsg(e.response?.data?.error || t("escrow_error","Eroare")); }
              finally   { setLoading(false); }
            }} disabled={loading} color={T.primary} style={{ width:"100%", justifyContent:"center" }} size="lg">
              {loading ? t("escrow_processing","Se procesează...") : t("escrow_confirm_release","Confirm și eliberez plata")}
            </Btn>
            <Btn onClick={async () => {
              if (paymentId) await api.post(`/payments/${paymentId}/dispute`).catch(() => {});
              setDisputed(true);
            }} variant="outline" style={{ width:"100%", justifyContent:"center", borderColor:"#fecaca", color:T.red, background:"#fef2f2" }} size="md">
              {t("escrow_open_dispute","Deschide dispută")}
            </Btn>
          </div>

          {disputed && <div style={{ marginTop:10, background:"#fef2f2", borderRadius:8, padding:"10px 13px", border:"1px solid #fecaca", fontSize:12, color:T.red }}>{t("escrow_dispute_msg","Dispută deschisă. Echipa noastră va revizui situația în maxim 24h.")}</div>}
        </Card>
      )}

      {/* ─── STEP 3 — Done ──────────────────────────────────── */}
      {step === 3 && (
        <Card style={{ padding:"36px 28px", border:`1.5px solid ${T.primary}`, textAlign:"center", boxShadow:"var(--shadow-sm)" }}>
          <div style={{ width:48, height:48, borderRadius:"50%", background:T.primary, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:800, margin:"0 auto 16px" }}>✓</div>
          <h2 style={{ fontFamily:"Inter,sans-serif", fontSize:22, fontWeight:800, color:T.text, margin:"0 0 8px", letterSpacing:"-0.02em" }}>
            {t("escrow_task_done_title","Plată finalizată")}
          </h2>
          <p style={{ fontSize:14, color:T.text2, marginBottom:24 }}>{t("escrow_task_done_msg","Banii au fost transferați. Mulțumim că ai folosit ConnectJob!")}</p>
          <div style={{ display:"flex", gap:10 }}>
            <Btn onClick={() => navigate("home")} variant="outline" style={{ flex:1, justifyContent:"center" }}>{t("nav_home","Acasă")}</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
