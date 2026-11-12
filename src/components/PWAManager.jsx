import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { X, Download, RefreshCw, Share, Plus, WifiOff } from 'lucide-react';

// ─── Offline Banner ────────────────────────────────────────────────────────
function OfflineBanner() {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
      style={{
        background: 'linear-gradient(90deg, #7f1d1d, #991b1b)',
        color: '#fff',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
      }}
      role="alert"
      aria-live="polite"
    >
      <WifiOff size={15} />
      <span>You're offline — some features may be unavailable</span>
    </div>
  );
}

// ─── SW Update Banner ──────────────────────────────────────────────────────
function UpdateBanner({ onUpdate, onDismiss }) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9998] flex items-center justify-between gap-3 px-4 py-3"
      style={{
        background: 'rgba(10,15,13,0.96)',
        borderTop: '1px solid rgba(64,201,162,0.25)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
      }}
    >
      <div className="flex items-center gap-2 text-sm text-white">
        <RefreshCw size={15} className="text-tiva-teal shrink-0" />
        <span>A new version of Tiva is ready</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onUpdate}
          className="rounded-full px-3 py-1.5 text-xs font-bold"
          style={{ background: '#40C9A2', color: '#0A0F0D' }}
        >
          Update
        </button>
        <button onClick={onDismiss} className="text-white/40 hover:text-white/70 transition-colors">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── iOS Install Instructions Modal ───────────────────────────────────────
function IOSInstallModal({ onDismiss }) {
  return (
    <div
      className="fixed inset-0 z-[9997] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl px-6 py-6"
        style={{
          background: '#0F1614',
          border: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(64,201,162,0.15)' }}
            >
              <span className="text-tiva-teal font-bold text-lg">T</span>
            </div>
            <div>
              <p className="font-bold text-white text-sm">Install Tiva</p>
              <p className="text-white/50 text-xs">Add to your Home Screen</p>
            </div>
          </div>
          <button onClick={onDismiss} className="text-white/40 hover:text-white/70 transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <Step number={1} icon={<Share size={18} />} text={<>Tap the <strong className="text-white">Share</strong> button in Safari's toolbar</>} />
          <Step number={2} icon={<Plus size={18} />} text={<>Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong></>} />
          <Step number={3} icon={<Download size={18} />} text={<>Tap <strong className="text-white">"Add"</strong> — Tiva will appear on your Home Screen</>} />
        </div>

        <button
          onClick={onDismiss}
          className="mt-6 w-full rounded-full py-3 text-sm font-bold transition-opacity hover:opacity-90"
          style={{ background: '#40C9A2', color: '#0A0F0D' }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function Step({ number, icon, text }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: 'rgba(64,201,162,0.12)', color: '#40C9A2', fontSize: '0.75rem', fontWeight: 700 }}
      >
        {number}
      </div>
      <div className="flex items-center gap-2 text-sm text-white/70">
        <span className="text-tiva-teal shrink-0">{icon}</span>
        <span>{text}</span>
      </div>
    </div>
  );
}

// ─── Android / Desktop Install Prompt ─────────────────────────────────────
function AndroidInstallBanner({ onInstall, onDismiss }) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9997] flex items-center justify-between gap-3 px-4 py-3"
      style={{
        background: 'rgba(10,15,13,0.96)',
        borderTop: '1px solid rgba(64,201,162,0.25)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(64,201,162,0.15)' }}
        >
          <span className="font-bold text-tiva-teal text-lg">T</span>
        </div>
        <div>
          <p className="text-sm font-bold text-white">Install Tiva</p>
          <p className="text-xs text-white/50">Add to Home Screen for the best experience</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onInstall}
          className="rounded-full px-3 py-1.5 text-xs font-bold flex items-center gap-1"
          style={{ background: '#40C9A2', color: '#0A0F0D' }}
        >
          <Download size={13} />
          Install
        </button>
        <button onClick={onDismiss} className="text-white/40 hover:text-white/70 transition-colors">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Main PWAManager Component ────────────────────────────────────────────
/**
 * Drop this once in App.jsx inside the router/providers tree.
 * It renders all PWA-related UI: offline banner, update banner, install prompts.
 */
export default function PWAManager() {
  const {
    isInstallable,
    isIOSInstallable,
    isInstalled,
    isOnline,
    needsUpdate,
    install,
    updateApp,
  } = usePWA();

  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('pwa_install_dismissed') === 'true'; }
    catch { return false; }
  });

  // Show install banners after a small delay (let the app load first)
  useEffect(() => {
    if (isInstalled || dismissed) return;
    const t = setTimeout(() => {
      if (isInstallable) setShowInstallBanner(true);
      if (isIOSInstallable) setShowIOSModal(true);
    }, 4000);
    return () => clearTimeout(t);
  }, [isInstallable, isIOSInstallable, isInstalled, dismissed]);

  // Show update banner when new SW is waiting
  useEffect(() => {
    if (needsUpdate) setShowUpdateBanner(true);
  }, [needsUpdate]);

  const handleDismissInstall = () => {
    setShowInstallBanner(false);
    setShowIOSModal(false);
    setDismissed(true);
    try { localStorage.setItem('pwa_install_dismissed', 'true'); } catch {}
  };

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) setShowInstallBanner(false);
  };

  return (
    <>
      {/* Offline indicator */}
      {!isOnline && <OfflineBanner />}

      {/* SW update banner */}
      {showUpdateBanner && (
        <UpdateBanner
          onUpdate={updateApp}
          onDismiss={() => setShowUpdateBanner(false)}
        />
      )}

      {/* Android / Desktop install banner */}
      {showInstallBanner && !showUpdateBanner && (
        <AndroidInstallBanner
          onInstall={handleInstall}
          onDismiss={handleDismissInstall}
        />
      )}

      {/* iOS install modal */}
      {showIOSModal && (
        <IOSInstallModal onDismiss={handleDismissInstall} />
      )}
    </>
  );
}
