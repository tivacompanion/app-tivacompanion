import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export default function ReassignPatientModal({ open, onClose, assignment, caregivers, onReassigned }) {
  const [newCaregiverId, setNewCaregiverId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReassign = async () => {
    if (!newCaregiverId) return;
    setError('');
    setLoading(true);
    try {
      await base44.functions.invoke('institutionPortal', {
        action: 'reassign_patient',
        assignment_id: assignment.id,
        new_caregiver_user_id: newCaregiverId,
      });
      onReassigned();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to reassign');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reassign Patient</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
          <p className="text-sm text-muted-foreground">
            Reassign <span className="font-semibold text-navy">{assignment?.patient_name}</span> from{' '}
            <span className="font-semibold text-navy">{assignment?.caregiver_name}</span> to:
          </p>
          <Select value={newCaregiverId} onValueChange={setNewCaregiverId}>
            <SelectTrigger><SelectValue placeholder="Select a caregiver..." /></SelectTrigger>
            <SelectContent>
              {caregivers.filter(c => c.status === 'active' && c.caregiver_user_id !== assignment?.caregiver_user_id).map(c => (
                <SelectItem key={c.caregiver_user_id} value={c.caregiver_user_id}>
                  {c.caregiver_name} ({c.patient_count} patients)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleReassign} disabled={loading || !newCaregiverId} className="bg-tiva-teal text-[#0A0F0D]">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Reassign Patient
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}