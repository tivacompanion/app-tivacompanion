import { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Send, Search, CheckSquare, Square } from 'lucide-react';

export default function BroadcastMessageModal({ open, onClose, patients = [], onComplete }) {
  const [selected, setSelected] = useState(new Set());
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const filteredPatients = useMemo(() =>
    patients.filter(p => p.profile?.full_name?.toLowerCase().includes(search.toLowerCase())),
    [patients, search]
  );

  const togglePatient = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAllFiltered = () => {
    if (filteredPatients.every(p => selected.has(p.patient_user_id))) {
      const next = new Set(selected);
      for (const p of filteredPatients) next.delete(p.patient_user_id);
      setSelected(next);
    } else {
      const next = new Set(selected);
      for (const p of filteredPatients) next.add(p.patient_user_id);
      setSelected(next);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || selected.size === 0) return;
    setError('');
    setLoading(true);
    try {
      const patient_user_ids = [...selected];
      const patient_names = patient_user_ids.map(id =>
        patients.find(p => p.patient_user_id === id)?.profile?.full_name || 'Patient'
      );
      await base44.functions.invoke('institutionPortal', {
        action: 'broadcast_message',
        patient_user_ids,
        patient_names,
        message,
      });
      setSelected(new Set());
      setMessage('');
      onComplete();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to send broadcast');
    } finally {
      setLoading(false);
    }
  };

  const allFilteredSelected = filteredPatients.length > 0 && filteredPatients.every(p => selected.has(p.patient_user_id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Broadcast Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-navy">
                Recipients ({selected.size} selected)
              </Label>
              <button
                onClick={toggleAllFiltered}
                className="flex items-center gap-1.5 text-xs text-tiva-teal hover:underline"
              >
                {allFilteredSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                {allFilteredSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search patients..."
                className="w-full rounded-xl pl-9 pr-3 py-2 text-sm bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:border-tiva-teal/50"
              />
            </div>
            <div className="max-h-52 overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/5">
              {filteredPatients.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground text-center">No patients found</p>
              ) : filteredPatients.map(p => (
                <button
                  key={p.patient_user_id}
                  onClick={() => togglePatient(p.patient_user_id)}
                  className={`w-full flex items-center gap-3 p-2.5 text-left transition-colors ${
                    selected.has(p.patient_user_id) ? 'bg-tiva-teal/10' : 'hover:bg-white/5'
                  }`}
                >
                  {selected.has(p.patient_user_id)
                    ? <CheckSquare className="w-4 h-4 text-tiva-teal flex-shrink-0" />
                    : <Square className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{p.profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.profile?.blood_type || 'Unknown'} blood · {p.med_count} meds
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-navy">Message</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Share a health tip, institution update, or announcement..."
              rows={4}
              className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus-visible:ring-tiva-teal/30"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This message will appear in each selected patient's family message inbox.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSend}
            disabled={loading || !message.trim() || selected.size === 0}
            className="bg-tiva-teal text-[#0A0F0D]"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send to {selected.size} patient{selected.size === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Label({ className, children }) {
  return <label className={className}>{children}</label>;
}