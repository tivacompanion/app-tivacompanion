import { useState, useEffect } from 'react';
import { Pill, Plus, Clock, CheckCircle2, XCircle, Bell, Edit3, Trash2, CheckCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/AppLayout';
import { SectionHeader, EmptyState, LoadingState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function Medications() {
  const [medications, setMedications] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', dosage: '', frequency: 'Once daily', schedule_times: ['08:00'],
    instructions: '', prescribed_by: '', status: 'active', color_tag: 'lavender',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [meds, rems] = await Promise.all([
      base44.entities.Medication.list('-created_date', 50).catch(() => []),
      base44.entities.Reminder.filter({ type: 'medication' }, '-scheduled_time', 20).catch(() => []),
    ]);
    setMedications(meds);
    setReminders(rems);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.dosage) return;
    if (editing) {
      await base44.entities.Medication.update(editing.id, form);
    } else {
      const med = await base44.entities.Medication.create(form);
      // Create reminders for each scheduled time
      for (const time of form.schedule_times) {
        const [h, m] = time.split(':');
        const scheduled = new Date();
        scheduled.setHours(parseInt(h), parseInt(m), 0, 0);
        if (scheduled < new Date()) scheduled.setDate(scheduled.getDate() + 1);
        await base44.entities.Reminder.create({
          type: 'medication',
          title: `Take ${form.name} (${form.dosage})`,
          description: form.instructions || `Time to take your ${form.name}`,
          scheduled_time: scheduled.toISOString(),
          repeat_pattern: 'daily',
          related_medication_id: med.id,
          status: 'pending',
          voice_enabled: true,
          sms_fallback: true,
        });
      }
    }
    setForm({ name: '', dosage: '', frequency: 'Once daily', schedule_times: ['08:00'], instructions: '', prescribed_by: '', status: 'active', color_tag: 'lavender' });
    setEditing(null);
    setShowAdd(false);
    loadData();
  };

  const handleEdit = (med) => {
    setEditing(med);
    setForm({
      name: med.name, dosage: med.dosage, frequency: med.frequency || 'Once daily',
      schedule_times: med.schedule_times || ['08:00'], instructions: med.instructions || '',
      prescribed_by: med.prescribed_by || '', status: med.status || 'active', color_tag: med.color_tag || 'lavender',
    });
    setShowAdd(true);
  };

  const handleDelete = async (id) => {
    await base44.entities.Medication.delete(id);
    loadData();
  };

  const confirmReminder = async (reminder) => {
    const nowIso = new Date().toISOString();
    await base44.entities.Reminder.update(reminder.id, {
      status: 'confirmed',
      confirmed_at: nowIso,
    });
    try {
      await base44.entities.ReminderLog.create({
        medication_id: reminder.related_medication_id || null,
        medication_name: reminder.title.replace(/^Take\s+/i, ''),
        scheduled_time: reminder.scheduled_time || nowIso,
        status: 'taken',
        taken_at: nowIso,
      });
    } catch {}
    loadData();
  };

  const markMissed = async (reminder) => {
    const nowIso = new Date().toISOString();
    await base44.entities.Reminder.update(reminder.id, { status: 'missed' });
    try {
      await base44.entities.ReminderLog.create({
        medication_id: reminder.related_medication_id || null,
        medication_name: reminder.title.replace(/^Take\s+/i, ''),
        scheduled_time: reminder.scheduled_time || nowIso,
        status: 'missed',
      });
    } catch {}
    loadData();
  };

  const confirmAllPending = async () => {
    const nowIso = new Date().toISOString();
    const pending = reminders.filter(r => r.status === 'pending');
    await Promise.all(pending.map(async (r) => {
      await base44.entities.Reminder.update(r.id, {
        status: 'confirmed',
        confirmed_at: nowIso,
      });
      try {
        await base44.entities.ReminderLog.create({
          medication_id: r.related_medication_id || null,
          medication_name: r.title.replace(/^Take\s+/i, ''),
          scheduled_time: r.scheduled_time || nowIso,
          status: 'taken',
          taken_at: nowIso,
        });
      } catch {}
    }));
    loadData();
  };

  const colorMap = {
    lavender: 'bg-lavender text-lavender-deep',
    mint: 'bg-mint text-mint-deep',
    peach: 'bg-peach text-peach-deep',
    navy: 'bg-white/10 text-white',
  };

  if (loading) return <AppLayout><LoadingState label="Loading medications..." /></AppLayout>;

  const activeMeds = medications.filter(m => m.status === 'active');
  const pendingReminders = reminders.filter(r => r.status === 'pending');
  const confirmedToday = reminders.filter(r => r.status === 'confirmed').length;
  const complianceRate = reminders.length > 0 ? Math.round((confirmedToday / reminders.length) * 100) : 100;

  return (
    <AppLayout>
      <SectionHeader
        title="Medications & Reminders"
        subtitle={`${activeMeds.length} active medications · ${complianceRate}% compliance today`}
        action={
          <Button onClick={() => { setEditing(null); setForm({ name: '', dosage: '', frequency: 'Once daily', schedule_times: ['08:00'], instructions: '', prescribed_by: '', status: 'active', color_tag: 'lavender' }); setShowAdd(true); }} className="bg-tiva-teal hover:bg-tiva-teal/90">
            <Plus className="w-4 h-4 mr-1" /> Add Medication
          </Button>
        }
      />

      {/* Compliance Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-mint-deep" />
            <span className="text-sm text-muted-foreground">Taken</span>
          </div>
          <p className="font-heading font-bold text-2xl text-navy">{confirmedToday}</p>
        </div>
        <div className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-peach-deep" />
            <span className="text-sm text-muted-foreground">Pending</span>
          </div>
          <p className="font-heading font-bold text-2xl text-navy">{pendingReminders.length}</p>
        </div>
        <div className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-destructive" />
            <span className="text-sm text-muted-foreground">Missed</span>
          </div>
          <p className="font-heading font-bold text-2xl text-navy">{reminders.filter(r => r.status === 'missed').length}</p>
        </div>
      </div>

      {/* Pending Reminders */}
      {pendingReminders.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-semibold text-navy flex items-center gap-2">
              <Bell className="w-4 h-4 text-peach-deep" /> Pending Reminders ({pendingReminders.length})
            </h3>
            <Button
              size="sm"
              onClick={confirmAllPending}
              className="bg-mint text-mint-deep hover:bg-mint-deep/20 text-xs font-semibold h-8"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" /> Take All Due
            </Button>
          </div>
          <div className="space-y-2">
            {pendingReminders.map((r) => (
              <div key={r.id} className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-peach flex items-center justify-center">
                  <Pill className="w-5 h-5 text-peach-deep" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {r.escalation_level > 0 && ` · Escalated ${r.escalation_level}x`}
                  </p>
                </div>
                <button
                  onClick={() => confirmReminder(r)}
                  className="px-3 py-1.5 rounded-lg bg-mint text-mint-deep text-sm font-semibold hover:bg-mint-deep/20 transition-all"
                >
                  Taken
                </button>
                <button
                  onClick={() => markMissed(r)}
                  className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-destructive/10 hover:text-destructive transition-all"
                >
                  Skip
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medications List */}
      <h3 className="font-heading font-semibold text-navy mb-3">All Medications</h3>
      {medications.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No medications yet"
          description="Add your medications and Tiva will create smart reminders with voice alerts and family escalation."
          action={<Button onClick={() => setShowAdd(true)} className="bg-tiva-teal text-[#0A0F0D]"><Plus className="w-4 h-4 mr-1" /> Add your first medication</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {medications.map((med) => (
            <div key={med.id} className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:border-border transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl ${colorMap[med.color_tag] || colorMap.lavender} flex items-center justify-center`}>
                    <Pill className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="font-heading font-semibold text-navy">{med.name}</h4>
                    <p className="text-xs text-muted-foreground">{med.dosage} · {med.frequency}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(med)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-lavender">
                    <Edit3 className="w-3.5 h-3.5 text-navy" />
                  </button>
                  <button onClick={() => handleDelete(med.id)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
              {med.instructions && (
                <p className="text-sm text-muted-foreground mb-2">{med.instructions}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {(med.schedule_times || []).map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 text-xs text-white font-medium">
                    <Clock className="w-3 h-3" /> {t}
                  </span>
                ))}
              </div>
              {med.prescribed_by && (
                <p className="text-xs text-muted-foreground mt-2">Prescribed by {med.prescribed_by}</p>
              )}
              {med.status === 'active' ? (
                <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-mint-deep">
                  <span className="w-1.5 h-1.5 rounded-full bg-mint-deep" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" /> {med.status}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Medication' : 'Add Medication'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Medication Name</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Metformin" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Dosage</Label>
                <Input value={form.dosage} onChange={e => setForm({...form, dosage: e.target.value})} placeholder="e.g. 500mg" />
              </div>
              <div>
                <Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={v => setForm({...form, frequency: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Once daily">Once daily</SelectItem>
                    <SelectItem value="Twice daily">Twice daily</SelectItem>
                    <SelectItem value="Three times daily">Three times daily</SelectItem>
                    <SelectItem value="As needed">As needed</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Schedule Times (comma-separated)</Label>
              <Input
                value={form.schedule_times.join(', ')}
                onChange={e => setForm({...form, schedule_times: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                placeholder="08:00, 20:00"
              />
            </div>
            <div>
              <Label>Instructions</Label>
              <Textarea value={form.instructions} onChange={e => setForm({...form, instructions: e.target.value})} placeholder="Take with food" />
            </div>
            <div>
              <Label>Prescribed By</Label>
              <Input value={form.prescribed_by} onChange={e => setForm({...form, prescribed_by: e.target.value})} placeholder="Dr. Nkomo" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-tiva-teal text-[#0A0F0D]">{editing ? 'Save Changes' : 'Add Medication'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}