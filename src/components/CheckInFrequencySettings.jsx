import { useState, useEffect } from 'react';
import { CalendarClock, Save, Loader2, Stethoscope } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const OPTIONS = [
  { value: 'weekly', label: 'Weekly', desc: 'Every 7 days' },
  { value: 'every_x_weeks', label: 'Every X weeks', desc: 'Custom interval', needsInput: true },
  { value: 'monthly', label: 'Monthly', desc: '1st of each month (default)' },
];

function getNextCheckinDate(scheduleType, weekInterval, lastCompleted, clinicianOverride) {
  const now = new Date();
  const effective = clinicianOverride || { schedule_type: scheduleType, week_interval: weekInterval };
  const type = effective.schedule_type || scheduleType || 'monthly';

  if (type === 'monthly') {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { date: next, type: 'monthly', interval: null };
  }

  if (type === 'weekly') {
    const base = lastCompleted ? new Date(lastCompleted) : now;
    const next = new Date(base);
    next.setDate(next.getDate() + 7);
    if (next < now) {
      next.setTime(now.getTime());
      next.setDate(next.getDate() + 7);
    }
    return { date: next, type: 'weekly', interval: 1 };
  }

  if (type === 'every_x_weeks') {
    const interval = effective.week_interval || weekInterval || 2;
    const base = lastCompleted ? new Date(lastCompleted) : now;
    const next = new Date(base);
    next.setDate(next.getDate() + interval * 7);
    if (next < now) {
      next.setTime(now.getTime());
      next.setDate(next.getDate() + interval * 7);
    }
    return { date: next, type: 'every_x_weeks', interval };
  }

  return { date: new Date(now.getFullYear(), now.getMonth() + 1, 1), type: 'monthly', interval: null };
}

function formatDate(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getFrequencyText(type, interval) {
  if (type === 'monthly') return 'every month';
  if (type === 'weekly') return 'every week';
  if (type === 'every_x_weeks') return `every ${interval} weeks`;
  return '';
}

export default function CheckInFrequencySettings({ profile, onProfileUpdate }) {
  const [scheduleType, setScheduleType] = useState(profile?.checkin_schedule_type || 'monthly');
  const [weekInterval, setWeekInterval] = useState(profile?.checkin_week_interval || 2);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setScheduleType(profile?.clinician_override?.schedule_type || profile?.checkin_schedule_type || 'monthly');
    setWeekInterval(profile?.clinician_override?.week_interval || profile?.checkin_week_interval || 2);
  }, [profile]);

  const hasOverride = !!profile?.clinician_override;
  const next = getNextCheckinDate(scheduleType, weekInterval, profile?.last_checkin_completed_at, profile?.clinician_override);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updateData = {
        checkin_schedule_type: scheduleType,
        checkin_week_interval: scheduleType === 'every_x_weeks' ? weekInterval : 1,
        next_checkin_date: next.date.toISOString().split('T')[0],
      };
      await base44.entities.HealthProfile.update(profile.id, updateData);
      if (onProfileUpdate) onProfileUpdate();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
      <h3 className="font-heading font-semibold text-navy mb-4 flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-tiva-teal" /> Health Check-in Frequency
      </h3>

      {hasOverride && (
        <div className="mb-4 p-3 rounded-xl bg-lavender border border-lavender-deep/20 flex items-start gap-2">
          <Stethoscope className="w-4 h-4 text-lavender-deep mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-navy">Clinician override active</p>
            <p className="text-xs text-muted-foreground">Your doctor has set your check-in schedule. Patient settings are disabled.</p>
          </div>
        </div>
      )}

      {/* Schedule options */}
      <div className="space-y-2">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            disabled={hasOverride}
            onClick={() => setScheduleType(opt.value)}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
              scheduleType === opt.value
                ? 'border-tiva-teal bg-tiva-teal/15'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex-1">
              <p className="font-heading font-semibold text-sm text-navy">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </div>
            {opt.needsInput && scheduleType === 'every_x_weeks' && (
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={weekInterval}
                  onChange={e => setWeekInterval(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                  disabled={hasOverride}
                  className="w-14 text-center bg-white/10 rounded-lg px-2 py-1.5 text-sm font-bold text-navy border border-white/10 focus:outline-none focus:border-tiva-teal/40"
                />
                <span className="text-xs text-muted-foreground">wks</span>
              </div>
            )}
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              scheduleType === opt.value ? 'border-tiva-teal bg-tiva-teal' : 'border-white/20'
            }`}>
              {scheduleType === opt.value && <div className="w-2 h-2 rounded-full bg-[#0A0F0D]" />}
            </div>
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="mt-4 p-4 rounded-xl bg-tiva-teal/8 border border-tiva-teal/15">
        <p className="text-xs font-semibold text-tiva-teal uppercase tracking-wide mb-1">Preview</p>
        <p className="text-sm text-navy">
          Your next check-in will be on <span className="font-bold">{formatDate(next.date)}</span>.
          {next.type !== 'monthly' && (
            <> After that, <span className="font-bold">{getFrequencyText(next.type, next.interval)}</span>.</>
          )}
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || hasOverride}
        className="w-full mt-4 py-3 rounded-2xl font-heading font-semibold text-sm bg-tiva-teal text-[#0A0F0D] disabled:opacity-50 hover:brightness-110 transition-all flex items-center justify-center gap-2"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> :
         saved ? <>✓ Saved</> :
         <><Save className="w-4 h-4" /> Save Schedule</>}
      </button>
    </div>
  );
}