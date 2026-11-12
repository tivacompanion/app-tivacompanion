import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Loader2, UserPlus, UserMinus, CheckCircle2 } from 'lucide-react';

export default function BulkManageModal({ open, onClose, patients, caregivers, onComplete }) {
  const [mode, setMode] = useState('assign');
  const [selected, setSelected] = useState(new Set());
  const [caregiverId, setCaregiverId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const filtered = patients.filter(p =>
    p.profile?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(p => p.patient_user_id)));
    }
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    if (mode === 'assign' && !caregiverId) return;
    setError('');
    setLoading(true);
    try {
      const res = await base44.functions.invoke('institutionPortal', {
        action: 'bulk_manage',
        patient_user_ids: Array.from(selected),
        mode,
        caregiver_user_id: mode === 'assign' ? caregiverId : undefined,
      });
      setResult(res.data.results);
      onComplete();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
    setLoading(false);
  };

  const reset = () => {
    setSelected(new Set());
    setCaregiverId('');
    setSearch('');
    setResult(null);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const activeCaregivers = caregivers.filter(c => c.status === 'active');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Manage Patient Assignments</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="py-6 text-center">
            <div className="w-14 h-14 rounded-full bg-mint flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-mint-deep" />
            </div>
            <h3 className="font-heading font-semibold text-lg text-navy mb-2">Bulk Operation Complete</h3>
            <div className="flex items-center justify-center gap-4 text-sm mb-4">
              <span className="text-mint-deep font-medium">{result.succeeded} succeeded</span>
              <span className="text-muted-foreground">{result.skipped} skipped</span>
              {result.failed > 0 && <span className="text-destructive">{result.failed} failed</span>}
            </div>
            <Button onClick={handleClose} className="bg-tiva-teal text-[#0A0F0D]">Done</Button>
          </div>
        ) : (
          <>
            {/* Mode toggle */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setMode('assign')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === 'assign' ? 'bg-tiva-teal text-[#0A0F0D]' : 'bg-card/50 text-muted-foreground border border-white/10'}`}
              >
                <UserPlus className="w-4 h-4" /> Assign to Caregiver
              </button>
              <button
                onClick={() => setMode('remove')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${mode === 'remove' ? 'bg-destructive text-white' : 'bg-card/50 text-muted-foreground border border-white/10'}`}
              >
                <UserMinus className="w-4 h-4" /> Remove All Assignments
              </button>
            </div>

            {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-3">{error}</div>}

            {/* Caregiver selector (assign mode only) */}
            {mode === 'assign' && (
              <div className="mb-3">
                <Select value={caregiverId} onValueChange={setCaregiverId}>
                  <SelectTrigger><SelectValue placeholder="Select a caregiver to assign patients to..." /></SelectTrigger>
                  <SelectContent>
                    {activeCaregivers.map(c => (
                      <SelectItem key={c.caregiver_user_id} value={c.caregiver_user_id}>
                        {c.caregiver_name} ({c.patient_count} patients)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeCaregivers.length === 0 && (
                  <p className="text-xs text-destructive mt-1">No active caregivers available. Invite a caregiver first.</p>
                )}
              </div>
            )}

            {/* Search + select all */}
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients..." className="pl-9" />
              </div>
              <Button variant="outline" size="sm" onClick={toggleAll} className="whitespace-nowrap">
                {selected.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {selected.size > 0 && (
              <p className="text-xs text-tiva-teal font-medium mb-2">{selected.size} patient(s) selected</p>
            )}

            {/* Patient list with checkboxes */}
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1 max-h-[40vh] pr-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No patients found</p>
              ) : filtered.map(p => {
                const isSelected = selected.has(p.patient_user_id);
                return (
                  <label
                    key={p.patient_user_id}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-tiva-teal/10 border border-tiva-teal/30' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => toggle(p.patient_user_id)} />
                    <div className="w-9 h-9 rounded-full bg-lavender flex items-center justify-center text-navy font-semibold text-sm">
                      {p.profile?.full_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy truncate">{p.profile?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.assigned_caregivers?.length || 0} caregiver(s) assigned
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || selected.size === 0 || (mode === 'assign' && !caregiverId)}
                className={mode === 'assign' ? 'bg-tiva-teal text-[#0A0F0D]' : 'bg-destructive text-white'}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : mode === 'assign' ? (
                  <UserPlus className="w-4 h-4 mr-2" />
                ) : (
                  <UserMinus className="w-4 h-4 mr-2" />
                )}
                {mode === 'assign' ? `Assign ${selected.size} to Caregiver` : `Remove from ${selected.size} Patient(s)`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}