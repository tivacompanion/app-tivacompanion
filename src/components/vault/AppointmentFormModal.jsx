import { useState } from 'react';
import { Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';

const statusOptions = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'missed', label: 'Missed' },
];

export default function AppointmentFormModal({ appointment, onClose, onSaved }) {
  const isEdit = !!appointment;
  const [form, setForm] = useState({
    title: appointment?.title || '',
    doctor_name: appointment?.doctor_name || '',
    specialty: appointment?.specialty || '',
    location: appointment?.location || '',
    appointment_date: appointment?.appointment_date
      ? new Date(appointment.appointment_date).toISOString().slice(0, 16)
      : '',
    duration_minutes: appointment?.duration_minutes || 30,
    notes: appointment?.notes || '',
    status: appointment?.status || 'upcoming',
  });
  const [saving, setSaving] = useState(false);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.appointment_date) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        duration_minutes: parseInt(form.duration_minutes) || 30,
        appointment_date: new Date(form.appointment_date).toISOString(),
      };
      if (isEdit) {
        await base44.entities.Appointment.update(appointment.id, payload);
      } else {
        await base44.entities.Appointment.create(payload);
      }
      onSaved();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Appointment' : 'New Appointment'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <Label className="mb-1.5 block">Title *</Label>
            <Input
              value={form.title}
              onChange={e => update('title', e.target.value)}
              placeholder="e.g. Cardiology check-up"
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Doctor Name</Label>
              <Input
                value={form.doctor_name}
                onChange={e => update('doctor_name', e.target.value)}
                placeholder="Dr. Smith"
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Specialty</Label>
              <Input
                value={form.specialty}
                onChange={e => update('specialty', e.target.value)}
                placeholder="Cardiology"
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Location</Label>
            <Input
              value={form.location}
              onChange={e => update('location', e.target.value)}
              placeholder="City Hospital, Room 204"
              className="bg-white/5 border-white/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Date & Time *</Label>
              <Input
                type="datetime-local"
                value={form.appointment_date}
                onChange={e => update('appointment_date', e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Duration (min)</Label>
              <Input
                type="number"
                min="5"
                step="5"
                value={form.duration_minutes}
                onChange={e => update('duration_minutes', e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Status</Label>
            <div className="flex gap-2 flex-wrap">
              {statusOptions.map(s => (
                <button
                  key={s.value}
                  onClick={() => update('status', s.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    form.status === s.value ? 'bg-tiva-teal text-[#0A0F0D]' : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="Reason for visit, questions to ask..."
              rows={3}
              className="bg-white/5 border-white/10"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.appointment_date} className="bg-tiva-teal text-[#0A0F0D]">
            <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}