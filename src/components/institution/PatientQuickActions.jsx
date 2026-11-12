import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Phone, MessageSquare, Users, Send, Loader2, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function PatientQuickActions({ patientUserId, patientName, patientPhone }) {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [showContacts, setShowContacts] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [messageTarget, setMessageTarget] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!patientUserId) return;
    loadContacts();
  }, [patientUserId]);

  const loadContacts = async () => {
    try {
      // Try EmergencyContact entity
      const ecRecords = await base44.entities.EmergencyContact
        .filter({ created_by_id: patientUserId })
        .catch(() => []);

      const list = [];
      for (const ec of ecRecords) {
        if (ec.phone) list.push({ name: ec.name, phone: ec.phone, relationship: ec.relationship, is_primary: ec.is_primary });
      }

      // Also try HealthProfile embedded contacts
      const profiles = await base44.entities.HealthProfile
        .filter({ created_by_id: patientUserId })
        .catch(() => []);

      const profile = profiles?.[0];
      if (profile?.emergency_contacts_json) {
        for (const c of profile.emergency_contacts_json) {
          if (c.phone && !list.find(x => x.phone === c.phone)) {
            list.push({ name: c.name, phone: c.phone, relationship: c.relationship, is_primary: false });
          }
        }
      }

      setContacts(list.sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)));
    } catch {
      setContacts([]);
    }
  };

  const openMessage = (target) => {
    setMessageTarget(target);
    setMessageText('');
    setShowMessage(false);
    setShowMessage(false);
    setTimeout(() => setShowMessage(true), 50);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !messageTarget) return;
    setSending(true);
    try {
      await base44.entities.FamilyMessage.create({
        sender_name: 'Institution Staff',
        sender_role: 'tiva',
        recipient_name: messageTarget.name,
        recipient_user_id: patientUserId,
        content: messageText.trim(),
        message_type: 'text',
        patient_user_id: patientUserId,
        sent_at: new Date().toISOString(),
      });
      setShowMessage(false);
      setMessageText('');
      setMessageTarget(null);
    } catch {}
    setSending(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {patientPhone && (
          <>
            <a
              href={`tel:${patientPhone}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-mint hover:bg-mint/80 transition-all text-sm font-medium text-mint-deep"
            >
              <Phone className="w-3.5 h-3.5" /> Call Patient
            </a>
            <button
              onClick={() => openMessage({ name: patientName, phone: patientPhone, isPatient: true })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-tiva-teal hover:bg-tiva-teal/80 transition-all text-sm font-medium text-[#0A0F0D]"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Message Patient
            </button>
          </>
        )}
        {contacts.length > 0 && (
          <button
            onClick={() => setShowContacts(!showContacts)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-lavender hover:bg-lavender/80 transition-all text-sm font-medium text-lavender-deep"
          >
            <Users className="w-3.5 h-3.5" /> Family Contacts ({contacts.length})
          </button>
        )}
      </div>

      {/* Family contact dropdown */}
      {showContacts && contacts.length > 0 && (
        <div className="mt-2 space-y-1.5 animate-slide-up">
          {contacts.map((c, i) => (
            <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div className="w-8 h-8 rounded-full bg-lavender flex items-center justify-center">
                <User className="w-4 h-4 text-lavender-deep" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.relationship || 'Contact'} · {c.phone}</p>
              </div>
              <a
                href={`tel:${c.phone}`}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-mint hover:bg-mint/80 transition-all text-xs font-medium text-mint-deep"
              >
                <Phone className="w-3 h-3" /> Call
              </a>
              <button
                onClick={() => openMessage(c)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-tiva-teal hover:bg-tiva-teal/80 transition-all text-xs font-medium text-[#0A0F0D]"
              >
                <MessageSquare className="w-3 h-3" /> Message
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Quick message modal */}
      <Dialog open={!!messageTarget} onOpenChange={(o) => { if (!o) { setMessageTarget(null); setMessageText(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-tiva-teal" />
              Message {messageTarget?.name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {messageTarget?.isPatient ? 'Patient' : 'Family contact'} · {messageTarget?.phone}
            </p>
          </DialogHeader>
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={`Type a message to ${messageTarget?.name}...`}
            rows={4}
            autoFocus
            className="resize-none"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setMessageTarget(null); setMessageText(''); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || sending}
              className="bg-tiva-teal text-[#0A0F0D]"
            >
              {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}