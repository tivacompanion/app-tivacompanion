import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Droplet, Ruler, HeartPulse, AlertTriangle, Phone, Languages,
  ArrowRight, ArrowLeft, Check, Sparkles, Plus, X
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const STEPS = [
  { id: 0, label: 'Language', icon: Languages },
  { id: 1, label: 'Identity', icon: User },
  { id: 2, label: 'Body', icon: Ruler },
  { id: 3, label: 'History', icon: HeartPulse },
  { id: 4, label: 'Emergency', icon: Phone },
  { id: 5, label: 'Preferences', icon: Sparkles },
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];
const GENDERS = ['male', 'female', 'other'];
const CARE_MODES = [
  { value: 'general', label: 'General Wellness' },
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'hypertension', label: 'Hypertension' },
  { value: 'heart_disease', label: 'Heart Disease' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    date_of_birth: '',
    gender: '',
    blood_type: 'unknown',
    height_cm: '',
    weight_kg: '',
    phone: '',
    allergies: [],
    chronic_conditions: [],
    emergency_contacts: [],
    language: 'en',
    care_mode: 'general',
  });
  const [newAllergy, setNewAllergy] = useState('');
  const [newCondition, setNewCondition] = useState('');
  const [newContact, setNewContact] = useState({ name: '', relationship: '', phone: '', tier: 'family' });

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u?.full_name) setForm(f => ({ ...f, full_name: u.full_name }));
    }).catch(() => {});
  }, []);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const canProceed = () => {
    if (step === 1) return form.full_name.trim().length > 0;
    return true;
  };

  const next = () => {
    if (!canProceed()) { setError('Please fill in the required fields.'); return; }
    setError('');
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => { setError(''); setStep(s => Math.max(s - 1, 0)); };

  const addAllergy = () => {
    if (!newAllergy.trim()) return;
    update('allergies', [...form.allergies, newAllergy.trim()]);
    setNewAllergy('');
  };
  const addCondition = () => {
    if (!newCondition.trim()) return;
    update('chronic_conditions', [...form.chronic_conditions, newCondition.trim()]);
    setNewCondition('');
  };
  const addContact = () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) return;
    update('emergency_contacts', [...form.emergency_contacts, { ...newContact }]);
    setNewContact({ name: '', relationship: '', phone: '', tier: 'family' });
  };

  const finish = async () => {
    if (!form.full_name.trim()) { setError('Your name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        full_name: form.full_name.trim(),
        date_of_birth: form.date_of_birth || undefined,
        gender: form.gender || undefined,
        blood_type: form.blood_type,
        height_cm: form.height_cm ? Number(form.height_cm) : undefined,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
        phone: form.phone || undefined,
        allergies: form.allergies,
        chronic_conditions: form.chronic_conditions,
        emergency_contacts: form.emergency_contacts,
        language: form.language,
        care_mode: form.care_mode,
      };
      await base44.entities.HealthProfile.create(payload);
      window.location.href = '/';
    } catch (e) {
      setError(e.message || 'Could not save your profile. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-tiva-teal flex items-center justify-center">
            <span className="text-[#0A0F0D] font-heading font-bold text-lg">T</span>
          </div>
          <div>
            <h1 className="font-heading font-bold text-xl text-navy leading-none">Welcome to Tiva</h1>
            <p className="text-xs text-muted-foreground mt-1">Let's set up your health profile</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const active = s.id === step;
            const done = s.id < step;
            return (
              <div key={s.id} className="flex-1 flex items-center gap-1.5">
                <div className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all ${
                  active ? 'bg-tiva-teal text-[#0A0F0D]' :
                  done ? 'bg-mint text-mint-deep' : 'bg-white/5 text-muted-foreground'
                }`}>
                  {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                {s.id < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 rounded-full ${done ? 'bg-mint' : 'bg-white/10'}`} />
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Step {step + 1} of {STEPS.length} · {STEPS[step].label}
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 pb-8 max-w-2xl mx-auto w-full">
        <div className="tiva-card p-6 lg:p-8 animate-settle">

          {/* Step 0: Language */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading font-bold text-lg text-navy mb-1">Choose your language</h2>
                <p className="text-sm text-muted-foreground mb-4">You can change this later in settings.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[{ v: 'en', l: 'English', sub: 'Welcome' }, { v: 'fr', l: 'Français', sub: 'Bienvenue' }].map(o => (
                  <button
                    key={o.v}
                    onClick={() => update('language', o.v)}
                    className={`p-6 rounded-2xl text-center transition-all border-2 ${
                      form.language === o.v ? 'border-tiva-teal bg-tiva-teal/15 text-navy' : 'border-white/10 text-muted-foreground hover:border-white/20'
                    }`}
                  >
                    <Languages className="w-7 h-7 mx-auto mb-2" />
                    <p className="font-heading font-semibold text-base">{o.l}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{o.sub}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Identity */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading font-bold text-lg text-navy mb-1">What's your name?</h2>
                <p className="text-sm text-muted-foreground mb-4">We'll personalize your Tiva experience.</p>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full Name *</label>
                <input
                  className="tiva-input mt-1.5"
                  value={form.full_name}
                  onChange={e => update('full_name', e.target.value)}
                  placeholder="e.g. Amara Diallo"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date of Birth</label>
                  <input
                    type="date"
                    className="tiva-input mt-1.5"
                    value={form.date_of_birth}
                    onChange={e => update('date_of_birth', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gender</label>
                  <div className="flex gap-2 mt-1.5">
                    {GENDERS.map(g => (
                      <button
                        key={g}
                        onClick={() => update('gender', g)}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium capitalize transition-all border-2 ${
                          form.gender === g ? 'border-tiva-teal bg-tiva-teal/15 text-navy' : 'border-white/10 text-muted-foreground'
                        }`}
                      >{g}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone Number
                </label>
                <input
                  className="tiva-input mt-1.5"
                  type="tel"
                  value={form.phone}
                  onChange={e => update('phone', e.target.value)}
                  placeholder="+237 6XX XXX XXX"
                />
                <p className="text-xs text-muted-foreground mt-1.5">Your caregivers can call you using this number</p>
              </div>
            </div>
          )}

          {/* Step 2: Body */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading font-bold text-lg text-navy mb-1">Body basics</h2>
                <p className="text-sm text-muted-foreground mb-4">Helps Tiva interpret your vitals accurately.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5" /> Blood Type
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-1.5">
                  {BLOOD_TYPES.map(bt => (
                    <button
                      key={bt}
                      onClick={() => update('blood_type', bt)}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
                        form.blood_type === bt ? 'border-tiva-teal bg-tiva-teal/15 text-navy' : 'border-white/10 text-muted-foreground'
                      }`}
                    >{bt}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Height (cm)</label>
                  <input
                    type="number"
                    className="tiva-input mt-1.5"
                    value={form.height_cm}
                    onChange={e => update('height_cm', e.target.value)}
                    placeholder="170"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Weight (kg)</label>
                  <input
                    type="number"
                    className="tiva-input mt-1.5"
                    value={form.weight_kg}
                    onChange={e => update('weight_kg', e.target.value)}
                    placeholder="70"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: History */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading font-bold text-lg text-navy mb-1">Medical history</h2>
                <p className="text-sm text-muted-foreground mb-4">Allergies and conditions keep your care safe.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Allergies
                </label>
                <div className="flex gap-2 mt-1.5">
                  <input
                    className="tiva-input"
                    value={newAllergy}
                    onChange={e => setNewAllergy(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                    placeholder="e.g. Penicillin"
                  />
                  <button onClick={addAllergy} className="tiva-navy-btn px-4 flex items-center gap-1"><Plus className="w-4 h-4" /> Add</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {form.allergies.length === 0 && <span className="text-xs text-muted-foreground">No allergies added.</span>}
                  {form.allergies.map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-peach/15 text-peach-deep text-sm">
                      {a}
                      <button onClick={() => update('allergies', form.allergies.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5" /> Chronic Conditions
                </label>
                <div className="flex gap-2 mt-1.5">
                  <input
                    className="tiva-input"
                    value={newCondition}
                    onChange={e => setNewCondition(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCondition())}
                    placeholder="e.g. Type 2 Diabetes"
                  />
                  <button onClick={addCondition} className="tiva-navy-btn px-4 flex items-center gap-1"><Plus className="w-4 h-4" /> Add</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {form.chronic_conditions.length === 0 && <span className="text-xs text-muted-foreground">No conditions added.</span>}
                  {form.chronic_conditions.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lavender text-lavender-deep text-sm">
                      {c}
                      <button onClick={() => update('chronic_conditions', form.chronic_conditions.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Emergency */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading font-bold text-lg text-navy mb-1">Emergency contacts</h2>
                <p className="text-sm text-muted-foreground mb-4">Who should Tiva reach in an emergency?</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  className="tiva-input"
                  value={newContact.name}
                  onChange={e => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="Contact name"
                />
                <input
                  className="tiva-input"
                  value={newContact.relationship}
                  onChange={e => setNewContact({ ...newContact, relationship: e.target.value })}
                  placeholder="Relationship (e.g. Daughter)"
                />
                <input
                  className="tiva-input"
                  value={newContact.phone}
                  onChange={e => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="Phone number"
                />
                <div className="flex gap-2">
                  <Select
                    value={newContact.tier}
                    onValueChange={v => setNewContact({ ...newContact, tier: v })}
                  >
                    <SelectTrigger className="tiva-input h-[50px] font-normal data-[placeholder]:text-white/40">
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0F1614] border-white/10">
                      <SelectItem value="family" className="text-white focus:bg-tiva-teal focus:text-[#0A0F0D] data-[highlighted]:bg-tiva-teal data-[highlighted]:text-[#0A0F0D]">Tier 1 · Family</SelectItem>
                      <SelectItem value="caregiver" className="text-white focus:bg-tiva-teal focus:text-[#0A0F0D] data-[highlighted]:bg-tiva-teal data-[highlighted]:text-[#0A0F0D]">Tier 2 · Caregiver</SelectItem>
                      <SelectItem value="local_service" className="text-white focus:bg-tiva-teal focus:text-[#0A0F0D] data-[highlighted]:bg-tiva-teal data-[highlighted]:text-[#0A0F0D]">Local Service</SelectItem>
                    </SelectContent>
                  </Select>
                  <button onClick={addContact} className="tiva-navy-btn px-4 flex items-center gap-1"><Plus className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="space-y-2">
                {form.emergency_contacts.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No contacts added yet — you can skip and add later.</p>
                )}
                {form.emergency_contacts.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                    <div className="w-9 h-9 rounded-lg bg-lavender flex items-center justify-center">
                      <Phone className="w-4 h-4 text-lavender-deep" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-navy">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.relationship} · {c.phone}</p>
                    </div>
                    <button onClick={() => update('emergency_contacts', form.emergency_contacts.filter((_, j) => j !== i))}>
                      <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Preferences */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading font-bold text-lg text-navy mb-1">Preferences</h2>
                <p className="text-sm text-muted-foreground mb-4">Tailor Tiva to your needs.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Care Focus</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {CARE_MODES.map(m => (
                    <button
                      key={m.value}
                      onClick={() => update('care_mode', m.value)}
                      className={`py-3 px-3 rounded-xl text-sm font-medium transition-all border-2 text-left ${
                        form.care_mode === m.value ? 'border-tiva-teal bg-tiva-teal/15 text-navy' : 'border-white/10 text-muted-foreground'
                      }`}
                    >{m.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive mt-4">{error}</p>}
        </div>

        {/* Nav buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={back}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-navy disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              disabled={!canProceed()}
              className="tiva-mint-btn flex items-center gap-2 px-6 py-2.5 text-sm disabled:opacity-40"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={saving}
              className="tiva-mint-btn flex items-center gap-2 px-6 py-2.5 text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : <><Sparkles className="w-4 h-4" /> Finish Setup</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}