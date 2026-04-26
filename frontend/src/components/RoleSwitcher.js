import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import api from "../services/api";

const T = { green:"#059669", blue:"#3b82f6", text:"#1c1917", text2:"#57534e", border:"#e7e5e4", white:"#fff" };

/**
 * Dual-Mode role toggle for navbar.
 * Lets users switch between "worker" and "employer" on the same account.
 *
 * UX: TAP toggles role. SWIPE LEFT or RIGHT (>30px) also toggles.
 * Swipe creates a tactile, gesture-driven feel popular on mobile-first apps.
 */
export default function RoleSwitcher({ activeRole, onSwitched }) {
  const { t } = useTranslation("t");
  const [busy, setBusy] = useState(false);
  const [dragX, setDragX] = useState(0);   // visual offset while swiping (clamped)
  const touchStart = useRef(null);
  const realDelta = useRef(0);             // unclamped delta — used for threshold check

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

  // ── Swipe handlers ──
  const onTouchStart = (e) => {
    touchStart.current = e.touches[0].clientX;
    realDelta.current = 0;
  };
  const onTouchMove = (e) => {
    if (touchStart.current == null) return;
    const dx = e.touches[0].clientX - touchStart.current;
    realDelta.current = dx;
    // Cap visual offset so it doesn't drift too far
    setDragX(Math.max(-22, Math.min(22, dx)));
  };
  const onTouchEnd = () => {
    if (touchStart.current == null) return;
    const moved = Math.abs(realDelta.current);
    setDragX(0);
    touchStart.current = null;
    realDelta.current = 0;
    // Threshold: swipe >= 30px counts as toggle (prevents accidental scrolls)
    if (moved >= 30) switchRole();
  };

  const isWorker = current === "worker";
  const color = isWorker ? T.green : T.blue;

  return (
    <button
      data-testid="role-switcher-btn"
      className="jc-role-switcher"
      onClick={switchRole}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      disabled={busy}
      title={t("role_switch_hint", { other: other === "worker" ? t("role_worker","Prestador") : t("role_employer","Cliente") })}
      style={{
        display:"flex", alignItems:"center", gap:6,
        padding:"4px 10px 4px 4px", borderRadius:999,
        border:`1.5px solid ${color}33`,
        background: `${color}10`,
        cursor: busy ? "wait" : "pointer",
        height:32,
        transition: dragX === 0 ? "all 0.2s" : "none",
        transform: `translateX(${dragX}px)`,
        touchAction: "pan-y",   // allow vertical scroll, intercept horizontal
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
