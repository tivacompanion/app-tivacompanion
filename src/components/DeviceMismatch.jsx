import React from 'react';
import { Monitor, Smartphone, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { setDeviceOverride } from '@/utils/deviceDetect';

/**
 * Full-screen gate shown when a user accesses the app from a device
 * that doesn't match their role's intended platform.
 *
 * requiredDevice="desktop" → institution admins must use web/desktop
 * requiredDevice="mobile"  → caregivers & patients must use the mobile app
 */
export default function DeviceMismatch({ requiredDevice, onContinue }) {
  const isDesktopRequired = requiredDevice === 'desktop';

  const handleLogout = () => {
    base44.auth.logout(window.location.origin + '/login');
  };

  const handleContinueAnyway = () => {
    setDeviceOverride(true);
    if (typeof onContinue === 'function') {
      onContinue();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-canvas p-6">
      <div className="max-w-md w-full text-center animate-settle">
        <div className="w-20 h-20 rounded-3xl bg-tiva-teal/10 flex items-center justify-center mx-auto mb-6 border border-tiva-teal/20">
          {isDesktopRequired ? (
            <Monitor className="w-10 h-10 text-tiva-teal" strokeWidth={1.5} />
          ) : (
            <Smartphone className="w-10 h-10 text-tiva-teal" strokeWidth={1.5} />
          )}
        </div>

        <h1 className="font-heading font-bold text-2xl text-white mb-3">
          {isDesktopRequired
            ? 'Desktop Required'
            : 'Mobile App Required'}
        </h1>

        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          {isDesktopRequired
            ? 'The Tiva Institution Portal is designed for desktop and laptop browsers. Please switch to a larger screen to access your administrative dashboard, manage caregivers, and monitor patients.'
            : 'Tiva for caregivers and patients is designed for mobile phones. Please access Tiva from your smartphone to get the full experience with health tracking, medication reminders, and emergency support.'}
        </p>

        <div className="tiva-card-soft p-4 mb-6 text-left">
          <p className="text-xs font-semibold text-white mb-2">
            {isDesktopRequired ? 'How to access the Institution Portal:' : 'How to get the Tiva mobile app:'}
          </p>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            {isDesktopRequired ? (
              <>
                <li>1. Open this URL on a desktop or laptop computer</li>
                <li>2. Log in with your institution admin credentials</li>
                <li>3. You'll be taken to the institution dashboard</li>
              </>
            ) : (
              <>
                <li>1. Open this link on your smartphone</li>
                <li>2. Log in with your Tiva account</li>
                <li>3. Or install the Tiva app from your app store</li>
              </>
            )}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleContinueAnyway}
            className="tiva-mint-btn px-6 py-2.5 text-sm"
          >
            Continue on this device anyway
          </button>
          <button
            onClick={handleLogout}
            className="tiva-lavender-btn px-6 py-2.5 text-sm inline-flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}