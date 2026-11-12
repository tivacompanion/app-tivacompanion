import { QrCode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function QRCardModal({ profile, onClose }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle>Emergency QR Card</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-6">
          Show this to emergency responders for instant access to your health profile
        </p>
        <div className="w-48 h-48 mx-auto rounded-3xl bg-navy flex items-center justify-center mb-6">
          <QrCode className="w-28 h-28 text-white" />
        </div>
        {profile && (
          <div className="text-left space-y-3 mb-6">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Name</p>
              <p className="font-heading font-semibold text-sm text-navy">{profile.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Blood Type</p>
              <p className="font-heading font-semibold text-sm text-navy">{profile.blood_type || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Allergies</p>
              <p className="font-heading font-semibold text-sm text-navy">{profile.allergies?.join(', ') || 'None'}</p>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose} className="w-full bg-tiva-teal text-[#0A0F0D]">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}