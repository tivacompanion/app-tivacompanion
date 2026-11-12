import { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { isMobileDevice, hasDeviceOverride } from '@/utils/deviceDetect';
import DeviceMismatch from '@/components/DeviceMismatch';

/**
 * Guards routes by role:
 * - role="caregiver": allows access only if user has active CaregiverAssignment records as a caregiver or role='caregiver'
 * - role="admin": allows access if user has admin, institution_admin, or super_admin role
 * Otherwise redirects to fallback (default "/")
 *
 * Device gating:
 * - role="admin": institution portal → desktop recommended (bypassable via user override)
 * - role="caregiver": caregiver dashboard → mobile recommended (bypassable via user override)
 */
export default function RoleGuard({ role, fallback = '/' }) {
  const [state, setState] = useState('loading'); // loading | allowed | denied | device_mismatch

  useEffect(() => {
    let active = true;

    const check = async () => {
      try {
        const onMobile = isMobileDevice();
        const override = hasDeviceOverride();

        if (role === 'admin') {
          // Institution portal — desktop recommended
          if (onMobile && !override) {
            if (!active) return;
            setState('device_mismatch');
            return;
          }
          const user = await base44.auth.me();
          if (!active) return;
          const isAdmin = ['admin', 'institution_admin', 'super_admin'].includes(user?.role);
          setState(isAdmin ? 'allowed' : 'denied');
        } else if (role === 'caregiver') {
          // Caregiver dashboard — mobile recommended
          if (!onMobile && !override) {
            if (!active) return;
            setState('device_mismatch');
            return;
          }
          const res = await base44.functions.invoke('caregiverPortal', { action: 'check_caregiver' });
          if (!active) return;
          setState(res.data?.is_caregiver ? 'allowed' : 'denied');
        } else {
          if (!active) return;
          setState('allowed');
        }
      } catch {
        if (active) setState('denied');
      }
    };

    check();
    return () => { active = false; };
  }, [role]);

  if (state === 'loading') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-canvas">
        <div className="w-8 h-8 rounded-full animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: 'rgba(64,201,162,0.2)', borderTopColor: '#40C9A2' }} />
      </div>
    );
  }

  if (state === 'denied') return <Navigate to={fallback} replace />;

  if (state === 'device_mismatch') {
    return (
      <DeviceMismatch
        requiredDevice={role === 'admin' ? 'desktop' : 'mobile'}
        onContinue={() => setState('allowed')}
      />
    );
  }

  return <Outlet />;
}