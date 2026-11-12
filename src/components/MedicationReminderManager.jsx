import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pill, X, Check, Clock, Bell, Volume2, BellOff } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const POLL_INTERVAL = 30000; // 30 seconds

export default function MedicationReminderManager() {
  const [activeReminder, setActiveReminder] = useState(null);
  const [notifPermission, setNotifPermission] = useState('default');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const firedRef = useRef(new Set());
  const pollTimerRef = useRef(null);

  const speak = useCallback((text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.92;
    utter.pitch = 1.05;
    utter.volume = 1;
    window.speechSynthesis.speak(utter);
  }, [voiceEnabled]);

  const showNotification = useCallback((reminder) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      const notif = new Notification('Tiva Medication Reminder', {
        body: reminder.title,
        icon: '/favicon.ico',
        tag: reminder.id,
        requireInteraction: true,
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (e) {
      // Notification API may not be available
    }
  }, []);

  const fireReminder = useCallback((reminder) => {
    if (firedRef.current.has(reminder.id)) return;
    firedRef.current.add(reminder.id);

    // Show browser notification
    showNotification(reminder);

    // Speak the reminder aloud
    const medName = reminder.title.replace(/^Take\s+/i, '');
    const speech = `Tiva here. It's time to take your medication. ${medName}.`;
    speak(speech);

    // Show in-app card
    setActiveReminder(reminder);

    // Update reminder status to 'sent' so it doesn't re-fire
    base44.entities.Reminder.update(reminder.id, { status: 'sent' }).catch(() => {});
  }, [showNotification, speak]);

  const checkReminders = useCallback(async () => {
    try {
      const reminders = await base44.entities.Reminder.filter(
        { type: 'medication', status: 'pending' },
        '-scheduled_time',
        50
      ).catch(() => []);

      const now = new Date();
      const due = reminders.filter(r => new Date(r.scheduled_time) <= now);

      if (due.length > 0 && !activeReminder) {
        fireReminder(due[0]);
      }
    } catch (e) {
      // Silent fail - background check
    }
  }, [activeReminder, fireReminder]);

  // Request notification permission on mount
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => setNotifPermission(p));
    } else {
      setNotifPermission(Notification.permission);
    }
  }, []);

  // Poll for due reminders
  useEffect(() => {
    checkReminders();
    pollTimerRef.current = setInterval(checkReminders, POLL_INTERVAL);
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [checkReminders]);

  // Re-check when tab becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) checkReminders();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [checkReminders]);

  const handleTaken = async () => {
    if (!activeReminder) return;
    const nowIso = new Date().toISOString();
    await base44.entities.Reminder.update(activeReminder.id, {
      status: 'confirmed',
      confirmed_at: nowIso,
    }).catch(() => {});
    try {
      await base44.entities.ReminderLog.create({
        medication_id: activeReminder.related_medication_id || null,
        medication_name: activeReminder.title.replace(/^Take\s+/i, ''),
        scheduled_time: activeReminder.scheduled_time || nowIso,
        status: 'taken',
        taken_at: nowIso,
      });
    } catch {}
    window.speechSynthesis?.cancel();
    setActiveReminder(null);
    // Check for more due reminders
    setTimeout(checkReminders, 1000);
  };

  const handleSnooze = async (minutes = 10) => {
    if (!activeReminder) return;
    const newTime = new Date(Date.now() + minutes * 60 * 1000);
    await base44.entities.Reminder.update(activeReminder.id, {
      status: 'pending',
      scheduled_time: newTime.toISOString(),
    }).catch(() => {});
    firedRef.current.delete(activeReminder.id);
    window.speechSynthesis?.cancel();
    setActiveReminder(null);
    setTimeout(checkReminders, 1000);
  };

  const handleDismiss = () => {
    window.speechSynthesis?.cancel();
    setActiveReminder(null);
    setTimeout(checkReminders, 1000);
  };

  const toggleVoice = () => {
    setVoiceEnabled(prev => {
      if (prev) window.speechSynthesis?.cancel();
      return !prev;
    });
  };

  const requestNotifPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(p => setNotifPermission(p));
    }
  };

  return (
    <>
      {/* Permission banner */}
      {notifPermission === 'default' && (
        <div className="fixed top-4 right-4 z-50 max-w-xs bg-card/80 backdrop-blur-xl rounded-2xl border border-tiva-teal/30 p-4 shadow-lg animate-slide-in">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-tiva-teal flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-heading font-semibold text-navy">Enable Reminders</p>
              <p className="text-xs text-muted-foreground mt-0.5">Allow notifications so Tiva can alert you when medication is due.</p>
              <button onClick={requestNotifPermission} className="mt-2 text-xs font-semibold text-tiva-teal hover:underline">
                Enable Push Notifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active reminder card */}
      {activeReminder && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-slide-down">
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl border-2 border-tiva-teal/40 p-5 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-tiva-teal flex items-center justify-center">
                    <Pill className="w-5 h-5 text-[#0A0F0D]" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive animate-pulse-soft" />
                </div>
                <div>
                  <p className="text-xs font-heading font-semibold text-tiva-teal uppercase tracking-wide">Medication Due</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(activeReminder.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleVoice}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                  title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
                >
                  {voiceEnabled ? <Volume2 className="w-4 h-4 text-tiva-teal" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="mb-4">
              <h3 className="font-heading font-bold text-lg text-navy mb-1">{activeReminder.title}</h3>
              {activeReminder.description && (
                <p className="text-sm text-muted-foreground">{activeReminder.description}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleTaken}
                className="flex-1 py-3 rounded-2xl bg-mint text-mint-deep font-heading font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all active:scale-95"
              >
                <Check className="w-5 h-5" /> Taken Now
              </button>
              <button
                onClick={() => handleSnooze(10)}
                className="px-4 py-3 rounded-2xl bg-white/5 text-navy font-heading font-semibold text-sm flex items-center justify-center gap-1.5 hover:bg-white/10 transition-all"
              >
                <Clock className="w-4 h-4" /> Snooze
              </button>
            </div>

            {/* Re-play voice */}
            <button
              onClick={() => speak(`Tiva here. It's time to take your medication. ${activeReminder.title.replace(/^Take\s+/i, '')}.`)}
              className="w-full mt-2 text-xs text-tiva-teal hover:underline flex items-center justify-center gap-1"
            >
              <Volume2 className="w-3 h-3" /> Replay voice reminder
            </button>
          </div>
        </div>
      )}
    </>
  );
}