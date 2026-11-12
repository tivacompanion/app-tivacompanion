import { base44 } from '@/api/base44Client';

// Risk thresholds for health metrics (matches HealthReading entity enum)
const RISK_RANGES = {
  blood_pressure_systolic: { label: 'Systolic BP', unit: 'mmHg', normal: [90, 120] },
  blood_pressure_diastolic: { label: 'Diastolic BP', unit: 'mmHg', normal: [60, 80] },
  glucose: { label: 'Glucose', unit: 'mg/dL', normal: [70, 110] },
  heart_rate: { label: 'Heart Rate', unit: 'bpm', normal: [60, 100] },
  hrv: { label: 'HRV', unit: 'ms', normal: [20, 100] },
  sleep_hours: { label: 'Sleep', unit: 'hours', normal: [6, 9] },
  steps: { label: 'Steps', unit: 'steps', normal: [4000, 10000] },
  weight: { label: 'Weight', unit: 'kg', normal: [50, 90] },
  spo2: { label: 'Oxygen', unit: '%', normal: [95, 100] },
  temperature: { label: 'Temperature', unit: '°C', normal: [36, 37.5] },
};

export function getRiskLevel(metric, value) {
  const cfg = RISK_RANGES[metric];
  if (!cfg) return 'green';
  const [min, max] = cfg.normal;
  if (value >= min && value <= max) return 'green';
  if (value < min * 0.85 || value > max * 1.15) return 'red';
  return 'amber';
}

export async function createHealthReading({ metric_type, value, secondary_value, source = 'manual', notes = '' }) {
  const cfg = RISK_RANGES[metric_type];
  const risk = getRiskLevel(metric_type, value);
  let interpretation = '';
  if (risk === 'green') interpretation = `Your ${cfg.label} is within the normal range.`;
  else if (risk === 'amber') interpretation = `Your ${cfg.label} is slightly outside the normal range. Monitor closely.`;
  else interpretation = `Your ${cfg.label} is outside the normal range. Consider contacting your healthcare provider.`;

  await base44.entities.HealthReading.create({
    metric_type,
    value,
    secondary_value: secondary_value || undefined,
    source,
    notes,
    recorded_at: new Date().toISOString(),
    ai_interpretation: interpretation,
    risk_level: risk,
  });

  if (risk === 'red') {
    await base44.entities.Alert.create({
      type: 'health_risk',
      severity: 'red',
      title: `Critical ${cfg.label} reading`,
      description: `Value: ${value}${cfg.unit}. ${interpretation}`,
      trigger_source: source === 'wearable' ? 'bluetooth_device' : 'ai',
      status: 'active',
    });
    try {
      await base44.functions.invoke('notifyCaregiverDangerReading', {
        data: {
          metric_type,
          value,
          secondary_value: secondary_value || null,
          unit: cfg.unit,
          risk_level: risk,
          notes: notes || interpretation,
        },
      });
    } catch {}
  }

  return { risk, interpretation };
}