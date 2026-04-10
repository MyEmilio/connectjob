import { useState, useEffect } from 'react';

// Design tokens
const T = {
  dark: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#f1f5f9",
  text2: "#cbd5e1",
  text3: "#94a3b8",
  green: "#059669",
  greenLight: "#34d399",
};

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) return false;
    
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setInstallPrompt(null);
    return outcome === 'accepted';
  };

  return {
    canInstall: !!installPrompt || isIOS,
    isInstalled,
    isIOS,
    promptInstall,
  };
}

export default function PWAInstallPrompt({ onDismiss }) {
  const { canInstall, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Don't show if installed or dismissed
  if (isInstalled || dismissed) return null;
  
  // Don't show if can't install
  if (!canInstall) return null;

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      const success = await promptInstall();
      if (success) {
        onDismiss?.();
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // iOS Instructions Modal
  if (showIOSInstructions) {
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9998,
        background: T.card, borderRadius: '20px 20px 0 0',
        padding: 24, boxShadow: '0 -10px 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>
            📱 Instalare pe iOS
          </h3>
          <button onClick={() => setShowIOSInstructions(false)} style={{ background: 'none', border: 'none', color: T.text3, fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, background: T.dark, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>1</div>
            <div style={{ color: T.text2, fontSize: 14 }}>
              Apasă pe butonul <strong style={{ color: T.text }}>Share</strong> (⬆️) din bara de jos
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, background: T.dark, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>2</div>
            <div style={{ color: T.text2, fontSize: 14 }}>
              Derulează și selectează <strong style={{ color: T.text }}>"Add to Home Screen"</strong>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, background: T.dark, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>3</div>
            <div style={{ color: T.text2, fontSize: 14 }}>
              Apasă <strong style={{ color: T.text }}>"Add"</strong> în colțul din dreapta sus
            </div>
          </div>
        </div>
        <button 
          onClick={() => setShowIOSInstructions(false)}
          style={{
            width: '100%', marginTop: 20, padding: 14, borderRadius: 12,
            background: `linear-gradient(135deg, ${T.green}, #047857)`,
            border: 'none', color: '#fff', fontWeight: 700, fontSize: 15,
            cursor: 'pointer', fontFamily: 'DM Sans,sans-serif',
          }}
        >
          Am înțeles
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: 16, right: 16, zIndex: 9998,
      background: `linear-gradient(135deg, ${T.card}, ${T.dark})`,
      borderRadius: 18, padding: '18px 20px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(52,211,153,0.2)',
      display: 'flex', alignItems: 'center', gap: 14,
      animation: 'slideUp 0.4s ease-out',
    }}>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      
      {/* App Icon */}
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: `linear-gradient(135deg, ${T.green}, #047857)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, flexShrink: 0,
      }}>
        ⚡
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 2 }}>
          Instalează ConnectJob
        </div>
        <div style={{ fontSize: 12, color: T.text3 }}>
          Acces rapid, notificări și experiență completă
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={handleDismiss}
          style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'transparent', border: `1px solid ${T.border}`,
            color: T.text3, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Nu acum
        </button>
        <button
          onClick={handleInstall}
          style={{
            padding: '10px 16px', borderRadius: 10,
            background: T.green, border: 'none',
            color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            boxShadow: `0 4px 12px ${T.green}66`,
          }}
        >
          Instalează
        </button>
      </div>
    </div>
  );
}
