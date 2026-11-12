import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Send } from 'lucide-react';

export default function InviteCaregiverModal({ open, onClose, onInvited }) {
  const [form, setForm] = useState({ caregiver_name: '', caregiver_email: '', caregiver_phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.caregiver_name || !form.caregiver_email) return;
    setError('');
    setLoading(true);
    try {
      await base44.functions.invoke('institutionPortal', { action: 'invite_caregiver', ...form });
      setForm({ caregiver_name: '', caregiver_email: '', caregiver_phone: '' });
      onInvited();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Caregiver</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div>
            <Label>Caregiver Name</Label>
            <Input value={form.caregiver_name} onChange={e => setForm({ ...form, caregiver_name: e.target.value })} placeholder="Dr. Jane Doe" />
          </div>
          <div>
            <Label>Email Address</Label>
            <Input type="email" value={form.caregiver_email} onChange={e => setForm({ ...form, caregiver_email: e.target.value })} placeholder="caregiver@email.com" />
          </div>
          <div>
            <Label>Phone (optional)</Label>
            <Input value={form.caregiver_phone} onChange={e => setForm({ ...form, caregiver_phone: e.target.value })} placeholder="+237..." />
          </div>
          <p className="text-xs text-muted-foreground">An email invitation will be sent. The caregiver must register on Tiva and accept the invite to join your institution.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !form.caregiver_name || !form.caregiver_email} className="bg-tiva-teal text-[#0A0F0D]">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}