import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { ClipboardList, Send, Loader2, Pin, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'clinical_observation', label: 'Clinical Observation' },
  { value: 'medication_review', label: 'Medication Review' },
  { value: 'care_plan', label: 'Care Plan' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'behavioral', label: 'Behavioral' },
];

const CATEGORY_STYLES = {
  general: 'bg-white/10 text-white',
  clinical_observation: 'bg-tiva-teal/15 text-tiva-teal',
  medication_review: 'bg-mint/40 text-mint-deep',
  care_plan: 'bg-lavender text-lavender-deep',
  follow_up: 'bg-peach text-peach-deep',
  behavioral: 'bg-destructive/15 text-destructive',
};

export default function ClinicalNotesPanel({ patientUserId, patientName, source }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const functionName = source === 'caregiver' ? 'caregiverPortal' : 'institutionPortal';

  const loadNotes = useCallback(async () => {
    try {
      const res = await base44.functions.invoke(functionName, {
        action: 'get_clinical_notes',
        patient_user_id: patientUserId,
      });
      setNotes(res.data?.notes || []);
    } catch {
      setNotes([]);
    }
    setLoading(false);
  }, [patientUserId, functionName]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleAdd = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await base44.functions.invoke(functionName, {
        action: 'add_clinical_note',
        patient_user_id: patientUserId,
        patient_name: patientName,
        content: content.trim(),
        note_category: category,
      });
      setContent('');
      setCategory('general');
      loadNotes();
    } catch {}
    setSubmitting(false);
  };

  const handleDelete = async (noteId) => {
    if (!confirm('Delete this clinical note?')) return;
    setDeletingId(noteId);
    try {
      await base44.functions.invoke(functionName, {
        action: 'delete_clinical_note',
        note_id: noteId,
        patient_user_id: patientUserId,
      });
      loadNotes();
    } catch {}
    setDeletingId(null);
  };

  const handleTogglePin = async (noteId, currentPinned) => {
    try {
      await base44.functions.invoke(functionName, {
        action: 'toggle_pin_clinical_note',
        note_id: noteId,
        patient_user_id: patientUserId,
        is_pinned: !currentPinned,
      });
      loadNotes();
    } catch {}
  };

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_date) - new Date(a.created_date);
  });

  return (
    <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-5">
      <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-tiva-teal" /> Clinical Notes
        <span className="text-xs font-normal text-muted-foreground ml-1">(Internal — staff only)</span>
      </h3>

      {/* Add note form */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                category === c.value
                  ? 'border-tiva-teal bg-tiva-teal/15 text-navy'
                  : 'border-white/10 text-muted-foreground hover:text-navy'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write an internal clinical note for the care team…"
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleAdd}
            disabled={!content.trim() || submitting}
            className="bg-tiva-teal text-[#0A0F0D]"
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
            Add Note
          </Button>
        </div>
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      ) : sortedNotes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No clinical notes yet. Add one above.</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
          {sortedNotes.map(note => (
            <div
              key={note.id}
              className={`p-3 rounded-xl border ${
                note.is_pinned ? 'bg-tiva-teal/5 border-tiva-teal/20' : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-lavender flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-lavender-deep" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{note.author_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {note.author_role?.replace(/_/g, ' ')} · {new Date(note.created_date).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_STYLES[note.note_category] || CATEGORY_STYLES.general}`}>
                    {CATEGORIES.find(c => c.value === note.note_category)?.label || 'General'}
                  </span>
                  <button
                    onClick={() => handleTogglePin(note.id, note.is_pinned)}
                    className={`p-1 rounded-lg transition-all ${note.is_pinned ? 'text-tiva-teal' : 'text-muted-foreground hover:text-navy'}`}
                    title={note.is_pinned ? 'Unpin' : 'Pin to top'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    disabled={deletingId === note.id}
                    className="p-1 rounded-lg text-muted-foreground hover:text-destructive transition-all"
                    title="Delete"
                  >
                    {deletingId === note.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-sm text-navy whitespace-pre-wrap">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}