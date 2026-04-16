import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { T } from "../constants/theme";
import api from "../services/api";

const CHECK = "\u2713";

export default function PagePricing({ gs, update, navigate }) {
  const { t } = useTranslation("t");
  const { refreshUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [connectStatus, setConnectStatus] = useState(null);
  const [message, setMessage] = useState(null);

  const loadData = () => {
    return Promise.all([
      api.get("/subscriptions/plans"),
      api.get("/subscriptions/my"),
      api.get("/subscriptions/connect/status"),
    ])
      .then(([plansRes, myRes, connectRes]) => {
        setPlans(plansRes.data.plans || []);
        setCurrent(myRes.data);
        setConnectStatus(connectRes.data);
      })
      .catch(() => {});
  };

  useEffect(() => { loadData().finally(() => setLoading(false)); }, []);

  const handleCheckout = async (planId) => {
    if (planId === "free") return;
    setCheckoutLoading(planId);
    setMessage(null);
    try {
      const res = await api.post("/subscriptions/checkout", { plan: planId, origin_url: window.location.origin });
      if (res.data.simulated) {
        setMessage({ type: "success", text: res.data.message });
        await loadData();
        await refreshUser();
      } else if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Error" });
    } finally { setCheckoutLoading(null); }
  };

  const handleStartTrial = async () => {
    setCheckoutLoading("trial");
    setMessage(null);
    try {
      const res = await api.post("/subscriptions/start-trial");
      setMessage({ type: "success", text: res.data.message });
      await loadData();
      await refreshUser();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Error" });
    } finally { setCheckoutLoading(null); }
  };

  const handleCancel = async () => {
    if (!window.confirm(t("pricing_cancel_confirm"))) return;
    try {
      await api.post("/subscriptions/cancel");
      await loadData();
      await refreshUser();
      setMessage({ type: "success", text: t("pricing_sub_cancelled") });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Error" });
    }
  };

  const handleConnectOnboard = async () => {
    try {
      const res = await api.post("/subscriptions/connect/onboard", { origin_url: window.location.origin });
      if (res.data.simulated) {
        setMessage({ type: "success", text: res.data.message });
        const cs = await api.get("/subscriptions/connect/status");
        setConnectStatus(cs.data);
      } else if (res.data.url) { window.location.href = res.data.url; }
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Error" });
    }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${T.border}`, borderTop: `3px solid ${T.green}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  const PLAN_COLORS = {
    free: { bg: "#f8fafc", border: T.border, accent: T.text2, gradient: "linear-gradient(135deg, #64748b, #475569)" },
    pro: { bg: "#f0fdf4", border: T.green, accent: T.green, gradient: `linear-gradient(135deg, ${T.green}, ${T.greenDark})` },
    premium: { bg: "#fefbf0", border: T.amber, accent: T.amber, gradient: `linear-gradient(135deg, ${T.amber}, ${T.amberDark})` },
  };
  const PLAN_ICONS = { free: "\uD83C\uDD93", pro: "\u26A1", premium: "\uD83D\uDC51" };

  const trialActive = current?.trial?.active;
  const trialEligible = current?.trial_eligible;
  const trialDays = current?.trial?.days_remaining;
  const isTrial = current?.subscription?.is_trial;

  return (
    <div data-testid="page-pricing" style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ fontFamily: "Outfit,sans-serif", fontWeight: 900, fontSize: 28, color: T.text, margin: "0 0 8px", letterSpacing: "-0.02em" }}>{t("pricing_title")}</h1>
        <p style={{ fontSize: 14, color: T.text2, maxWidth: 500, margin: "0 auto" }}>{t("pricing_subtitle")}</p>
      </div>

      {trialActive && (
        <div data-testid="trial-banner" style={{ maxWidth: 650, margin: "0 auto 20px", padding: "14px 20px", borderRadius: 14, background: `linear-gradient(135deg, ${T.green}10, ${T.blue}10)`, border: `1.5px solid ${T.green}33`, display: "flex", alignItems: "center", gap: 14, animation: "fadeIn 0.3s ease" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${T.green}, ${T.greenDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, color: "#fff", fontWeight: 900 }}>{trialDays}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Outfit,sans-serif", fontWeight: 800, fontSize: 14, color: T.text }}>
              {t("pricing_trial_banner_title")} — {trialDays} {trialDays === 1 ? t("pricing_trial_day_left") : t("pricing_trial_days_left")}
            </div>
            <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>
              {t("pricing_trial_expires")} {new Date(current.trial.expires_at).toLocaleDateString()}. {t("pricing_trial_upgrade_now")}
            </div>
          </div>
          <button data-testid="trial-upgrade-btn" onClick={() => handleCheckout("pro")} style={{ padding: "8px 16px", borderRadius: 9, border: "none", background: `linear-gradient(135deg, ${T.green}, ${T.greenDark})`, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", boxShadow: `0 3px 10px ${T.green}33` }}>
            {t("pricing_upgrade_pro")}
          </button>
        </div>
      )}

      {trialEligible && !trialActive && current?.plan === "free" && (
        <div data-testid="trial-cta" style={{ maxWidth: 650, margin: "0 auto 20px", padding: "16px 20px", borderRadius: 14, background: `linear-gradient(135deg, ${T.green}08, ${T.greenLight}08)`, border: `1.5px dashed ${T.green}44`, textAlign: "center", animation: "fadeIn 0.3s ease" }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{PLAN_ICONS.pro}</div>
          <div style={{ fontFamily: "Outfit,sans-serif", fontWeight: 800, fontSize: 16, color: T.text, marginBottom: 4 }}>{t("pricing_try_pro_free")}</div>
          <div style={{ fontSize: 12, color: T.text2, marginBottom: 12 }}>{t("pricing_try_pro_desc")}</div>
          <button data-testid="start-trial-btn" onClick={handleStartTrial} disabled={checkoutLoading === "trial"} style={{ padding: "10px 28px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${T.green}, ${T.greenDark})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 14px ${T.green}33`, opacity: checkoutLoading === "trial" ? 0.7 : 1 }}>
            {checkoutLoading === "trial" ? t("pricing_activating") : t("pricing_activate_trial")}
          </button>
        </div>
      )}

      {message && (
        <div data-testid="pricing-message" style={{ maxWidth: 600, margin: "0 auto 20px", padding: "12px 16px", borderRadius: 10, background: message.type === "success" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${message.type === "success" ? "#86efac" : "#fecaca"}`, color: message.type === "success" ? "#166534" : "#991b1b", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
          {message.text}
        </div>
      )}

      {current && (
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span data-testid="current-plan-badge" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px", borderRadius: 999, background: PLAN_COLORS[current.plan]?.gradient || PLAN_COLORS.free.gradient, color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "Outfit,sans-serif" }}>
            {PLAN_ICONS[current.plan]} {t("pricing_current_plan")}: {current.plan_details?.name || "Free"}
            {isTrial && ` (${t("pricing_trial_label")})`}
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, maxWidth: 900, margin: "0 auto" }}>
        {plans.map((plan) => {
          const colors = PLAN_COLORS[plan.id] || PLAN_COLORS.free;
          const isActive = current?.plan === plan.id;
          const isPopular = plan.id === "pro";
          return (
            <div key={plan.id} data-testid={`plan-card-${plan.id}`} style={{ background: colors.bg, border: `2px solid ${isActive ? colors.accent : colors.border}`, borderRadius: 16, padding: "24px 20px", position: "relative", transition: "all 0.2s", boxShadow: isActive ? `0 4px 20px ${colors.accent}22` : "0 1px 4px rgba(0,0,0,0.04)" }}>
              {isPopular && <div style={{ position: "absolute", top: -10, right: 16, background: colors.gradient, color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 999, fontFamily: "Outfit,sans-serif", letterSpacing: "0.05em" }}>{t("pricing_popular")}</div>}
              {isActive && <div style={{ position: "absolute", top: -10, left: 16, background: colors.gradient, color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 999, fontFamily: "Outfit,sans-serif" }}>{CHECK} {isTrial && plan.id === "pro" ? t("pricing_trial_badge") : t("pricing_active")}</div>}
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 36, marginBottom: 6 }}>{PLAN_ICONS[plan.id]}</div>
                <h3 style={{ fontFamily: "Outfit,sans-serif", fontWeight: 800, fontSize: 20, color: T.text, margin: "0 0 4px" }}>{plan.name}</h3>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2 }}>
                  <span style={{ fontFamily: "Outfit,sans-serif", fontWeight: 900, fontSize: 32, color: colors.accent }}>{plan.price === 0 ? t("pricing_free_label") : `${plan.price}`}</span>
                  {plan.price > 0 && <span style={{ fontSize: 13, color: T.text3, fontWeight: 600 }}>{t("pricing_per_month")}</span>}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                {(plan.feature_keys || []).map((key, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 12, color: T.text2 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${colors.accent}15`, color: colors.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{CHECK}</div>
                    {t(key, key)}
                  </div>
                ))}
                {plan.id === "pro" && (trialEligible || trialActive) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 12, color: T.green, fontWeight: 700 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${T.green}20`, color: T.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{CHECK}</div>
                    {t("pricing_7days_free")}
                  </div>
                )}
              </div>
              {isActive ? (
                plan.id !== "free" ? (
                  isTrial ? (
                    <button data-testid={`upgrade-from-trial-${plan.id}`} onClick={() => handleCheckout(plan.id)} disabled={checkoutLoading === plan.id} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: colors.gradient, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 12px ${colors.accent}33`, opacity: checkoutLoading === plan.id ? 0.7 : 1 }}>
                      {checkoutLoading === plan.id ? t("pricing_processing") : t("pricing_upgrade_paid")}
                    </button>
                  ) : (
                    <button data-testid={`cancel-plan-${plan.id}`} onClick={handleCancel} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1.5px solid #fecaca", background: "#fef2f2", color: T.red, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>{t("pricing_cancel_sub")}</button>
                  )
                ) : (
                  <div style={{ width: "100%", padding: "10px", borderRadius: 10, background: "#f5f5f4", color: T.text3, fontSize: 13, fontWeight: 700, textAlign: "center" }}>{t("pricing_plan_current")}</div>
                )
              ) : (
                <button data-testid={`upgrade-plan-${plan.id}`} onClick={() => handleCheckout(plan.id)} disabled={checkoutLoading === plan.id || plan.id === "free"} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: plan.id === "free" ? "#f5f5f4" : colors.gradient, color: plan.id === "free" ? T.text3 : "#fff", fontSize: 13, fontWeight: 700, cursor: plan.id === "free" ? "default" : "pointer", boxShadow: plan.id !== "free" ? `0 4px 12px ${colors.accent}33` : "none", opacity: checkoutLoading === plan.id ? 0.7 : 1 }}>
                  {checkoutLoading === plan.id ? t("pricing_processing") : plan.id === "free" ? t("pricing_plan_basic") : `${t("pricing_upgrade_to")} ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {gs?.user?.role === "worker" && (
        <div data-testid="connect-section" style={{ maxWidth: 600, margin: "32px auto 0", background: T.white, borderRadius: 16, padding: "20px 24px", border: `1.5px solid ${T.border}` }}>
          <h3 style={{ fontFamily: "Outfit,sans-serif", fontWeight: 800, fontSize: 16, color: T.text, margin: "0 0 8px" }}>{t("pricing_receive_payments")}</h3>
          <p style={{ fontSize: 12, color: T.text2, marginBottom: 14, lineHeight: 1.6 }}>{t("pricing_connect_desc")}</p>
          {connectStatus?.onboarding_complete ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #86efac" }}>
              <div style={{ fontSize: 18 }}>{CHECK}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>{t("pricing_stripe_connected")}</div>
                <div style={{ fontSize: 11, color: "#166534", opacity: 0.8 }}>{t("pricing_stripe_ready")}{connectStatus.simulated && t("pricing_stripe_simulated")}</div>
              </div>
            </div>
          ) : (
            <button data-testid="connect-onboard-btn" onClick={handleConnectOnboard} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${T.blue}, ${T.blueDark})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 12px ${T.blue}33` }}>{t("pricing_connect_stripe")}</button>
          )}
        </div>
      )}

      <div style={{ maxWidth: 600, margin: "20px auto 0", textAlign: "center", fontSize: 11, color: T.text3, lineHeight: 1.8 }}>
        <p>{t("pricing_commission_info")} <strong style={{ color: T.text2 }}>{t("pricing_commission_pct")}</strong> {t("pricing_commission_rest")}</p>
        <p>{t("pricing_cancel_anytime")}{!plans[0]?.stripe_configured && <span style={{ color: T.amber, fontWeight: 600 }}> {t("pricing_stripe_not_configured")}</span>}</p>
      </div>
    </div>
  );
}
