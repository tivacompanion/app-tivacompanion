import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, CheckCircle2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import BloodPressureStep from '@/components/monthlyCheckIn/BloodPressureStep';
import WeightStep from '@/components/monthlyCheckIn/WeightStep';
import HeartRateStep from '@/components/monthlyCheckIn/HeartRateStep';
import WellnessScoreStep from '@/components/monthlyCheckIn/WellnessScoreStep';
import SummaryStep from '@/components/monthlyCheckIn/SummaryStep';

const PROGRESS_KEY = 'tiva_monthly_checkin_progress';
const PROGRESS_TS_KEY = 'tiva_monthly_checkin_progress_ts';
const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

const TOTAL_STEPS = 5; // 4 inputs + summary

export default function MonthlyCheckIn({ checkInType = 'patient_initiated', onClose }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [bp, setBp] = useState({ systolic: '', diastolic: '' });
  const [weight, setWeight] = useState(null);
  const [heartRate, setHeartRate] = useState(null);
  const [hrMethod, setHrMethod] = useState('manual');
  const [wellnessScore, setWellnessScore] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  // Resume from saved progress
  useEffect(() => {
    const savedTs = localStorage.getItem(PROGRESS_TS_KEY);
    if (savedTs && Date.now() - parseInt(savedTs) < FORTY_EIGHT_HOURS) {
      const saved = localStorage.getItem(PROGRESS_KEY);
      if (saved) {
        try {
          const p = JSON.parse(saved);
          if (p.bp) setBp(p.bp);
          if (p.weight != null) setWeight(p.weight);
          if (p.heartRate != null) setHeartRate(p.heartRate);
          if (p.hrMethod) setHrMethod(p.hrMethod);
          if (p.wellnessScore != null) setWellnessScore(p.wellnessScore);
          if (p.step != null) setStep(p.step);
        } catch {}
      }
    } else {
      localStorage.removeItem(PROGRESS_KEY);
      localStorage.removeItem(PROGRESS_TS_KEY);
    }
  }, []);

  // Save progress
  const saveProgress = (s) => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      step: s, bp, weight, heartRate, hrMethod, wellnessScore,
    }));
    localStorage.setItem(PROGRESS_TS_KEY, Date.now().toString());
  };

  const canProceed = () => {
    if (step === 0) return bp.systolic && bp.diastolic && bp.systolic >= 60 && bp.systolic <= 250 && bp.diastolic >= 40 && bp.diastolic <= 150;
    if (step === 1) return weight != null && weight >= 20 && weight <= 300;
    if (step === 2) return hrMethod === 'skipped' || (heartRate != null && heartRate >= 30 && heartRate <= 200);
    if (step === 3) return wellnessScore != null;
    return true;
  };

  const next = () => {
    const nextStep = step + 1;
    setStep(nextStep);
    saveProgress(nextStep);
  };

  const back = () => {
    const prevStep = Math.max(0, step - 1);
    setStep(prevStep);
    saveProgress(prevStep);
  };

  const isCritical = bp.systolic > 180 || bp.diastolic > 120;

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = {
      systolic_bp: parseInt(bp.systolic),
        diastolic_bp: parseInt(bp.diastolic),
        weight_kg: parseFloat(weight),
        ...(heartRate != null ? { heart_rate: parseInt(heartRate), heart_rate_capture_method: hrMethod } : {}),
        wellness_score: wellnessScore,
        check_in_type: checkInType,
        submitted_at: new Date().toISOString(),
        critical_alert_triggered: isCritical,
    };

    try {
      // Store the check-in observation
      await base44.entities.CheckInObservation.create(payload);

      // Also store as HealthReading entries for existing dashboard integration
      await base44.entities.HealthReading.create({
        metric_type: 'blood_pressure_systolic',
        value: payload.systolic_bp,
        secondary_value: payload.diastolic_bp,
        unit: 'mmHg',
        source: 'manual',
        recorded_at: payload.submitted_at,
        risk_level: isCritical ? 'red' : (payload.systolic_bp > 140 || payload.diastolic_bp > 90 ? 'amber' : 'green'),
        notes: 'Monthly health check-in',
      }).catch(() => {});

      await base44.entities.HealthReading.create({
        metric_type: 'weight',
        value: payload.weight_kg,
        unit: 'kg',
        source: 'manual',
        recorded_at: payload.submitted_at,
        risk_level: 'green',
        notes: 'Monthly health check-in',
      }).catch(() => {});

      if (heartRate != null) {
        await base44.entities.HealthReading.create({
          metric_type: 'heart_rate',
          value: payload.heart_rate,
          unit: 'bpm',
          source: 'manual',
          recorded_at: payload.submitted_at,
          risk_level: payload.heart_rate > 100 || payload.heart_rate < 50 ? 'amber' : 'green',
          notes: `Monthly check-in (${hrMethod})`,
        }).catch(() => {});
      }

      await base44.entities.WellnessEntry.create({
        entry_type: 'mental_check',
        title: 'Monthly Check-in Wellness Score',
        mood_score: payload.wellness_score,
        content: `Wellness score: ${payload.wellness_score}/5 from monthly check-in`,
        completed: true,
      }).catch(() => {});

      // Invoke backend for critical BP alert + clinician notification
      await base44.functions.invoke('submitMonthlyCheckIn', payload).catch(() => {});

      // Update profile last check-in time
      const profiles = await base44.entities.HealthProfile.list().catch(() => []);
      if (profiles[0]) {
        await base44.entities.HealthProfile.update(profiles[0].id, {
          last_checkin_completed_at: new Date().toISOString(),
        }).catch(() => {});
      }

      // Clear saved progress
      localStorage.removeItem(PROGRESS_KEY);
      localStorage.removeItem(PROGRESS_TS_KEY);

      setSubmitting(false);
      setComplete(true);
    } catch (e) {
      setSubmitting(false);
      // Store locally for offline sync
      const offlineQueue = JSON.parse(localStorage.getItem('tiva_offline_checkins') || '[]');
      offlineQueue.push({ ...payload, _cached_at: Date.now() });
      localStorage.setItem('tiva_offline_checkins', JSON.stringify(offlineQueue));
      setComplete(true);
    }
  };

  const handleClose = () => {
    if (step < TOTAL_STEPS - 1 && !complete) {
      saveProgress(step);
    }
    if (onClose) onClose();
    else navigate('/');
  };

  if (complete) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={handleClose}>
        <div className="bg-card/80 backdrop-blur-xl rounded-3xl border border-white/10 w-full max-w-md p-8 text-center animate-slide-up" onClick={e => e.stopPropagation()}>
          <div className="w-20 h-20 rounded-2xl bg-mint flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-mint-deep" />
          </div>
          <h3 className="font-heading font-bold text-xl text-navy mb-2">Check-in complete</h3>
          <p className="text-sm text-muted-foreground mb-6">Your data has been saved.</p>
          <button
            onClick={handleClose}
            className="w-full py-3 rounded-2xl font-heading font-semibold text-sm bg-tiva-teal text-[#0A0F0D] hover:brightness-110 transition-all"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const stepLabels = ['Blood Pressure', 'Weight', 'Heart Rate', 'Wellness', 'Review'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={handleClose}>
      <div
        className="bg-card/80 backdrop-blur-xl rounded-3xl border border-white/10 w-full max-w-md p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-tiva-teal flex items-center justify-center">
              <span className="text-[#0A0F0D] font-heading font-bold text-sm">T</span>
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-navy leading-none">Health Check-in</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">{checkInType === 'scheduled' ? 'Scheduled' : 'Self-initiated'}</p>
            </div>
          </div>
          <button onClick={handleClose} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1.5 mb-6">
          {stepLabels.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-tiva-teal' : i < step ? 'w-4 bg-tiva-teal/50' : 'w-4 bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Steps */}
        {step === 0 && <BloodPressureStep value={bp} onChange={setBp} />}
        {step === 1 && <WeightStep value={weight} onChange={setWeight} />}
        {step === 2 && <HeartRateStep value={heartRate} captureMethod={hrMethod} onChange={setHeartRate} onCaptureMethodChange={setHrMethod} />}
        {step === 3 && <WellnessScoreStep value={wellnessScore} onChange={setWellnessScore} />}
        {step === 4 && (
          <SummaryStep
            data={{ systolic_bp: parseInt(bp.systolic), diastolic_bp: parseInt(bp.diastolic), weight_kg: weight, heart_rate: heartRate, heart_rate_capture_method: hrMethod, wellness_score: wellnessScore }}
            submitting={submitting}
            critical={isCritical}
          />
        )}

        {/* Nav buttons */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button onClick={back} className="px-5 py-3 rounded-2xl font-heading font-semibold text-sm bg-white/5 text-muted-foreground hover:bg-white/10 transition-all flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <button
              onClick={next}
              disabled={!canProceed()}
              className="flex-1 py-3 rounded-2xl font-heading font-semibold text-sm bg-tiva-teal text-[#0A0F0D] disabled:opacity-30 hover:brightness-110 transition-all flex items-center justify-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3 rounded-2xl font-heading font-semibold text-sm bg-tiva-teal text-[#0A0F0D] disabled:opacity-50 hover:brightness-110 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-4 h-4" /> Confirm & Save</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}