import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, BellOff, Clock, CheckCircle2, Phone, Volume2, User, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAlarmSound } from '@/hooks/useAlarmSound';
import { sendEmergencySMS, buildVitalsAlertMessage } from '@/utils/smsAlerts';

export default function CriticalAlertAlarm() {
  const [alerts, setAlerts] = useState([]);
  const [snoozedIds, setSnoozedIds] = useState(new Set());
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [updating, setUpdating] = useState(false);
  const [voicePlaying, setVoicePlaying] = useState(false);
  const audioRef = useRef(null);
  const { start: startAlarm, stop: stopAlarm } = useAlarmSound();

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('caregiverPortal', {
        action: 'fetch_critical_alerts',
      });
      setAlerts(res.data?.alerts || []);
    } catch {
      setAlerts([]);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Filter out snoozed and dismissed alerts
  const activeAlerts = alerts.filter(
    (a) => !snoozedIds.has(a.id) && !dismissedIds.has(a.id)
  );

  // Control alarm sound based on active alerts
  useEffect(() => {
    if (activeAlerts.length > 0) {
      startAlarm();
    } else {
      stopAlarm();
    }
    return () => stopAlarm();
  }, [activeAlerts.length, startAlarm, stopAlarm]);

  // Play voice message when a new alert appears
  const playedVoiceRef = useRef(new Set());
  useEffect(() => {
    for (const alert of activeAlerts) {
      if (alert.voice_url && !playedVoiceRef.current.has(alert.id)) {
        playedVoiceRef.current.add(alert.id);
        // Play voice message after a short delay (after alarm starts)
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.src = alert.voice_url;
            audioRef.current.play().then(() => setVoicePlaying(true)).catch(() => {});
          }
        }, 500);
        break; // Play one voice message at a time
      }
    }
  }, [activeAlerts]);

  const handleSnooze = async (alertId) => {
    setUpdating(true);
    stopAlarm();
    try {
      await base44.functions.invoke('caregiverPortal', {
        action: 'update_alert',
        alert_id: alertId,
        new_status: 'snoozed',
        snooze_minutes: 5,
      });
      setSnoozedIds((prev) => new Set([...prev, alertId]));
      // After 5 minutes, remove from snoozed so it can re-trigger
      setTimeout(() => {
        setSnoozedIds((prev) => {
          const next = new Set(prev);
          next.delete(alertId);
          return next;
        });
        fetchAlerts();
      }, 5 * 60 * 1000);
    } catch {}
    setUpdating(false);
  };

  const handleStop = async (alertId) => {
    setUpdating(true);
    stopAlarm();
    try {
      await base44.functions.invoke('caregiverPortal', {
        action: 'update_alert',
        alert_id: alertId,
        new_status: 'acknowledged',
      });
      setDismissedIds((prev) => new Set([...prev, alertId]));
    } catch {}
    setUpdating(false);
  };

  const handleResolve = async (alertId) => {
    setUpdating(true);
    stopAlarm();
    try {
      await base44.functions.invoke('caregiverPortal', {
        action: 'update_alert',
        alert_id: alertId,
        new_status: 'resolved',
      });
      setDismissedIds((prev) => new Set([...prev, alertId]));
    } catch {}
    setUpdating(false);
  };

  const handleReplayVoice = () => {
    const alertWithVoice = activeAlerts.find((a) => a.voice_url);
    if (alertWithVoice && audioRef.current) {
      audioRef.current.src = alertWithVoice.voice_url;
      audioRef.current.play().then(() => setVoicePlaying(true)).catch(() => {});
    }
  };

  if (activeAlerts.length === 0) return null;

  const primaryAlert = activeAlerts[0];
  const additionalCount = activeAlerts.length - 1;

  return (
    <>
      <audio
        ref={audioRef}
        onEnded={() => setVoicePlaying(false)}
        className="hidden"
      />
      <div className="fixed top-0 left-0 right-0 z-[100] animate-slide-down">
        <div className="bg-destructive/95 backdrop-blur-xl border-b border-destructive/30 shadow-2xl">
          {/* Pulsing red strip at the very top */}
          <div className="h-1 bg-destructive animate-pulse" />

          <div className="max-w-7xl mx-auto px-4 py-3 lg:px-8">
            <div className="flex items-start gap-3">
              {/* Alert Icon */}
              <div className="relative flex-shrink-0 mt-0.5">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center pulse-ring">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Alert Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-heading font-bold text-base text-white">
                    {primaryAlert.title || 'Critical Health Alert'}
                  </h3>
                  {primaryAlert.voice_url && (
                    <button
                      onClick={handleReplayVoice}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/15 hover:bg-white/25 transition-all"
                      title="Replay voice message"
                    >
                      <Volume2 className={`w-3.5 h-3.5 text-white ${voicePlaying ? 'animate-pulse' : ''}`} />
                      <span className="text-[10px] font-medium text-white">Voice</span>
                    </button>
                  )}
                </div>
                <p className="text-sm text-white/90 line-clamp-1">
                  {primaryAlert.description}
                </p>
                {primaryAlert.patient_name && (
                  <p className="flex items-center gap-1 text-xs text-white/70 mt-0.5">
                    <User className="w-3 h-3" /> {primaryAlert.patient_name}
                  </p>
                )}
                {additionalCount > 0 && (
                  <p className="text-xs text-white/60 mt-0.5">
                    + {additionalCount} more active alert{additionalCount > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleSnooze(primaryAlert.id)}
                  disabled={updating}
                  className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 transition-all disabled:opacity-40"
                  title="Snooze for 5 minutes"
                >
                  <Clock className="w-4 h-4 text-white" />
                  <span className="text-[9px] font-medium text-white">Snooze</span>
                </button>
                <button
                  onClick={() => handleStop(primaryAlert.id)}
                  disabled={updating}
                  className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 transition-all disabled:opacity-40"
                  title="Stop alarm sound"
                >
                  <BellOff className="w-4 h-4 text-white" />
                  <span className="text-[9px] font-medium text-white">Stop</span>
                </button>
                <button
                  onClick={() => handleResolve(primaryAlert.id)}
                  disabled={updating}
                  className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl bg-white hover:bg-white/90 transition-all disabled:opacity-40"
                  title="Mark as handled"
                >
                  <CheckCircle2 className="w-4 h-4 text-destructive" />
                  <span className="text-[9px] font-bold text-destructive">Handled</span>
                </button>
              </div>
            </div>

            {/* Quick actions: call patient + notify family contacts */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {primaryAlert.patient_user_id && (
                <CallPatientButton patientUserId={primaryAlert.patient_user_id} />
              )}
              <NotifyFamilyButton alert={primaryAlert} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function CallPatientButton({ patientUserId }) {
  const [phone, setPhone] = useState(null);

  useEffect(() => {
    if (!patientUserId) return;
    base44.functions.invoke('caregiverPortal', { action: 'patient_detail', patient_user_id: patientUserId })
      .then((res) => {
        const p = res.data?.profile?.phone;
        if (p) setPhone(p);
      })
      .catch(() => {});
  }, [patientUserId]);

  if (!phone) return null;

  return (
    <a
      href={`tel:${phone}`}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all w-fit"
    >
      <Phone className="w-4 h-4 text-white" />
      <span className="text-sm font-semibold text-white">Call Patient Now</span>
    </a>
  );
}

function NotifyFamilyButton({ alert }) {
  const [loading, setLoading] = useState(false);
  const [notified, setNotified] = useState(false);

  const handleNotifyFamily = async () => {
    setLoading(true);
    try {
      // Fetch emergency contacts for this patient
      const contacts = [];

      // Try EmergencyContact entity first
      const ecRecords = await base44.entities.EmergencyContact
        .filter({ created_by_id: alert.patient_user_id })
        .catch(() => []);

      for (const ec of ecRecords) {
        if (ec.phone) contacts.push({ name: ec.name, phone: ec.phone });
      }

      // Also try HealthProfile embedded contacts
      const profiles = await base44.entities.HealthProfile
        .filter({ created_by_id: alert.patient_user_id })
        .catch(() => []);

      const profile = profiles?.[0];
      if (profile?.emergency_contacts_json) {
        for (const c of profile.emergency_contacts_json) {
          if (c.phone && !contacts.find(x => x.phone === c.phone)) {
            contacts.push({ name: c.name, phone: c.phone });
          }
        }
      }

      if (contacts.length === 0) {
        return;
      }

      const message = buildVitalsAlertMessage(
        alert.patient_name,
        alert.title?.replace(/^Critical\s+/i, '').split('—')[0]?.trim() || 'vitals',
        alert.description?.match(/(\d+\/\d+|\d+)/)?.[1] || '',
        '',
        alert.description
      );

      sendEmergencySMS(contacts, message);
      setNotified(true);
    } catch {
      // Best-effort
    } finally {
      setLoading(false);
    }
  };

  if (notified) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 w-fit">
        <Users className="w-4 h-4 text-white" />
        <span className="text-sm font-semibold text-white">Family Notified ✓</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleNotifyFamily}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 transition-all w-fit disabled:opacity-40"
      title="Send SMS to family/emergency contacts"
    >
      <Users className="w-4 h-4 text-white" />
      <span className="text-sm font-semibold text-white">
        {loading ? 'Notifying...' : 'Notify Family'}
      </span>
    </button>
  );
}