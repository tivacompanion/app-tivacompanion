import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Search, UserPlus, Loader } from 'lucide-react';

export default function AssignPatientModal({ open, onClose, caregiver, onAssigned }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    searchPatients('');
  }, [open]);

  const searchPatients = async (q) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('institutionPortal', { action: 'search_patients', query: q });
      setResults(res.data?.patients || []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const handleAssign = async (patient) => {
    setAssigning(patient.patient_user_id);
    setError('');
    try {
      await base44.functions.invoke('institutionPortal', {
        action: 'assign_patient',
        caregiver_user_id: caregiver.caregiver_user_id,
        patient_user_id: patient.patient_user_id,
        patient_name: patient.full_name,
      });
      onAssigned();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to assign patient');
    }
    setAssigning(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Patient to {caregiver?.caregiver_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => { setSearch(e.target.value); searchPatients(e.target.value); }}
              placeholder="Search patient by name..."
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto scrollbar-thin space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No unassigned patients found</p>
            ) : results.map(p => (
              <div key={p.patient_user_id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                <div className="w-9 h-9 rounded-full bg-lavender flex items-center justify-center text-navy font-semibold text-sm">
                  {p.full_name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy truncate">{p.full_name}</p>
                  <p className="text-xs text-muted-foreground">{p.blood_type || 'Unknown'} blood · {p.phone || 'No phone'}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAssign(p)}
                  disabled={assigning === p.patient_user_id}
                  className="bg-tiva-teal text-[#0A0F0D] h-8 px-3"
                >
                  {assigning === p.patient_user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5 mr-1" />}
                  Assign
                </Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}