import { useState, useEffect } from 'react';
import { User, Bell, Shield, Mic, LogOut, Save, Languages, Volume2, Heart, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/AppLayout';
import { SectionHeader, LoadingState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CheckInFrequencySettings from '@/components/CheckInFrequencySettings';

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '', date_of_birth: '', gender: 'male', blood_type: 'unknown',
    height_cm: '', weight_kg: '', phone: '', allergies: [], chronic_conditions: [],
    current_medications: [], language: 'en', care_mode: 'general',
  });
  const [allergyInput, setAllergyInput] = useState('');
  const [conditionInput, setConditionInput] = useState('');
  const [medInput, setMedInput] = useState('');
  const [prefs, setPrefs] = useState({
    voiceEnabled: true, voiceResponses: true, smsFallback: true, notifications: true,
    checkInFrequency: localStorage.getItem('checkInFrequency') || '8h',
    wakeWord: localStorage.getItem('wakeWordEnabled') === 'true',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [profiles, u] = await Promise.all([
      base44.entities.HealthProfile.list().catch(() => []),
      base44.auth.me().catch(() => null),
    ]);
    const p = profiles[0];
    setUser(u);
    if (p) {
      setProfile(p);
      setForm({
        full_name: p.full_name || '', date_of_birth: p.date_of_birth || '', gender: p.gender || 'male',
        blood_type: p.blood_type || 'unknown', height_cm: p.height_cm || '', weight_kg: p.weight_kg || '',
        phone: p.phone || '', allergies: p.allergies || [], chronic_conditions: p.chronic_conditions || [],
        current_medications: p.current_medications || [], language: p.language || 'en', care_mode: p.care_mode || 'general',
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      height_cm: form.height_cm ? parseFloat(form.height_cm) : undefined,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
      profile_complete: true,
    };
    if (profile) {
      await base44.entities.HealthProfile.update(profile.id, data);
    } else {
      await base44.entities.HealthProfile.create(data);
    }
    setSaving(false);
    loadData();
  };

  const addAllergy = () => {
    if (allergyInput.trim()) {
      setForm({...form, allergies: [...form.allergies, allergyInput.trim()]});
      setAllergyInput('');
    }
  };
  const addCondition = () => {
    if (conditionInput.trim()) {
      setForm({...form, chronic_conditions: [...form.chronic_conditions, conditionInput.trim()]});
      setConditionInput('');
    }
  };
  const addMed = () => {
    if (medInput.trim()) {
      setForm({...form, current_medications: [...form.current_medications, medInput.trim()]});
      setMedInput('');
    }
  };

  if (loading) return <AppLayout><LoadingState label="Loading settings..." /></AppLayout>;

  return (
    <AppLayout>
      <SectionHeader title="Settings" subtitle="Manage your profile and preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Personal Info */}
          <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
            <h3 className="font-heading font-semibold text-navy mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-lavender-deep" /> Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="Your name" />
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input type="date" value={form.date_of_birth} onChange={e => setForm({...form, date_of_birth: e.target.value})} />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={v => setForm({...form, gender: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Blood Type</Label>
                <Select value={form.blood_type} onValueChange={v => setForm({...form, blood_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Height (cm)</Label>
                <Input type="number" value={form.height_cm} onChange={e => setForm({...form, height_cm: e.target.value})} placeholder="170" />
              </div>
              <div>
                <Label>Weight (kg)</Label>
                <Input type="number" value={form.weight_kg} onChange={e => setForm({...form, weight_kg: e.target.value})} placeholder="70" />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+237 6XX XXX XXX" />
                <p className="text-xs text-muted-foreground mt-1">Your caregivers can call you using this number</p>
              </div>
            </div>
          </div>

          {/* Medical Info */}
          <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
            <h3 className="font-heading font-semibold text-navy mb-4 flex items-center gap-2">
              <Heart className="w-4 h-4 text-mint-deep" /> Medical Information
            </h3>
            <div className="space-y-4">
              <div>
                <Label>Allergies</Label>
                <div className="flex gap-2 mb-2">
                  <Input value={allergyInput} onChange={e => setAllergyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addAllergy()} placeholder="Add allergy" />
                  <Button onClick={addAllergy} variant="outline">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.allergies.map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-peach/40 text-peach-deep text-sm">
                      {a}
                      <button onClick={() => setForm({...form, allergies: form.allergies.filter((_, idx) => idx !== i)})} className="ml-1">×</button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <Label>Chronic Conditions</Label>
                <div className="flex gap-2 mb-2">
                  <Input value={conditionInput} onChange={e => setConditionInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCondition()} placeholder="Add condition" />
                  <Button onClick={addCondition} variant="outline">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.chronic_conditions.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-lavender text-lavender-deep text-sm">
                      {c}
                      <button onClick={() => setForm({...form, chronic_conditions: form.chronic_conditions.filter((_, idx) => idx !== i)})} className="ml-1">×</button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <Label>Current Medications</Label>
                <div className="flex gap-2 mb-2">
                  <Input value={medInput} onChange={e => setMedInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMed()} placeholder="Add medication" />
                  <Button onClick={addMed} variant="outline">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.current_medications.map((m, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-mint text-mint-deep text-sm">
                      {m}
                      <button onClick={() => setForm({...form, current_medications: form.current_medications.filter((_, idx) => idx !== i)})} className="ml-1">×</button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <Label>Care Mode</Label>
                <Select value={form.care_mode} onValueChange={v => setForm({...form, care_mode: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Health</SelectItem>
                    <SelectItem value="diabetes">Diabetes Management</SelectItem>
                    <SelectItem value="hypertension">Hypertension Management</SelectItem>
                    <SelectItem value="heart_disease">Heart Disease</SelectItem>
                    <SelectItem value="elderly">Elderly Care</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="bg-tiva-teal text-[#0A0F0D]">
            <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>

        {/* Preferences Sidebar */}
        <div className="space-y-4">
          {/* Language */}
          <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
            <h3 className="font-heading font-semibold text-navy mb-4 flex items-center gap-2">
              <Languages className="w-4 h-4 text-lavender-deep" /> Language
            </h3>
            <Select value={form.language} onValueChange={v => setForm({...form, language: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇬🇧 English</SelectItem>
                <SelectItem value="fr">🇫🇷 Français</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">Tiva speaks both English and French</p>
          </div>

          {/* Voice & Audio */}
          <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
            <h3 className="font-heading font-semibold text-navy mb-4 flex items-center gap-2">
              <Mic className="w-4 h-4 text-mint-deep" /> Voice & Audio
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-navy">Voice Input</span>
                </div>
                <input type="checkbox" checked={prefs.voiceEnabled} onChange={e => setPrefs({...prefs, voiceEnabled: e.target.checked})} className="w-10 h-5 appearance-none bg-white/10 rounded-full relative cursor-pointer transition-colors checked:bg-mint-deep before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-5" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-navy">Voice Responses</span>
                </div>
                <input type="checkbox" checked={prefs.voiceResponses} onChange={e => setPrefs({...prefs, voiceResponses: e.target.checked})} className="w-10 h-5 appearance-none bg-white/10 rounded-full relative cursor-pointer transition-colors checked:bg-mint-deep before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-5" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm text-navy block">"Hey Tiva" Wake Word</span>
                    <span className="text-[11px] text-muted-foreground">Say "Hey Tiva" to open chat hands-free</span>
                  </div>
                </div>
                <input type="checkbox" checked={prefs.wakeWord} onChange={e => {
                  localStorage.setItem('wakeWordEnabled', e.target.checked ? 'true' : 'false');
                  window.dispatchEvent(new Event('wakeWordToggle'));
                  setPrefs({...prefs, wakeWord: e.target.checked});
                }} className="w-10 h-5 appearance-none bg-white/10 rounded-full relative cursor-pointer transition-colors checked:bg-mint-deep before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-5" />
              </label>
            </div>
          </div>

          {/* Monthly Health Check-in Frequency */}
          {profile && <CheckInFrequencySettings profile={profile} onProfileUpdate={loadData} />}

          {/* Daily Check-in */}
          <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
            <h3 className="font-heading font-semibold text-navy mb-4 flex items-center gap-2">
              <Heart className="w-4 h-4 text-mint-deep" /> Daily Check-in
            </h3>
            <Label>Check-in Frequency</Label>
            <Select
              value={prefs.checkInFrequency}
              onValueChange={v => {
                localStorage.setItem('checkInFrequency', v);
                setPrefs({ ...prefs, checkInFrequency: v });
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="4h">Every 4 hours</SelectItem>
                <SelectItem value="6h">Every 6 hours</SelectItem>
                <SelectItem value="8h">Every 8 hours</SelectItem>
                <SelectItem value="12h">Every 12 hours</SelectItem>
                <SelectItem value="24h">Once daily</SelectItem>
                <SelectItem value="manual">Manual only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">How often Tiva automatically prompts you for a health check-in popup.</p>
          </div>

          {/* Notifications */}
          <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
            <h3 className="font-heading font-semibold text-navy mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-peach-deep" /> Notifications
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-navy">Push Notifications</span>
                <input type="checkbox" checked={prefs.notifications} onChange={e => setPrefs({...prefs, notifications: e.target.checked})} className="w-10 h-5 appearance-none bg-white/10 rounded-full relative cursor-pointer transition-colors checked:bg-mint-deep before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-5" />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-navy">SMS Fallback</span>
                <input type="checkbox" checked={prefs.smsFallback} onChange={e => setPrefs({...prefs, smsFallback: e.target.checked})} className="w-10 h-5 appearance-none bg-white/10 rounded-full relative cursor-pointer transition-colors checked:bg-mint-deep before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-5" />
              </label>
            </div>
          </div>

          {/* Account */}
          <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
            <h3 className="font-heading font-semibold text-navy mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-navy" /> Account
            </h3>
            <p className="text-sm text-muted-foreground mb-3">{user?.email || 'No email on file'}</p>
            <button
              onClick={() => base44.auth.logout().then(() => window.location.href = '/login')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold hover:bg-destructive/20 transition-all"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}