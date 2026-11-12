import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const OFFLINE_KEY = 'tiva_offline_checkins';
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours — PHI should not linger

export default function OfflineCheckInSync() {
  useEffect(() => {
    // Purge stale cached PHI (older than 24h or missing timestamp)
    const purgeStale = () => {
      try {
        const queue = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
        const now = Date.now();
        const fresh = queue.filter(item => {
          if (!item._cached_at) return false;
          return (now - item._cached_at) < MAX_CACHE_AGE_MS;
        });
        if (fresh.length !== queue.length) {
          localStorage.setItem(OFFLINE_KEY, JSON.stringify(fresh));
        }
      } catch {}
    };

    const sync = async () => {
      purgeStale();
      const queue = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
      if (queue.length === 0) return;

      const remaining = [];
      for (const item of queue) {
        // Strip internal metadata before submitting PHI
        const payload = { ...item };
        delete payload._cached_at;
        try {
          await base44.entities.CheckInObservation.create({
            ...payload,
            submitted_at: payload.submitted_at || new Date().toISOString(),
          });
          await base44.functions.invoke('submitMonthlyCheckIn', payload).catch(() => {});
          // Success: item is NOT pushed to remaining — PHI cleared immediately
        } catch {
          remaining.push(item);
        }
      }
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(remaining));
    };

    // Clear all cached PHI on logout
    const clearOnLogout = () => {
      try { localStorage.removeItem(OFFLINE_KEY); } catch {}
    };

    purgeStale();
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('tiva:auth:logout', clearOnLogout);
    const interval = setInterval(sync, 60000);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('tiva:auth:logout', clearOnLogout);
      clearInterval(interval);
    };
  }, []);

  return null;
}