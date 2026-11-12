import { useState, useEffect } from 'react';
import { Calendar, MapPin, Stethoscope, ChevronRight, FileText, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/primitives';
import AppointmentDetailModal from './AppointmentDetailModal';
import AppointmentFormModal from './AppointmentFormModal';

const statusConfig = {
  upcoming: { label: 'Upcoming', className: 'bg-mint text-mint-deep' },
  completed: { label: 'Completed', className: 'bg-lavender text-lavender-deep' },
  cancelled: { label: 'Cancelled', className: 'bg-white/10 text-muted-foreground' },
  missed: { label: 'Missed', className: 'bg-destructive/15 text-destructive' },
};

export default function AppointmentsTab({ documents }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    const data = await base44.entities.Appointment.list('-appointment_date', 50).catch(() => []);
    setAppointments(data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 rounded-full animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: 'rgba(64,201,162,0.2)', borderTopColor: '#40C9A2' }} />
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <>
        <div className="flex justify-end mb-4">
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-tiva-teal text-[#0A0F0D]">
            <Plus className="w-4 h-4 mr-1" /> Add Appointment
          </Button>
        </div>
        <EmptyState
          icon={Calendar}
          title="No appointments yet"
          description="Your doctor visit history will appear here in chronological order. Log follow-up notes and attach documents after each visit."
        />
        {showForm && (
          <AppointmentFormModal
            appointment={editing}
            onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); loadAppointments(); }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-tiva-teal text-[#0A0F0D]">
          <Plus className="w-4 h-4 mr-1" /> Add Appointment
        </Button>
      </div>
      <div className="space-y-3">
        {appointments.map(apt => {
          const status = statusConfig[apt.status] || statusConfig.upcoming;
          const attachedCount = apt.attached_document_ids?.length || 0;
          return (
            <div
              key={apt.id}
              onClick={() => setSelected(apt)}
              className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:border-tiva-teal/20"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-lavender text-lavender-deep flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-heading font-semibold text-navy truncate">{apt.title}</p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${status.className}`}>{status.label}</span>
                  </div>
                  {apt.doctor_name && (
                    <p className="text-sm text-muted-foreground mt-0.5">{apt.doctor_name}{apt.specialty ? ` · ${apt.specialty}` : ''}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(apt.appointment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {apt.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {apt.location}
                      </span>
                    )}
                  </div>
                  {apt.follow_up_notes && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-1">{apt.follow_up_notes}</p>
                  )}
                  {attachedCount > 0 && (
                    <p className="text-xs text-lavender-deep mt-1.5 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {attachedCount} document(s) attached
                    </p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground/30 mt-3 flex-shrink-0" />
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <AppointmentDetailModal
          appointment={selected}
          documents={documents}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); loadAppointments(); }}
          onEdit={() => { setEditing(selected); setSelected(null); setShowForm(true); }}
        />
      )}

      {showForm && (
        <AppointmentFormModal
          appointment={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); setEditing(null); loadAppointments(); }}
        />
      )}
    </>
  );
}