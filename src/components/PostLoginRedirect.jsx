import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { isMobileDevice, hasDeviceOverride } from '@/utils/deviceDetect';
import DeviceMismatch from '@/components/DeviceMismatch';

export default function PostLoginRedirect() {
  const [dest, setDest] = useState(null);
  const [deviceMismatch, setDeviceMismatch] = useState(null); // null | 'desktop' | 'mobile'
  const [targetDest, setTargetDest] = useState('/');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let user = await base44.auth.me();
        if (!user) {
          // Wait briefly in case Supabase is parsing URL hash token
          await new Promise((r) => setTimeout(r, 500));
          user = await base44.auth.me();
        }
        if (!active) return;

        const onMobile = isMobileDevice();
        const override = hasDeviceOverride();

        // Admins go to institution portal
        const isAdmin = ['admin', 'institution_admin', 'super_admin'].includes(user?.role);
        if (isAdmin) {
          setTargetDest('/institution');
          if (onMobile && !override) {
            setDeviceMismatch('desktop');
            return;
          }
          setDest('/institution');
          return;
        }

        // Check if user is a caregiver
        try {
          const res = await base44.functions.invoke('caregiverPortal', { action: 'check_caregiver' });
          if (active && (res.data?.is_caregiver || user?.role === 'caregiver')) {
            setTargetDest('/caregiver');
            if (!onMobile && !override) {
              setDeviceMismatch('mobile');
              return;
            }
            setDest('/caregiver');
            return;
          }
        } catch {}

        // Default: patient home
        setTargetDest('/');
        if (!onMobile && !override) {
          setDeviceMismatch('mobile');
          return;
        }
        setDest('/');
      } catch {
        if (active) setDest('/');
      }
    })();
    return () => { active = false; };
  }, []);

  if (deviceMismatch) {
    return (
      <DeviceMismatch
        requiredDevice={deviceMismatch}
        onContinue={() => setDest(targetDest)}
      />
    );
  }

  if (!dest) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-tiva-teal flex items-center justify-center animate-pulse-soft">
            <span className="text-[#0A0F0D] font-heading font-bold text-xl">T</span>
          </div>
          <div className="w-8 h-8 rounded-full animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: 'rgba(64,201,162,0.2)', borderTopColor: '#40C9A2' }} />
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <Navigate to={dest} replace />;
}