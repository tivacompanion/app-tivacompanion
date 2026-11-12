/**
 * Send SMS alerts to emergency contacts using the device's native SMS app.
 * Opens sms: URIs with pre-filled body text. Works on mobile (iOS/Android).
 * @param {Array<{name: string, phone: string}>} contacts - Emergency contacts
 * @param {string} message - Pre-filled SMS body
 * @returns {Array<{name: string, phone: string, sent: boolean}>} - Results per contact
 */
export function sendEmergencySMS(contacts, message) {
  const results = [];
  const validContacts = (contacts || []).filter(c => c.phone);

  if (validContacts.length === 0) return results;

  const body = encodeURIComponent(message);

  validContacts.forEach((contact, index) => {
    // Security: allow only valid international and local phone characters to prevent protocol injection
    const phone = (contact.phone || '').replace(/[^0-9+]/g, '');
    if (!phone || phone.length < 3) return;

    // iOS uses & for body param, others use ?
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const smsUri = isIOS
      ? `sms:${phone}&body=${body}`
      : `sms:${phone}?body=${body}`;

    setTimeout(() => {
      window.location.href = smsUri;
    }, index * 1500);

    results.push({ name: contact.name, phone, sent: true });
  });

  return results;
}

export function buildSOSMessage(userName, coordinates = null, snapshotUrl = null) {
  const base = `🚨 TIVA EMERGENCY ALERT 🚨\n\n${userName || 'A Tiva user'} has triggered an emergency SOS. They may need immediate assistance.`;
  const locationLine = coordinates
    ? `\n\n📍 Location: https://maps.google.com/?q=${coordinates.lat},${coordinates.lng}`
    : '';
  const snapshotLine = snapshotUrl
    ? `\n\n🔗 Medical Info: ${snapshotUrl}`
    : '';
  return `${base}${locationLine}${snapshotLine}\n\nThis is an automated alert from the Tiva Health Companion app.`;
}

export function buildVitalsAlertMessage(userName, metric = '', value = '', unit = '', details = '') {
  let metricLine = '';
  if (metric && value) {
    metricLine = `\n\nMetric: ${metric} — ${value} ${unit}`.trim();
  }
  const detailsLine = details ? `\nDetails: ${details}` : '';
  return `⚠️ TIVA HEALTH ALERT ⚠️\n\n${userName || 'A Tiva user'} has a critical health reading that needs attention.${metricLine}${detailsLine}\n\nPlease log in to the Tiva app to view details and take action.\n\n— Automated alert from Tiva Health Companion`;
}