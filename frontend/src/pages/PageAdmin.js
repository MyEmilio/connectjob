import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { T } from "../constants/theme";
import { Card, Badge, Loader } from "../components/shared";
import api from "../services/api";

function ProductionConfigPanel() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    api.get("/config/status").then(r => setConfig(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader text={t("admin_checking")}/>;
  if (!config) return null;

  const statusColors = { active: T.green, secure: T.green, simulated: T.amber, local: T.amber, inactive: T.red, weak: T.red };
  const statusIcons = { active: "●", secure: "●", simulated: "◐", local: "◐", inactive: "○", weak: "○" };

  return (
    <Card style={{ padding: "18px 22px", marginBottom: 22, border: `1.5px solid ${config.production_ready ? T.green : T.amber}33` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: expanded ? 16 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: config.production_ready ? `${T.green}15` : `${T.amber}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            {config.production_ready ? "✅" : "⚙️"}
          </div>
          <div>
            <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 16, fontWeight: 800, color: T.text }}>{t("admin_prod_config")}</div>
            <div style={{ fontSize: 12, color: config.production_ready ? T.green : T.amber, fontWeight: 600 }}>
              {config.production_ready ? "Toate serviciile active" : `${config.active_services} servicii configurate`}
            </div>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} data-testid="config-toggle-btn" style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: "#fafaf9", cursor: "pointer", fontSize: 12, fontWeight: 600, color: T.text2 }}>
          {expanded ? t("admin_hide") : t("admin_details")}
        </button>
      </div>

      {expanded && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, animation: "fadeIn 0.2s ease" }}>
          {Object.entries(config.services).map(([key, svc]) => (
            <div key={key} data-testid={`config-service-${key}`} style={{ background: "#fafaf9", borderRadius: 10, padding: "12px 16px", border: `1px solid ${statusColors[svc.status]}22` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text, textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</span>
                <span style={{ color: statusColors[svc.status], fontSize: 12, fontWeight: 700 }}>
                  {statusIcons[svc.status]} {svc.status}
                </span>
              </div>
              <div style={{ fontSize: 11, color: T.text3, lineHeight: 1.5 }}>{svc.details}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function PageAdmin({ gs }) {
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
    <div data-testid="page-admin" style={{ textAlign:"center", padding:"60px 20px" }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
      <h3 style={{ fontFamily:"Outfit,sans-serif", color:T.text }}>Acces rezervat administratorilor</h3>
    </div>
  );

  return (
    <div data-testid="page-admin" style={{ animation:"fadeIn 0.3s ease" }}>
      <h2 style={{ fontFamily:"Outfit,sans-serif", fontSize:22, fontWeight:800, color:T.text, margin:"0 0 20px" }}>{t("admin_title")}</h2>

      {/* Production Config Panel */}
      <ProductionConfigPanel />

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

      <div style={{ display:"flex", gap:6, marginBottom:16 }}>
        {["pending","reviewed","actioned","dismissed"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} data-testid={`admin-filter-${f}`} style={{ padding:"6px 14px", borderRadius:999, border:"none", cursor:"pointer", fontSize:12, fontWeight:700, background:filter===f?T.green:"#f5f5f4", color:filter===f?"#fff":T.text2 }}>
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
                  <div style={{ fontSize:11, color:T.text3 }}>{new Date(r.created_at).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
                </div>
              </div>
              <Badge color={r.status==="pending"?T.amber:r.status==="actioned"?T.green:T.text3}>
                {r.status==="pending"?t("admin_status_pending"):r.status==="actioned"?t("admin_status_actioned"):t("admin_status_rejected")}
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
                <button onClick={()=>takeAction(r.id,"warn")} disabled={actioning===r.id} data-testid={`admin-warn-${r.id}`} style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${T.amber}`, cursor:"pointer", background:"#fef3c7", color:"#92400e", fontSize:12, fontWeight:700 }}>
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
