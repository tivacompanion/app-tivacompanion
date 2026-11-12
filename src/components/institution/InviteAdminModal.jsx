import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Mail, UserPlus, Loader2, Send } from 'lucide-react';

export default function InviteAdminModal({ open, onClose, onInvited }) {
  const [form, setForm] = useState({ admin_name: '', admin_email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await base44.functions.invoke('institutionPortal', {
        action: 'invite_admin',
        admin_email: form.admin_email,
        admin_name: form.admin_name,
      });
      setForm({ admin_name: '', admin_email: '' });
      onInvited();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to send invitation');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-tiva-teal" /> Invite Institution Admin
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground mb-4">
          Invite a colleague to co-administer your institution. They'll receive an email with a link to accept and will be automatically promoted to admin role upon acceptance.
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name (optional)</Label>
            <Input
              value={form.admin_name}
              onChange={e => setForm({ ...form, admin_name: e.target.value })}
              placeholder="Dr. Jane Smith"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={form.admin_email}
                onChange={e => setForm({ ...form, admin_email: e.target.value })}
                placeholder="admin@hospital.cm"
                className="pl-10 h-11"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-tiva-teal text-[#0A0F0D]">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}