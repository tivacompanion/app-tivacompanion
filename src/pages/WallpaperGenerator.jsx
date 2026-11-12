import { useState, useEffect, useRef } from 'react';
import { QrCode, Download, Shield, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/AppLayout';
import { SectionHeader, LoadingState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

export default function WallpaperGenerator() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeId, setQrCodeId] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const wallpaperRef = useRef(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profiles = await base44.entities.HealthProfile.list();
      const p = profiles[0];
      if (!p) { setLoading(false); return; }

      // Ensure a qr_code_id exists
      let id = p.qr_code_id;
      if (!id) {
        id = Date.now().toString(36) + Math.random().toString(36).substring(2, 12);
        await base44.entities.HealthProfile.update(p.id, { qr_code_id: id });
      }
      setProfile(p);
      setQrCodeId(id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const snapshotUrl = qrCodeId ? `${window.location.origin}/emergency-snapshot/${qrCodeId}` : '';
  const qrImageUrl = snapshotUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=2&data=${encodeURIComponent(snapshotUrl)}`
    : '';

  const contacts = profile?.emergency_contacts_json || profile?.emergency_contacts || [];
  const personalContacts = contacts.filter(c => c.tier !== 'local_service' && c.phone);

  const handleDownload = async () => {
    if (!wallpaperRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(wallpaperRef.current, {
        useCORS: true,
        backgroundColor: '#000000',
        scale: 3,
      });
      const link = document.createElement('a');
      link.download = 'tiva-emergency-wallpaper.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Download failed:', e);
      alert('Could not generate wallpaper. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(snapshotUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <AppLayout><LoadingState label="Loading your emergency card…" /></AppLayout>;

  if (!profile) {
    return (
      <AppLayout>
        <SectionHeader title="Emergency Wallpaper" subtitle="Create a lock screen with your vital medical info" />
        <div className="bg-card/50 rounded-3xl p-8 border border-white/10 text-center">
          <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Complete your health profile first to generate an emergency wallpaper.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SectionHeader
        title="Emergency Wallpaper"
        subtitle="A lock screen with your vital info for first responders"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wallpaper Preview */}
        <div>
          <p className="text-sm font-semibold text-navy mb-3">Preview</p>
          <div className="flex justify-center">
            {/* This is the actual wallpaper that gets captured */}
            <div
              ref={wallpaperRef}
              className="w-[320px] h-[568px] bg-black rounded-[2rem] overflow-hidden flex flex-col justify-between p-5"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {/* Top Section: Header + Name + Blood */}
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 bg-red-600 px-3 py-1 rounded-full mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-white" />
                  <span className="text-white text-[10px] font-bold tracking-widest">EMERGENCY</span>
                </div>
                <h1 className="text-white font-bold text-2xl leading-tight mb-2">{profile.full_name}</h1>
                <div className="inline-flex bg-red-600 px-4 py-1.5 rounded-lg items-center gap-2">
                  <span className="text-white text-[10px] font-bold uppercase">Blood</span>
                  <span className="text-white font-bold text-lg leading-none">{profile.blood_type || '?'}</span>
                </div>
              </div>

              {/* Middle Section: Allergies + Conditions + Contacts */}
              <div className="space-y-2.5">
                {profile.allergies?.length > 0 && (
                  <div>
                    <p className="text-red-400 text-[9px] font-bold uppercase tracking-wide mb-0.5">⚠ Allergies</p>
                    <p className="text-white text-sm font-semibold leading-snug">{profile.allergies.join(', ')}</p>
                  </div>
                )}
                {profile.chronic_conditions?.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-[9px] font-bold uppercase tracking-wide mb-0.5">Conditions</p>
                    <p className="text-white text-sm font-semibold leading-snug">{profile.chronic_conditions.join(', ')}</p>
                  </div>
                )}
                {personalContacts.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-[9px] font-bold uppercase tracking-wide mb-0.5">Call Emergency Contact</p>
                    {personalContacts.slice(0, 2).map((c, i) => (
                      <p key={i} className="text-white text-sm font-bold leading-snug">
                        {c.name} · {c.phone}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Section: QR Code */}
              <div className="flex flex-col items-center">
                <div className="bg-white p-2 rounded-xl">
                  {qrImageUrl && (
                    <img
                      src={qrImageUrl}
                      alt="Emergency QR Code"
                      crossOrigin="anonymous"
                      className="w-20 h-20"
                      onLoad={() => console.log('QR loaded')}
                      onError={() => console.log('QR failed')}
                    />
                  )}
                </div>
                <p className="text-gray-400 text-[9px] mt-1.5 text-center">Scan for full medical info</p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions & Actions */}
        <div className="space-y-4">
          <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
            <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-tiva-teal" /> How It Works
            </h3>
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-tiva-teal/15 flex items-center justify-center text-tiva-teal text-xs font-bold flex-shrink-0">1</span>
                <p className="text-sm text-muted-foreground">Download the wallpaper image using the button below.</p>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-tiva-teal/15 flex items-center justify-center text-tiva-teal text-xs font-bold flex-shrink-0">2</span>
                <p className="text-sm text-muted-foreground">Set it as your phone's <span className="text-navy font-medium">lock screen wallpaper</span> in your phone settings.</p>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-tiva-teal/15 flex items-center justify-center text-tiva-teal text-xs font-bold flex-shrink-0">3</span>
                <p className="text-sm text-muted-foreground">If you're found unresponsive, responders see your info and can scan the QR code for full details.</p>
              </li>
            </ol>
          </div>

          <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
            <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-tiva-teal" /> Your Snapshot Link
            </h3>
            <p className="text-xs text-muted-foreground mb-2 break-all bg-black/30 rounded-lg p-2 font-mono">{snapshotUrl}</p>
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="border-tiva-teal/40 text-tiva-teal">
              {copied ? <Check className="w-4 h-4 mr-1.5" /> : <QrCode className="w-4 h-4 mr-1.5" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>

          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full bg-tiva-teal text-[#0A0F0D] font-bold h-12 text-base tiva-glow-teal"
          >
            {downloading ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating…</>
            ) : (
              <><Download className="w-5 h-5 mr-2" /> Download Wallpaper</>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            The wallpaper updates automatically when you change your health profile — just re-download to get the latest version.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}