import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Shield, ArrowRight, Building2 } from 'lucide-react';

export default function AcceptAdminInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invitation token found in the link.');
      setLoading(false);
      return;
    }
    lookupInvite();
  }, [token]);

  const lookupInvite = async () => {
    try {
      const res = await base44.functions.invoke('institutionPortal', { action: 'lookup_admin_invite', token });
      setInvite(res.data?.invite || res.data?.assignment || res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Invalid or expired invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await base44.functions.invoke('institutionPortal', { action: 'accept_admin_invite', token });
      setAccepted(true);
      setTimeout(() => navigate('/institution'), 2500);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to accept invitation');
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-full animate-spin mb-4" style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: 'rgba(64,201,162,0.2)', borderTopColor: '#40C9A2' }} />
        <p className="text-sm text-muted-foreground">Loading your invitation...</p>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center animate-settle">
          <div className="w-20 h-20 rounded-full bg-mint flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-mint-deep" />
          </div>
          <h2 className="font-heading font-bold text-2xl text-navy mb-2">You're now an admin!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            You've been added as an administrator of {invite?.institution_name || 'the institution'}. Taking you to the institution portal...
          </p>
          <Button onClick={() => navigate('/institution')} className="bg-tiva-teal text-[#0A0F0D]">
            Go to Portal <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center animate-settle">
          <div className="w-20 h-20 rounded-full bg-destructive/15 flex items-center justify-center mx-auto mb-5">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="font-heading font-bold text-2xl text-navy mb-2">Invitation Unavailable</h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Button variant="outline" onClick={() => navigate('/')}>Go to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-settle">
        <div className="bg-card/60 backdrop-blur-xl rounded-3xl p-8 border border-tiva-teal/20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-lavender flex items-center justify-center mx-auto mb-5">
            <Building2 className="w-8 h-8 text-lavender-deep" />
          </div>
          <h2 className="font-heading font-bold text-xl text-navy mb-2">Admin Invitation</h2>
          <p className="text-sm text-muted-foreground mb-6">
            <span className="font-semibold text-navy">{invite?.institution_name}</span> has invited you to join as an administrator on Tiva.
          </p>

          <div className="bg-white/5 rounded-2xl p-4 text-left space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Institution</span>
              <span className="text-sm font-semibold text-navy">{invite?.institution_name}</span>
            </div>
            {invite?.admin_name && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Your Name</span>
                <span className="text-sm font-semibold text-navy">{invite?.admin_name}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Invited by</span>
              <span className="text-sm font-semibold text-navy">{invite?.invited_by_name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6 justify-center">
            <Shield className="w-3.5 h-3.5" />
            You'll manage caregivers, monitor patients, and view reports
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/')} className="flex-1">Decline</Button>
            <Button onClick={handleAccept} disabled={accepting} className="flex-1 bg-tiva-teal text-[#0A0F0D]">
              {accepting ? 'Accepting...' : 'Accept Invite'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}