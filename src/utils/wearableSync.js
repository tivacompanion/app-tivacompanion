import { base44 } from '@/api/base44Client';

const SYNC_STORAGE_KEY = 'tiva_wearable_last_sync';

// Google Health Connect / Apple HealthKit data type → HealthReading metric_type mapping
const METRIC_MAP = {
  // Google Health Connect types
  'HeartRate': 'heart_rate',
  'RestingHeartRate': 'heart_rate',
  'BloodPressure': 'blood_pressure_systolic',
  'BloodPressureSystolic': 'blood_pressure_systolic',
  'BloodPressureDiastolic': 'blood_pressure_diastolic',
  'BloodGlucose': 'glucose',
  'Weight': 'weight',
  'Steps': 'steps',
  'SleepSession': 'sleep_hours',
  'OxygenSaturation': 'spo2',
  'BodyTemperature': 'temperature',
  'HeartRateVariabilityRmssd': 'hrv',
  // Apple HealthKit types
  'HKQuantityTypeIdentifierHeartRate': 'heart_rate',
  'HKQuantityTypeIdentifierRestingHeartRate': 'heart_rate',
  'HKQuantityTypeIdentifierBloodPressureSystolic': 'blood_pressure_systolic',
  'HKQuantityTypeIdentifierBloodPressureDiastolic': 'blood_pressure_diastolic',
  'HKQuantityTypeIdentifierBloodGlucose': 'glucose',
  'HKQuantityTypeIdentifierBodyMass': 'weight',
  'HKQuantityTypeIdentifierStepCount': 'steps',
  'HKQuantityTypeIdentifierSleepAnalysis': 'sleep_hours',
  'HKQuantityTypeIdentifierOxygenSaturation': 'spo2',
  'HKQuantityTypeIdentifierBodyTemperature': 'temperature',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN': 'hrv',
};

export function normalizeWearableReading(raw) {
  const metric_type = METRIC_MAP[raw.type] || raw.metric_type;
  if (!metric_type) return null;

  let value = Number(raw.value ?? raw.amount ?? raw.quantity);
  if (isNaN(value)) return null;

  let secondary_value = null;
  // Blood pressure often comes as systolic/diastolic pair
  if (raw.diastolic != null) {
    secondary_value = Number(raw.diastolic);
  } else if (raw.secondary_value != null) {
    secondary_value = Number(raw.secondary_value);
  }

  // Sleep comes as minutes — convert to hours
  if (metric_type === 'sleep_hours' && value > 24) {
    value = parseFloat((value / 60).toFixed(1));
  }

  return {
    metric_type,
    value,
    secondary_value: secondary_value || undefined,
    recorded_at: raw.startTime || raw.start_date || raw.recorded_at || new Date().toISOString(),
    notes: raw.notes || '',
  };
}

export function normalizeWearableBatch(rawReadings) {
  return rawReadings
    .map(normalizeWearableReading)
    .filter(r => r !== null);
}

export async function syncWearableData(readings, source = 'google_health') {
  const normalized = normalizeWearableBatch(readings);
  if (normalized.length === 0) {
    return { synced: 0, skipped: 0, critical_alerts: 0, source };
  }

  const response = await base44.functions.invoke('syncWearableData', {
    readings: normalized,
    source,
  });

  if (response.data) {
    localStorage.setItem(SYNC_STORAGE_KEY, new Date().toISOString());
  }

  return response.data;
}

export function getLastSyncTime() {
  return localStorage.getItem(SYNC_STORAGE_KEY);
}

export function isWearableSyncAvailable() {
  // Check if running in a mobile webview with health bridge
  return typeof window !== 'undefined' &&
    (window.TivaHealthBridge || window.webkit?.messageHandlers?.TivaHealthBridge);
}