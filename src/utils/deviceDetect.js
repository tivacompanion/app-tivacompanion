/**
 * Detects whether the current device is mobile or desktop.
 * Combines User-Agent sniffing with screen-width media query for reliability.
 */
export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const mobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  const narrowScreen = window.matchMedia('(max-width: 767px)').matches;
  return mobileUA || narrowScreen;
}

export function isDesktopDevice() {
  return !isMobileDevice();
}

/**
 * Checks whether user has explicitly opted to proceed on their current device.
 */
export function hasDeviceOverride() {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem('tiva:device_override') === 'true' || localStorage.getItem('tiva:device_override') === 'true';
  } catch {
    return false;
  }
}

/**
 * Stores or clears user's device override choice.
 */
export function setDeviceOverride(enabled = true) {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) {
      sessionStorage.setItem('tiva:device_override', 'true');
      localStorage.setItem('tiva:device_override', 'true');
    } else {
      sessionStorage.removeItem('tiva:device_override');
      localStorage.removeItem('tiva:device_override');
    }
  } catch {}
}