import { base44 } from '@/api/base44Client';

// Alert types that represent real health/safety events — never auto-resolved
const REAL_ALERT_TYPES = [
  'emergency_sos',
  'health_reading',
  'fall_detected',
  'inactivity',
  'medication_missed',
  'health_risk',
  'caregiver_alert',
  'institution_critical',
];

// Keywords that indicate a notification is a setup/profile prompt
const SETUP_KEYWORDS = [
  'setup', 'profile', 'contact', 'add', 'complete', 'configure',
  'medication list', 'emergency contact', 'health profile', 'onboarding',
  'missing', 'fill in', 'finish',
];

/**
 * Resolves active setup/profile-related notifications that match the given topics.
 * Only resolves notifications that look like setup prompts — real health alerts
 * (SOS, fall, inactivity, missed medication, health risk, etc.) are never touched.
 *
 * @param {Array} alerts - current alerts array
 * @param {string[]} topics - keywords to match (e.g. ['contact', 'emergency'])
 */
export async function resolveSetupAlerts(alerts, topics = []) {
  const keywords = topics.length > 0 ? topics : SETUP_KEYWORDS;
  const setupAlerts = (alerts || []).filter(a => {
    if (a.status !== 'active') return false;
    if (REAL_ALERT_TYPES.includes(a.type)) return false;
    const text = `${a.title || ''} ${a.description || ''} ${a.trigger_source || ''}`.toLowerCase();
    return keywords.some(kw => text.includes(kw));
  });

  if (setupAlerts.length === 0) return;

  await Promise.all(setupAlerts.map(a => base44.entities.Alert.update(a.id, {
    status: 'resolved',
    resolved_at: new Date().toISOString(),
    resolved_by: 'Fulfilled by user',
  }))).catch(() => {});
}