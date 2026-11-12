import { useState, useEffect, useCallback } from 'react';

/**
 * usePWA — tracks install prompt, SW update status, and online/offline state.
 *
 * Usage:
 *   const { isInstallable, isOnline, needsUpdate, install, updateApp } = usePWA();
 */
export function usePWA() {
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSInstallable, setIsIOSInstallable] = useState(false);

  useEffect(() => {
    // Detect iOS Safari
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !/crios/i.test(ua);
    setIsIOS(ios);

    // On iOS, standalone mode check tells us if already installed
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsInstalled(isStandalone);

    // iOS Safari can't fire beforeinstallprompt — show manual instructions instead
    if (ios && !isStandalone) {
      setIsIOSInstallable(true);
    }
  }, []);

  useEffect(() => {
    // Android / Desktop: native install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
      setIsInstallable(true);
    };

    // Detect if already installed (Android)
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    // Online / Offline tracking
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Service Worker update detection (fired by vite-plugin-pwa)
    const handleSWNeedRefresh = () => setNeedsUpdate(true);

    document.addEventListener('vite-pwa:sw-need-refresh', handleSWNeedRefresh);
    return () => document.removeEventListener('vite-pwa:sw-need-refresh', handleSWNeedRefresh);
  }, []);

  // Trigger native install prompt (Android / Desktop)
  const install = useCallback(async () => {
    if (!installPromptEvent) return false;
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setInstallPromptEvent(null);
    }
    return outcome === 'accepted';
  }, [installPromptEvent]);

  // Apply waiting service worker
  const updateApp = useCallback(() => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  }, [registration]);

  return {
    isInstallable,       // Android/Desktop: browser install prompt available
    isIOSInstallable,    // iOS Safari: show manual "Add to Home Screen" instructions
    isInstalled,         // App is running in standalone / installed mode
    isOnline,            // Network connectivity state
    needsUpdate,         // New service worker is waiting
    isIOS,               // Running on iOS
    install,             // Call to show native install prompt
    updateApp,           // Call to apply the waiting SW update
  };
}
