import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Siren, Phone, AlertTriangle, Shield, CheckCircle2, Users, QrCode, Check, Bell, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/AppLayout';
import { LoadingState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { resolveSetupAlerts } from '@/utils/setupAlerts';
import { triggerSOS as executeSosTrigger } from '@/utils/sosTrigger';
import SosLocationMap from '@/components/SosLocationMap';
import 'leaflet/dist/leaflet.css';

export default function Emergency() {
  const [alerts, setAlerts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [showAddContact, setShowAddContact] = useState(false);
  const [alertFilter, setAlertFilter] = useState('all');
  const [sosLocation, setSosLocation] = useState(null);
  const [contactForm, setContactForm] = useState({ name: '', relationship: '', phone: '', tier: 'family' });
  const localServices = (profile?.emergency_contacts || []).filter(c => c.tier === 'local_service');
  const personalContacts = (profile?.emergency_contacts || []).filter(c => c.tier !== 'local_service');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (sosActive && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (sosActive && countdown === 0) {
      handleTriggerSOS();
    }
  }, [sosActive, countdown]);

  const loadData = async () => {
    const [alts, p] = await Promise.all([
      base44.entities.Alert.list('-created_date', 20).catch(() => []),
      base44.entities.HealthProfile.list().then(r => r[0]).catch(() => null),
    ]);
    setAlerts(alts);
    setProfile(p);
    const lastSos = alts.find(a => a.type === 'emergency_sos' && a.location_lat != null && a.location_lng != null);
    if (lastSos) {
      setSosLocation({ lat: lastSos.location_lat, lng: lastSos.location_lng, timestamp: lastSos.created_date });
    }
    setLoading(false);
  };

  const startSOS = () => {
    setSosActive(true);
    setCountdown(10);
  };

  const cancelSOS = () => {
    setSosActive(false);
    setCountdown(10);
  };

  const handleTriggerSOS = async () => {
    setSosActive(false);
    const result = await executeSosTrigger({ source: 'user' });
    if (result?.coordinates) {
      setSosLocation({ lat: parseFloat(result.coordinates.lat), lng: parseFloat(result.coordinates.lng), timestamp: new Date().toISOString() });
    }
    loadData();
  };

  const resolveAlert = async (alert) => {
    await base44.entities.Alert.update(alert.id, {
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolution_notes: 'Resolved by user',
    });
    loadData();
  };

  const markAsRead = async (alert) => {
    await base44.entities.Alert.update(alert.id, { status: 'acknowledged' });
    loadData();
  };

  const markAllRead = async () => {
    const unread = alerts.filter(a => a.status === 'active');
    await Promise.all(unread.map(a => base44.entities.Alert.update(a.id, { status: 'acknowledged' })));
    loadData();
  };

  const addContact = async () => {
    if (!contactForm.name || !contactForm.phone) return;
    try {
      const contacts = [...(profile?.emergency_contacts || profile?.emergency_contacts_json || []), contactForm];
      if (profile?.id) {
        await base44.entities.HealthProfile.update(profile.id, { emergency_contacts: contacts });
      } else {
        const newProf = await base44.entities.HealthProfile.create({
          full_name: 'Patient',
          emergency_contacts: contacts,
        });
        setProfile(newProf);
      }
      setContactForm({ name: '', relationship: '', phone: '', tier: 'family' });
      setShowAddContact(false);
      // Auto-resolve any setup/profile notification the user just fulfilled
      await resolveSetupAlerts(alerts, ['contact', 'emergency']);
      loadData();
    } catch (err) {
      console.error('Failed to add emergency contact:', err);
    }
  };

  if (loading) return <AppLayout><LoadingState label="Loading emergency system..." /></AppLayout>;

  return (
    <AppLayout>
      {/* SOS Location Map */}
      {sosLocation && (
        <SosLocationMap lat={sosLocation.lat} lng={sosLocation.lng} timestamp={sosLocation.timestamp} />
      )}

      {/* SOS Activation Card */}
      {sosActive ? (
        <div className="bg-destructive/20 border-2 border-destructive rounded-3xl p-6 mb-6 shadow-2xl animate-pulse-soft">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-16 h-16 rounded-2xl bg-destructive text-white flex items-center justify-center flex-shrink-0 animate-bounce">
                <Siren className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="inline-block w-3 h-3 rounded-full bg-destructive animate-ping" />
                  <h2 className="text-xl font-heading font-black text-white tracking-wide">
                    SOS DISPATCH IN {countdown}s
                  </h2>
                </div>
                <p className="text-sm text-white/90 mt-1 max-w-lg">
                  Broadcasting live GPS coordinates, notifying emergency contacts via SMS, and alerting local emergency services.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-end w-full sm:w-auto">
              <Button
                variant="destructive"
                onClick={handleTriggerSOS}
                className="bg-destructive hover:bg-destructive/90 text-white font-bold px-5 h-11"
              >
                Send Immediately
              </Button>
              <Button
                variant="outline"
                onClick={cancelSOS}
                className="bg-card/80 hover:bg-card border-white/30 text-white font-semibold px-5 h-11"
              >
                Cancel SOS
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-destructive/20 via-destructive/10 to-transparent border border-destructive/30 rounded-3xl p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-destructive/20 border border-destructive/40 text-destructive flex items-center justify-center flex-shrink-0">
                <Siren className="w-6 h-6 animate-pulse-soft" />
              </div>
              <div>
                <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
                  Emergency SOS System
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-destructive/20 text-destructive border border-destructive/30">
                    Active Ready
                  </span>
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5 max-w-xl">
                  Pressing SOS initiates an urgent distress broadcast: contacts receive SMS alerts with your real-time coordinates, medical QR card, and local services are alerted.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
              <Button
                onClick={startSOS}
                className="flex-1 md:flex-none bg-destructive hover:bg-destructive/90 text-white font-bold h-11 px-5 shadow-lg shadow-destructive/20 transition-all hover:scale-[1.02]"
              >
                <Siren className="w-4 h-4 mr-2" /> Start SOS (10s)
              </Button>
              <Button
                onClick={handleTriggerSOS}
                variant="outline"
                className="flex-1 md:flex-none border-destructive/40 text-destructive hover:bg-destructive/10 font-bold h-11 px-4"
              >
                Instant SOS
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Responder Access */}
      <div className="bg-card/50 backdrop-blur-md rounded-3xl p-5 border border-tiva-teal/20 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-tiva-teal/15 flex items-center justify-center flex-shrink-0">
            <QrCode className="w-6 h-6 text-tiva-teal" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-navy mb-1">Emergency Responder Access</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Generate a lock screen wallpaper with your critical medical info and a QR code. First responders can scan it to see your vitals, allergies, medications, and call your emergency contacts — even if you can't speak.
            </p>
            <Link to="/wallpaper">
              <Button className="bg-tiva-teal text-[#0A0F0D]">
                <QrCode className="w-4 h-4 mr-1.5" /> Create Emergency Wallpaper
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Emergency Contacts */}
        <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-navy flex items-center gap-2">
              <Users className="w-4 h-4" /> Emergency Contacts
            </h3>
            <Button size="sm" variant="outline" onClick={() => setShowAddContact(true)}>
              Add Contact
            </Button>
          </div>
          {personalContacts.length === 0 && localServices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No emergency contacts yet. Add family members, caregivers, and local emergency services to receive your SOS alerts.
            </p>
          ) : (
            <div className="space-y-2">
              {personalContacts.map((c, i) => (
                <div key={`p-${i}`} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.tier === 'family' ? 'bg-lavender' : 'bg-mint'}`}>
                    <Phone className={`w-4 h-4 ${c.tier === 'family' ? 'text-lavender-deep' : 'text-mint-deep'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-navy">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.relationship} · {c.phone}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${c.tier === 'family' ? 'bg-lavender text-lavender-deep' : 'bg-mint text-mint-deep'}`}>
                    Tier {c.tier === 'family' ? '1' : '2'}
                  </span>
                </div>
              ))}
              {localServices.length > 0 && (
                <div className="pt-2 mt-2 border-t border-white/10">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Siren className="w-3 h-3" /> Local Emergency Services
                  </p>
                  {localServices.map((c, i) => (
                    <div key={`s-${i}`} className="flex items-center gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20 mb-2">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-destructive/15">
                        <Siren className="w-4 h-4 text-destructive" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-navy">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.relationship} · {c.phone}</p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-destructive/15 text-destructive">
                        Service
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Emergency Health Profile */}
        <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
          <h3 className="font-heading font-semibold text-navy mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Emergency Health Profile
          </h3>
          {profile ? (
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="text-sm font-medium text-navy">{profile.full_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Blood Type</span>
                <span className="text-sm font-medium text-navy">{profile.blood_type || 'Unknown'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Allergies</span>
                <span className="text-sm font-medium text-navy">{profile.allergies?.join(', ') || 'None'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border/30">
                <span className="text-sm text-muted-foreground">Conditions</span>
                <span className="text-sm font-medium text-navy">{profile.chronic_conditions?.join(', ') || 'None'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-muted-foreground">Medications</span>
                <span className="text-sm font-medium text-navy text-right">{profile.current_medications?.join(', ') || 'None'}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Complete your health profile to generate an emergency card.</p>
          )}
        </div>
      </div>

      {/* Alert History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-semibold text-navy">Alert History</h3>
            {alerts.filter(a => a.status === 'active').length > 0 && (
              <span className="text-xs bg-destructive/15 text-destructive px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse-soft" />
                {alerts.filter(a => a.status === 'active').length} unread
              </span>
            )}
          </div>
          {alerts.filter(a => a.status === 'active').length > 0 && (
            <Button size="sm" variant="ghost" onClick={markAllRead} className="text-tiva-teal hover:bg-tiva-teal/10 text-xs">
              <Check className="w-3.5 h-3.5 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        {/* Filter tabs */}
        {alerts.length > 0 && (
          <div className="flex gap-1.5 mb-3">
            {[
              { key: 'all', label: 'All', count: alerts.length },
              { key: 'active', label: 'Unread', count: alerts.filter(a => a.status === 'active').length },
              { key: 'acknowledged', label: 'Read', count: alerts.filter(a => a.status === 'acknowledged').length },
              { key: 'resolved', label: 'Resolved', count: alerts.filter(a => a.status === 'resolved').length },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setAlertFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  alertFilter === tab.key
                    ? 'bg-tiva-teal text-[#0A0F0D]'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                }`}
              >
                {tab.label}
                <span className={`text-[10px] px-1.5 rounded-full ${alertFilter === tab.key ? 'bg-[#0A0F0D]/20' : 'bg-white/10'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {alerts.length === 0 ? (
          <div className="bg-card/50 backdrop-blur-md rounded-2xl p-10 border border-white/10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-mint/15 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8 text-mint-deep" />
            </div>
            <p className="font-heading font-semibold text-navy mb-1">No alerts triggered</p>
            <p className="text-sm text-muted-foreground">You're all safe. Alerts will appear here when SOS or health events occur.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {alerts
              .filter(a => alertFilter === 'all' || a.status === alertFilter)
              .map((a) => {
                const sevColors = {
                  red: { accent: 'bg-destructive', bg: 'bg-destructive/8', border: 'border-l-destructive', icon: 'bg-destructive/15 text-destructive', badge: 'bg-destructive/15 text-destructive' },
                  amber: { accent: 'bg-peach-deep', bg: 'bg-peach/8', border: 'border-l-peach-deep', icon: 'bg-peach/20 text-peach-deep', badge: 'bg-peach/20 text-peach-deep' },
                  green: { accent: 'bg-mint-deep', bg: 'bg-mint/8', border: 'border-l-mint-deep', icon: 'bg-mint/15 text-mint-deep', badge: 'bg-mint/15 text-mint-deep' },
                };
                const sev = sevColors[a.severity] || sevColors.green;
                const isActive = a.status === 'active';
                const isResolved = a.status === 'resolved';
                return (
                  <div
                    key={a.id}
                    className={`relative rounded-2xl border border-white/10 border-l-2 ${sev.border} ${sev.bg} ${isResolved ? 'opacity-55' : isActive ? '' : 'opacity-80'} transition-all hover:bg-white/[0.06] overflow-hidden`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Icon with unread indicator */}
                        <div className="relative flex-shrink-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sev.icon}`}>
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          {isActive && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-destructive border-2 border-card animate-pulse-soft" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1.5 gap-2">
                            <p className={`text-sm text-navy leading-snug ${isActive ? 'font-semibold' : 'font-medium'}`}>{a.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2.5 leading-relaxed">{a.description}</p>

                          {/* Meta row */}
                          <div className="flex items-center flex-wrap gap-2 mb-2.5">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sev.badge}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {a.severity === 'red' ? 'Critical' : a.severity === 'amber' ? 'Attention' : 'Normal'}
                            </span>
                            {isActive && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive flex items-center gap-1">
                                <Bell className="w-2.5 h-2.5" /> Unread
                              </span>
                            )}
                            {a.status === 'acknowledged' && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" /> Read
                              </span>
                            )}
                            {isResolved && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-mint/20 text-mint-deep flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Resolved
                              </span>
                            )}
                            <span className="text-[10px] text-muted-foreground capitalize px-2 py-0.5 rounded-full bg-white/5">
                              {a.type.replace(/_/g, ' ')}
                            </span>
                          </div>

                          {/* Timestamp */}
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(a.created_date).toLocaleString()}
                            {a.channels_used?.length > 0 && (
                              <span className="truncate">· via {a.channels_used.join(', ')}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons row */}
                      {isActive && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                          <Button size="sm" variant="outline" onClick={() => markAsRead(a)} className="flex-1 border-tiva-teal/30 text-tiva-teal hover:bg-tiva-teal/10 h-8 text-xs">
                            <Check className="w-3.5 h-3.5 mr-1" /> Mark as Read
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => resolveAlert(a)} className="flex-1 border-mint-deep/30 text-mint-deep hover:bg-mint/10 h-8 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Resolve
                          </Button>
                        </div>
                      )}
                      {a.status === 'acknowledged' && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                          <Button size="sm" variant="outline" onClick={() => resolveAlert(a)} className="flex-1 border-mint-deep/30 text-mint-deep hover:bg-mint/10 h-8 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Resolve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Add Contact Dialog */}
      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Emergency Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} placeholder="e.g. Marie Nkomo" />
            </div>
            <div>
              <Label>Relationship</Label>
              <Input value={contactForm.relationship} onChange={e => setContactForm({...contactForm, relationship: e.target.value})} placeholder="e.g. Daughter" />
            </div>
            <div>
              <Label>Phone Number</Label>
              <Input value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} placeholder="+237 6XX XXX XXX" />
            </div>
            <div>
              <Label>Tier</Label>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setContactForm({...contactForm, tier: 'family'})}
                    className={`flex-1 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      contactForm.tier === 'family' ? 'border-lavender-deep bg-lavender text-navy' : 'border-border text-muted-foreground'
                    }`}
                  >
                    Tier 1 · Family
                  </button>
                  <button
                    onClick={() => setContactForm({...contactForm, tier: 'caregiver'})}
                    className={`flex-1 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      contactForm.tier === 'caregiver' ? 'border-tiva-teal bg-tiva-teal/15 text-navy' : 'border-border text-muted-foreground'
                    }`}
                  >
                    Tier 2 · Caregiver
                  </button>
                </div>
                <button
                  onClick={() => setContactForm({...contactForm, tier: 'local_service'})}
                  className={`w-full p-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    contactForm.tier === 'local_service' ? 'border-destructive bg-destructive/15 text-destructive' : 'border-border text-muted-foreground'
                  }`}
                >
                  <Siren className="w-4 h-4" /> Local Emergency Service (Ambulance / Police / Fire)
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddContact(false)}>Cancel</Button>
            <Button onClick={addContact} className="bg-tiva-teal text-[#0A0F0D]">Add Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}