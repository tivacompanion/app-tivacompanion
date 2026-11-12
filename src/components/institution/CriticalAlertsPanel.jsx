import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Pill, ChevronRight, Bell, CheckCircle, RefreshCw, TrendingUp, Settings2 } from 'lucide-react';
import { RiskBadge } from '@/components/ui/primitives';
import { useAlertSoundSettings } from '@/hooks/useAlertSoundSettings';
import { useInstitutionAlertSound } from '@/hooks/useInstitutionAlertSound';
import AlertSoundSettingsModal from '@/components/institution/AlertSoundSettingsModal';

export default function CriticalAlertsPanel({ institutionId }) {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState(null);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const knownAlertIdsRef = useRef(new Set());
  const { settings } = useAlertSoundSettings();
  const { playAlert } = useInstitutionAlertSound(settings);

  const loadAlerts = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('institutionPortal', { action: 'get_critical_alerts' });
      const newAlerts = res.data?.alerts || [];

      // Detect new alerts and play the appropriate sound
      if (!loading && newAlerts.length > 0) {
        const newOnes = newAlerts.filter(a => !knownAlertIdsRef.current.has(a.id));
        if (newOnes.length > 0) {
          const highest = newOnes.some(a => a.severity === 'red')
            ? 'red'
            : newOnes.some(a => a.severity === 'amber')
              ? 'amber'
              : 'green';
          playAlert(highest);
        }
      }
      knownAlertIdsRef.current = new Set(newAlerts.map(a => a.id));
      setAlerts(newAlerts);
    } catch {
      setAlerts([]);
    }
    setLoading(false);
  }, [loading, playAlert]);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  const handleAcknowledge = async (alertId) => {
    setAcknowledging(alertId);
    try {
      await base44.functions.invoke('institutionPortal', { action: 'acknowledge_alert', alert_id: alertId });
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch {
      // keep showing
    }
    setAcknowledging(null);
  };

  if (loading) {
    return (
      <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-5 h-5 text-peach-deep" />
          <h3 className="font-heading font-semibold text-lg text-navy">Critical Alerts</h3>
        </div>
        <div className="flex items-center justify-center py-6">
          <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  const redAlerts = alerts.filter(a => a.severity === 'red');
  const amberAlerts = alerts.filter(a => a.severity !== 'red');

  return (
    <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-peach-deep" />
          <h3 className="font-heading font-semibold text-lg text-navy">Automated Critical Alerts</h3>
          {alerts.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-destructive/20 text-destructive text-xs font-semibold">
              {alerts.length} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSoundSettings(true)} className="text-muted-foreground hover:text-navy transition-colors p-1.5 rounded-lg hover:bg-white/5" title="Sound & vibration settings">
            <Settings2 className="w-4 h-4" />
          </button>
          <button onClick={loadAlerts} className="text-muted-foreground hover:text-navy transition-colors p-1.5 rounded-lg hover:bg-white/5" title="Refresh alerts">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-mint flex items-center justify-center mb-2">
            <CheckCircle className="w-6 h-6 text-mint-deep" />
          </div>
          <p className="text-sm text-muted-foreground">No critical alerts — all patients stable.</p>
          <p className="text-xs text-muted-foreground mt-1">Scanner runs every 30 minutes checking health changes &amp; missed medications.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Red alerts first */}
          {redAlerts.map(alert => (
            <AlertRow
              key={alert.id}
              alert={alert}
              onAcknowledge={() => handleAcknowledge(alert.id)}
              acknowledging={acknowledging === alert.id}
              onViewPatient={() => navigate(`/institution/patient/${alert.patient_user_id}`)}
            />
          ))}
          {/* Then amber */}
          {amberAlerts.map(alert => (
            <AlertRow
              key={alert.id}
              alert={alert}
              onAcknowledge={() => handleAcknowledge(alert.id)}
              acknowledging={acknowledging === alert.id}
              onViewPatient={() => navigate(`/institution/patient/${alert.patient_user_id}`)}
            />
          ))}
        </div>
      )}

      <AlertSoundSettingsModal open={showSoundSettings} onClose={() => setShowSoundSettings(false)} />
    </div>
  );
}

function AlertRow({ alert, onAcknowledge, acknowledging, onViewPatient }) {
  const isRed = alert.severity === 'red';
  const isMedMissed = alert.alert_category === 'missed_medication' || alert.type === 'medication_missed';
  const isTrend = alert.alert_category === 'concerning_trend' || alert.trigger_source === 'vital_trend_detector';
  const Icon = isMedMissed ? Pill : isTrend ? TrendingUp : AlertTriangle;

  return (
    <div className={`rounded-xl border p-3 flex items-start gap-3 transition-all ${
      isRed
        ? 'bg-destructive/10 border-destructive/30'
        : 'bg-peach/10 border-peach-deep/20'
    }`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isRed ? 'bg-destructive/20' : 'bg-peach/20'
      }`}>
        <Icon className={`w-4 h-4 ${isRed ? 'text-destructive' : 'text-peach-deep'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-navy truncate">{alert.title}</p>
          <RiskBadge level={alert.severity} size="sm" />
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{alert.description}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {alert.patient_name} · {alert.detected_at ? formatTimeAgo(alert.detected_at) : 'recently'}
        </p>
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        <button
          onClick={onViewPatient}
          className="px-2 py-1 rounded-lg text-xs font-medium bg-white/5 text-navy hover:bg-white/10 transition-colors flex items-center gap-0.5"
        >
          View <ChevronRight className="w-3 h-3" />
        </button>
        <button
          onClick={onAcknowledge}
          disabled={acknowledging}
          className="px-2 py-1 rounded-lg text-xs font-medium bg-white/5 text-muted-foreground hover:text-navy hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {acknowledging ? '...' : 'Ack'}
        </button>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'recently';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}