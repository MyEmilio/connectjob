import { useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../services/api";

const T = { green:"#059669", blue:"#3b82f6", text:"#1c1917", text2:"#57534e", border:"#e7e5e4", white:"#fff" };

/**
 * Dual-Mode role toggle for navbar.
 * Lets users switch between "worker" and "employer" on the same account.
 */
export default function RoleSwitcher({ activeRole, onSwitched }) {
  const { t } = useTranslation("t");
  const [busy, setBusy] = useState(false);

  const current = activeRole === "employer" ? "employer" : "worker";

  const other = current === "worker" ? "employer" : "worker";

  const switchRole = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await api.post("/auth/switch-role", { role: other });
      onSwitched?.(res.data.active_role, res.data.roles);
    } catch (e) {
      console.error("switch-role failed", e);
    } finally {
      setBusy(false);
    }
  };

  const isWorker = current === "worker";
  const color = isWorker ? T.green : T.blue;

  return (
    <button
      data-testid="role-switcher-btn"
      className="jc-role-switcher"
      onClick={switchRole}
      disabled={busy}
      title={t("role_switch_hint", { other: other === "worker" ? t("role_worker","Prestador") : t("role_employer","Cliente") })}
      style={{
        display:"flex", alignItems:"center", gap:6,
        padding:"4px 10px 4px 4px", borderRadius:999,
        border:`1.5px solid ${color}33`,
        background: `${color}10`,
        cursor: busy ? "wait" : "pointer",
        height:32,
        transition:"all 0.2s",
      }}
    >
      <span style={{
        width:22, height:22, borderRadius:"50%",
        background: color, color:"#fff",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:11, fontWeight:800,
      }}>
        {isWorker ? "👷" : "🧑‍💼"}
      </span>
      <span className="jc-role-label" style={{
        fontSize:11, fontWeight:800, color,
        textTransform:"uppercase", letterSpacing:"0.03em",
        whiteSpace:"nowrap",
      }}>
        {isWorker ? t("role_worker","Prestador") : t("role_employer","Cliente")}
      </span>
      <span className="jc-role-arrow" style={{ fontSize:10, color: T.text2, marginLeft:-2 }}>⇄</span>
    </button>
  );
}
