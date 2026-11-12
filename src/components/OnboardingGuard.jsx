import { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { isMobileDevice, hasDeviceOverride } from '@/utils/deviceDetect';
import DeviceMismatch from '@/components/DeviceMismatch';

/**
 * Guards patient-facing routes.
 * Mobile experience recommended; allows desktop override.
 */
export default function OnboardingGuard() {
  const [state, setState] = useState('loading'); // loading | onboard | ready | device_mismatch

  useEffect(() => {
    let active = true;

    // Patients recommended on mobile — allow explicit desktop override
    if (!isMobileDevice() && !hasDeviceOverride()) {
      setState('device_mismatch');
      return;
    }

    base44.entities.HealthProfile.list()
      .then(profiles => {
        if (!active) return;
        setState(profiles && profiles.length > 0 ? 'ready' : 'onboard');
      })
      .catch(() => active && setState('ready'));
    return () => { active = false; };
  }, []);

  if (state === 'loading') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-tiva-teal flex items-center justify-center animate-pulse-soft">
            <span className="text-[#0A0F0D] font-heading font-bold text-xl">T</span>
          </div>
          <div className="w-8 h-8 rounded-full animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: 'rgba(64,201,162,0.2)', borderTopColor: '#40C9A2' }} />
        </div>
      </div>
    );
  }

  if (state === 'onboard') return <Navigate to="/onboarding" replace />;

  if (state === 'device_mismatch') {
    return (
      <DeviceMismatch
        requiredDevice="mobile"
        onContinue={() => setState('ready')}
      />
    );
  }

  return <Outlet />;
}