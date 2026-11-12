import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import AppLayout from '@/components/AppLayout';
import { SectionHeader, LoadingSpinner, EmptyState } from '@/components/ui/TivaUI';
import { User, Plus, Save, X, Heart, AlertCircle, Globe } from 'lucide-react';

export default function Profile() {
  const { t, language, setLanguage } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const p = await base44.entities.HealthProfile.list().catch(() => []);
      setProfile(p[0] || null);
      if (p[0]) {
        setForm({
          full_name: p[0].full_name || '',
          date_of_birth: p[0].date_of_birth || '',
          gender: p[0].gender || 'male',
          blood_type: p[0].blood_type || 'unknown',
          height_cm: p[0].height_cm || '',
          weight_kg: p[0].weight_kg || '',
          allergies: (p[0].allergies || []).join(', '),
          chronic_conditions: (p[0].chronic_conditions || []).join(', '),
          care_mode: p[0].care_mode || 'general',
          language: p[0].language || 'en',
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    try {
      const data = {
        ...form,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : undefined,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : undefined,
        allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        chronic_conditions: form.chronic_conditions ? form.chronic_conditions.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      if (profile) {
        await base44.entities.HealthProfile.update(profile.id, data);
      } else {
        await base44.entities.HealthProfile.create(data);
      }
      setEditing(false);
      loadData();
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <LoadingSpinner label={t('common.loading')} />
      </AppLayout>
    );
  }

  if (!profile && !editing) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-fade-in">
          <SectionHeader title="Health Profile" subtitle="Your medical information in one place" />
          <EmptyState
            icon={User}
            title="Create your health profile"
            description="Add your name, blood type, allergies, and conditions. Tiva uses this to personalize your care."
            action={<button onClick={() => { setForm({ full_name: '', date_of_birth: '', gender: 'male', blood_type: 'unknown', allergies: '', chronic_conditions: '', care_mode: 'general', language: 'en' }); setEditing(true); }} className="tiva-navy-btn px-6 py-3">Create Profile</button>}
          />
        </div>
      </AppLayout>
    );
  }

  if (editing) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-fade-in">
          <SectionHeader
            title="Edit Health Profile"
            action={<button onClick={() => { setEditing(false); }} className="flex items-center gap-2 px-4 py-3 rounded-2xl font-heading font-semibold text-sm" style={{ backgroundColor: 'var(--tiva-panel)', color: 'var(--tiva-navy)' }}><X size={16} /> Cancel</button>}
          />
          <div className="tiva-card p-6 space-y-4 animate-settle">
            <FormField label="Full Name" value={form.full_name} onChange={v => setForm({ ...form, full_name: v })} />
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Date of Birth" type="date" value={form.date_of_birth} onChange={v => setForm({ ...form, date_of_birth: v })} />
              <div>
                <label className="text-sm font-heading font-semibold mb-1.5 block" style={{ color: 'var(--tiva-navy)', opacity: 0.6 }}>Gender</label>
                <select className="tiva-input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-heading font-semibold mb-1.5 block" style={{ color: 'var(--tiva-navy)', opacity: 0.6 }}>Blood Type</label>
                <select className="tiva-input" value={form.blood_type} onChange={e => setForm({ ...form, blood_type: e.target.value })}>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'].map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-heading font-semibold mb-1.5 block" style={{ color: 'var(--tiva-navy)', opacity: 0.6 }}>Care Mode</label>
                <select className="tiva-input" value={form.care_mode} onChange={e => setForm({ ...form, care_mode: e.target.value })}>
                  <option value="general">General</option>
                  <option value="diabetes">Diabetes</option>
                  <option value="hypertension">Hypertension</option>
                  <option value="heart_disease">Heart Disease</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Height (cm)" type="number" value={String(form.height_cm)} onChange={v => setForm({ ...form, height_cm: v })} />
              <FormField label="Weight (kg)" type="number" value={String(form.weight_kg)} onChange={v => setForm({ ...form, weight_kg: v })} />
            </div>
            <FormField label="Allergies (comma separated)" value={form.allergies} onChange={v => setForm({ ...form, allergies: v })} placeholder="Penicillin, Peanuts" />
            <FormField label="Chronic Conditions (comma separated)" value={form.chronic_conditions} onChange={v => setForm({ ...form, chronic_conditions: v })} placeholder="Hypertension, Diabetes" />
            <button onClick={saveProfile} className="tiva-navy-btn w-full py-4 flex items-center justify-center gap-2">
              <Save size={20} /> Save Profile
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const age = profile.date_of_birth ? Math.floor((new Date() - new Date(profile.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : null;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <SectionHeader
          title="Health Profile"
          action={<button onClick={() => setEditing(true)} className="tiva-navy-btn px-4 py-3 flex items-center gap-2 text-sm"><Plus size={16} /> Edit</button>}
        />

        {/* Profile Header */}
        <div className="tiva-card p-6 animate-settle">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ backgroundColor: 'var(--tiva-lavender)' }}>
              <span className="font-heading font-bold text-3xl" style={{ color: 'var(--tiva-navy)' }}>{profile.full_name?.charAt(0) || 'U'}</span>
            </div>
            <div>
              <h3 className="font-heading text-2xl font-bold" style={{ color: 'var(--tiva-navy)' }}>{profile.full_name}</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--tiva-navy)', opacity: 0.5 }}>
                {age ? `${age} years old` : ''} {profile.gender ? `· ${profile.gender}` : ''}
              </p>
              <div className="flex gap-2 mt-2">
                <span className="px-3 py-1 rounded-full text-xs font-heading font-semibold" style={{ backgroundColor: 'var(--tiva-mint)', color: 'var(--tiva-navy)' }}>{profile.blood_type || 'Unknown'}</span>
                <span className="px-3 py-1 rounded-full text-xs font-heading font-semibold" style={{ backgroundColor: 'var(--tiva-lavender)', color: 'var(--tiva-navy)' }}>{profile.care_mode || 'General'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Health Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoCard icon={Heart} title="Chronic Conditions" items={profile.chronic_conditions} color="lavender" />
          <InfoCard icon={AlertCircle} title="Allergies" items={profile.allergies} color="red" />
        </div>

        {/* Body Metrics */}
        <div className="tiva-card p-6 animate-settle">
          <h3 className="font-heading text-lg font-bold mb-4" style={{ color: 'var(--tiva-navy)' }}>Body Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--tiva-panel)' }}>
              <p className="text-xs font-heading font-semibold mb-1" style={{ color: 'var(--tiva-navy)', opacity: 0.5 }}>Height</p>
              <p className="font-heading text-2xl font-bold" style={{ color: 'var(--tiva-navy)' }}>{profile.height_cm ? `${profile.height_cm} cm` : '—'}</p>
            </div>
            <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--tiva-panel)' }}>
              <p className="text-xs font-heading font-semibold mb-1" style={{ color: 'var(--tiva-navy)', opacity: 0.5 }}>Weight</p>
              <p className="font-heading text-2xl font-bold" style={{ color: 'var(--tiva-navy)' }}>{profile.weight_kg ? `${profile.weight_kg} kg` : '—'}</p>
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="tiva-card p-6 animate-settle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--tiva-lavender)' }}>
                <Globe size={24} style={{ color: 'var(--tiva-navy)' }} />
              </div>
              <div>
                <h3 className="font-heading font-bold" style={{ color: 'var(--tiva-navy)' }}>Language</h3>
                <p className="text-sm" style={{ color: 'var(--tiva-navy)', opacity: 0.5 }}>{language === 'en' ? 'English' : 'Français'}</p>
              </div>
            </div>
            <button onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')} className="tiva-lavender-btn px-4 py-3 text-sm">
              Switch to {language === 'en' ? 'Français' : 'English'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function FormField({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label className="text-sm font-heading font-semibold mb-1.5 block" style={{ color: 'var(--tiva-navy)', opacity: 0.6 }}>{label}</label>
      <input type={type} className="tiva-input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function InfoCard({ icon: Icon, title, items, color }) {
  const colorMap = { lavender: 'var(--tiva-lavender)', red: 'var(--tiva-red)', mint: 'var(--tiva-mint)' };
  return (
    <div className="tiva-card p-6 animate-settle">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: colorMap[color] }}>
          <Icon size={20} style={{ color: 'var(--tiva-navy)' }} />
        </div>
        <h3 className="font-heading font-bold" style={{ color: 'var(--tiva-navy)' }}>{title}</h3>
      </div>
      {items && items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span key={i} className="px-3 py-1.5 rounded-full text-sm font-heading font-semibold" style={{ backgroundColor: 'var(--tiva-panel)', color: 'var(--tiva-navy)' }}>{item}</span>
          ))}
        </div>
      ) : (
        <p className="text-sm" style={{ color: 'var(--tiva-navy)', opacity: 0.4 }}>None recorded</p>
      )}
    </div>
  );
}