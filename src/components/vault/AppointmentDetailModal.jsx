import { useState } from 'react';
import { Calendar, MapPin, Stethoscope, FileText, CheckCircle2, Save, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';

const statusOptions = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'missed', label: 'Missed' },
];

export default function AppointmentDetailModal({ appointment, documents, onClose, onSaved, onEdit }) {
  const [followUpNotes, setFollowUpNotes] = useState(appointment.follow_up_notes || '');
  const [attachedIds, setAttachedIds] = useState(appointment.attached_document_ids || []);
  const [status, setStatus] = useState(appointment.status || 'upcoming');
  const [saving, setSaving] = useState(false);

  const toggleDocument = (docId) => {
    setAttachedIds(prev => prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Appointment.update(appointment.id, {
        follow_up_notes: followUpNotes,
        attached_document_ids: attachedIds,
        status,
      });
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
          <DialogTitle>{appointment.title}</DialogTitle>
        </DialogHeader>

        {/* Appointment info */}
        <div className="space-y-2 text-sm text-muted-foreground py-1">
          {appointment.doctor_name && (
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4" /> {appointment.doctor_name}{appointment.specialty ? ` · ${appointment.specialty}` : ''}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" /> {new Date(appointment.appointment_date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
          {appointment.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" /> {appointment.location}
            </div>
          )}
        </div>

        {/* Status selector */}
        <div>
          <Label className="mb-2 block">Status</Label>
          <div className="flex gap-2 flex-wrap">
            {statusOptions.map(s => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  status === s.value ? 'bg-tiva-teal text-[#0A0F0D]' : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Follow-up notes */}
        <div>
          <Label className="mb-2 block">Doctor's Follow-Up Notes</Label>
          <Textarea
            value={followUpNotes}
            onChange={e => setFollowUpNotes(e.target.value)}
            placeholder="Log the doctor's instructions, observations, or recommendations..."
            rows={4}
            className="bg-white/5 border-white/10"
          />
        </div>

        {/* Attach documents */}
        <div>
          <Label className="mb-2 block">Attach Medical Documents</Label>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents available. Upload documents in the Documents tab first.</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => toggleDocument(doc.id)}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all"
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all flex-shrink-0 ${
                    attachedIds.includes(doc.id) ? 'bg-tiva-teal text-[#0A0F0D]' : 'border border-white/20'
                  }`}>
                    {attachedIds.includes(doc.id) && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-navy flex-1 truncate">{doc.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-1" /> Edit Details
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-tiva-teal text-[#0A0F0D]">
            <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}