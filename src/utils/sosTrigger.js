import { base44 } from '@/api/base44Client';
import { sendEmergencySMS, buildSOSMessage } from '@/utils/smsAlerts';

const getCoordinates = () => new Promise((resolve) => {
  if (!navigator.geolocation) return resolve(null);
  navigator.geolocation.getCurrentPosition(
    (pos) => resolve({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) }),
    () => resolve(null),
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
});

const getProfile = async () => {
  try {
    const profiles = await base44.entities.HealthProfile.list();
    return profiles[0] || null;
  } catch (e) { return null; }
};

const notifyCaregivers = async (profile, alertId) => {
  // Notify assigned caregivers via FamilyMessage + caregiver assignments
  try {
    const assignments = await base44.entities.CaregiverAssignment.filter({ status: 'active' }).catch(() => []);
    const messages = [];
    for (const a of assignments) {
      messages.push(base44.entities.FamilyMessage.create({
        sender_name: 'Tiva',
        sender_role: 'tiva',
        recipient_name: a.caregiver_name,
        content: `🚨 EMERGENCY: ${profile?.full_name || 'Your care recipient'} has triggered an SOS alert. They may need immediate help. Check on them now.`,
        message_type: 'text',
        sent_at: new Date().toISOString(),
        is_read: false,
        mood_tag: 'anxious',
      }));
    }
    await Promise.all(messages);
  } catch (e) {}
};

const showPersistentNotification = async (profile, coordinates) => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    try { await Notification.requestPermission(); } catch (e) {}
  }
  if (Notification.permission !== 'granted') return;

  const locationLine = coordinates ? `\n📍 https://maps.google.com/?q=${coordinates.lat},${coordinates.lng}` : '';
  // Persistent: sticky notification that re-shows until dismissed
  const notif = new Notification('🚨 TIVA EMERGENCY SOS', {
    body: `${profile?.full_name || 'User'} triggered an emergency SOS. Help may be needed.${locationLine}`,
    tag: 'tiva-sos',
    requireInteraction: true,
    renotify: true,
  });
  notif.onclick = () => { window.focus(); notif.close(); };
  return notif;
};

/**
 * Triggers a full SOS: logs Alert, sends SMS to contacts + local services,
 * notifies caregivers, and shows a persistent notification.
 * @param {object} opts - { source: 'user' | 'wake_word', phrase?: string }
 */
export async function triggerSOS({ source = 'user', phrase } = {}) {
  const profile = await getProfile();
  const coordinates = await getCoordinates();

  const personalContacts = (profile?.emergency_contacts || []).filter(c => c.tier !== 'local_service');
  const localServices = (profile?.emergency_contacts || []).filter(c => c.tier === 'local_service');

  const snapshotUrl = profile?.qr_code_id
    ? `${window.location.origin}/emergency-snapshot/${profile.qr_code_id}`
    : null;
  const smsMessage = buildSOSMessage(profile?.full_name, coordinates, snapshotUrl);
  const smsResults = sendEmergencySMS(personalContacts, smsMessage);

  // Also SMS local emergency services (ambulance, police, fire)
  if (localServices.length > 0) {
    const serviceMsg = `🚨 MEDICAL EMERGENCY 🚨\n\n${profile?.full_name || 'A Tiva user'} needs emergency assistance.${coordinates ? `\n📍 https://maps.google.com/?q=${coordinates.lat},${coordinates.lng}` : ''}${snapshotUrl ? `\n🔗 Medical Info: ${snapshotUrl}` : ''}\n\n— Automated alert from Tiva Health Companion`;
    sendEmergencySMS(localServices, serviceMsg);
  }

  const alert = await base44.entities.Alert.create({
    type: 'emergency_sos',
    severity: 'red',
    title: source === 'wake_word' ? `Emergency SOS (voice: "${phrase}")` : 'Emergency SOS Triggered',
    description: source === 'wake_word'
      ? `Triggered by voice command: "${phrase}". Emergency contacts and local services notified.`
      : 'User triggered an emergency SOS alert. Emergency contacts have been notified.',
    status: 'active',
    location_lat: coordinates ? parseFloat(coordinates.lat) : undefined,
    location_lng: coordinates ? parseFloat(coordinates.lng) : undefined,
    notified_contacts: [...(personalContacts || []), ...(localServices || [])].map(c => c.name),
    channels_used: smsResults.length > 0 || localServices.length > 0 ? ['push', 'sms'] : ['push'],
  });

  await notifyCaregivers(profile, alert.id);
  await showPersistentNotification(profile, coordinates);

  return { alert, coordinates, contactsNotified: smsResults.length, localServicesNotified: localServices.length };
}