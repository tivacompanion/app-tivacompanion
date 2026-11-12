import { useState, useEffect } from 'react';
import { Watch, RefreshCw, Check, AlertCircle, Smartphone } from 'lucide-react';
import { syncWearableData, getLastSyncTime, isWearableSyncAvailable } from '@/utils/wearableSync';

export default function WearableSyncPanel({ onSynced }) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [bridgeAvailable, setBridgeAvailable] = useState(false);

  useEffect(() => {
    setLastSync(getLastSyncTime());
    setBridgeAvailable(isWearableSyncAvailable());
  }, []);

  const handleSync = async (source) => {
    setSyncing(true);
    setError(null);
    setResult(null);

    try {
      let readings = [];

      if (window.TivaHealthBridge?.getHealthData) {
        const raw = await window.TivaHealthBridge.getHealthData({
          startDate: lastSync || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        });
        readings = Array.isArray(raw) ? raw : (raw.readings || []);
      } else if (window.webkit?.messageHandlers?.TivaHealthBridge) {
        const raw = await new Promise((resolve) => {
          window.webkit.messageHandlers.TivaHealthBridge.postMessage({
            action: 'getHealthData',
            startDate: lastSync || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          });
          window.__tivaHealthCallback = resolve;
        });
        readings = Array.isArray(raw) ? raw : (raw.readings || []);
      } else {
        setError('Wearable sync requires the Tiva mobile app. Open this page from the app to sync your health data.');
        setSyncing(false);
        return;
      }

      const res = await syncWearableData(readings, source);
      setResult(res);
      setLastSync(new Date().toISOString());

      if (onSynced) onSynced(res);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = (ts) => {
    if (!ts) return 'Never';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-card/50 backdrop-blur-md rounded-xl border border-white/10 p-3 mb-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-mint flex items-center justify-center flex-shrink-0">
            <Watch className="w-3.5 h-3.5 text-mint-deep" />
          </div>
          <div className="min-w-0">
            <h3 className="font-heading font-semibold text-navy text-xs leading-tight">Wearable Sync</h3>
            <p className="text-[9px] text-muted-foreground leading-tight">{formatLastSync(lastSync)}</p>
          </div>
        </div>
        {result && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-mint text-mint-deep flex items-center gap-1 flex-shrink-0">
            <Check className="w-2.5 h-2.5" /> {result.synced} new
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleSync('google_health')}
          disabled={syncing}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-tiva-teal/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="#40C9A2" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="#40C9A2" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
          <span className="text-[11px] font-medium text-navy">Google</span>
          {syncing && <RefreshCw className="w-3 h-3 text-tiva-teal animate-spin" />}
        </button>

        <button
          onClick={() => handleSync('apple_health')}
          disabled={syncing}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-tiva-teal/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.7 5.3c-1.2.1-2.5.8-3.3 1.7-.7.8-1.4 2.1-1.1 3.4 1.3.1 2.6-.7 3.3-1.6.8-.9 1.4-2.1 1.1-3.5zM20.5 17.1c-.5 1.2-.8 1.7-1.4 2.8-.9 1.5-2.2 3.4-3.8 3.4-1.4 0-1.8-.9-3.7-.9-1.9 0-2.3.9-3.7.9-1.6 0-2.8-1.7-3.7-3.2-2.5-4.3-2.8-9.3-1.2-12 .8-1.2 2.1-2 3.4-2 1.6 0 3 1.1 3.7 1.1.7 0 2.4-1.3 4.2-1.1.7 0 1.9.3 2.8.9.7.5 1.4 1.3 1.8 2.1-1.4.6-2.3 1.9-2.2 3.5.1 1.1.7 2 1.5 2.5-.4 1-.7 1.7-1.3 2.5z"/>
          </svg>
          <span className="text-[11px] font-medium text-navy">Apple</span>
          {syncing && <RefreshCw className="w-3 h-3 text-tiva-teal animate-spin" />}
        </button>
      </div>

      {error && (
        <div className="mt-2 flex items-start gap-1.5 p-2 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-3 h-3 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-destructive leading-tight">{error}</p>
        </div>
      )}

      {result && result.critical_alerts > 0 && (
        <div className="mt-2 flex items-start gap-1.5 p-2 rounded-lg bg-peach/10 border border-peach/20">
          <AlertCircle className="w-3 h-3 text-peach-deep flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-peach-deep leading-tight">{result.critical_alerts} critical reading(s) detected — your caregiver has been notified.</p>
        </div>
      )}

      {!bridgeAvailable && !error && (
        <div className="mt-2 flex items-center gap-1.5 p-2 rounded-lg bg-lavender border border-tiva-teal/10">
          <Smartphone className="w-3 h-3 text-tiva-teal flex-shrink-0" />
          <p className="text-[9px] text-muted-foreground leading-tight">Open in the Tiva mobile app to sync from your wearable device.</p>
        </div>
      )}
    </div>
  );
}