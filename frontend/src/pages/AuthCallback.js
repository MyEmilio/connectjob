import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const { loginWithGoogleSession } = useAuth();
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) { navigate("/login", { replace: true }); return; }

    const sessionId = match[1];

    loginWithGoogleSession(sessionId)
      .then(() => {
        // Clear hash from URL and go to dashboard
        window.history.replaceState(null, "", window.location.pathname);
        navigate("/", { replace: true });
      })
      .catch((err) => {
        console.error("Google Auth failed:", err);
        navigate("/login", { replace: true, state: { error: "Autentificare Google eșuată" } });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fafaf9" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: "3px solid #059669", borderTop: "3px solid transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <div style={{ fontFamily: "Outfit,sans-serif", fontSize: 16, fontWeight: 700, color: "#1c1917" }}>Se autentifică cu Google...</div>
      </div>
    </div>
  );
}
