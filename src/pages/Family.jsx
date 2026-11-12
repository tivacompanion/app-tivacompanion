import { useState, useEffect, useRef } from 'react';
import { Users, Send, Video, Phone, Heart, MessageCircle, Plus, Sparkles, Trash2, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/AppLayout';
import { SectionHeader, LoadingState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function Family() {
  const [messages, setMessages] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ caregiver_name: '', caregiver_email: '', caregiver_phone: '', relationship: '', permission_level: 'view' });
  const [userName, setUserName] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    const [msgRes, activeAssigns, pendingAssigns, user] = await Promise.all([
      base44.functions.invoke('caregiverPortal', { action: 'fetch_messages' }).catch(() => ({ data: { messages: [] } })),
      base44.entities.CaregiverAssignment.filter({ status: 'active' }, '-created_date', 50).catch(() => []),
      base44.entities.CaregiverAssignment.filter({ status: 'pending' }, '-created_date', 50).catch(() => []),
      base44.auth.me().catch(() => null),
    ]);
    setMessages(msgRes.data?.messages || []);
    setAssignments([...activeAssigns, ...pendingAssigns]);
    setUserName(user?.full_name || 'You');
    setLoading(false);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await base44.functions.invoke('caregiverPortal', {
        action: 'patient_send_message',
        content: text,
      });
      setInput('');
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.caregiver_name || !inviteForm.caregiver_email) return;
    setSending(true);
    try {
      await base44.functions.invoke('caregiverInvite', {
        action: 'send',
        ...inviteForm,
        app_url: window.location.origin,
      });
      setInviteForm({ caregiver_name: '', caregiver_email: '', caregiver_phone: '', relationship: '', permission_level: 'view' });
      setShowInvite(false);
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleRemove = async (id) => {
    await base44.entities.CaregiverAssignment.update(id, { status: 'revoked' }).catch(() => {});
    loadData();
  };

  if (loading) return <AppLayout><LoadingState label="Loading family connections..." /></AppLayout>;

  return (
    <AppLayout>
      <SectionHeader
        title="Social & Family Companion"
        subtitle="Stay connected with your loved ones and caregivers"
        action={
          <Button onClick={() => setShowInvite(true)} className="bg-tiva-teal text-[#0A0F0D]">
            <Plus className="w-4 h-4 mr-1" /> Invite Family
          </Button>
        }
      />

      {/* Connected Family & Caregivers */}
      <div className="mb-6">
        <h3 className="font-heading font-semibold text-navy mb-3">Your Care Circle</h3>
        {assignments.length === 0 ? (
          <div className="bg-card/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 text-center">
            <Users className="w-10 h-10 text-lavender-deep mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">No family members or caregivers connected yet.</p>
            <Button onClick={() => setShowInvite(true)} className="bg-tiva-teal text-[#0A0F0D]">
              <Plus className="w-4 h-4 mr-1" /> Invite your first family member
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {assignments.map((a) => (
              <div key={a.id} className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-lavender flex items-center justify-center text-navy font-semibold">
                    {a.caregiver_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-navy">{a.caregiver_name}</p>
                    <p className="text-xs text-muted-foreground">{a.relationship || 'Family'}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    a.status === 'active' ? 'bg-mint text-mint-deep' : 'bg-peach text-peach-deep'
                  }`}>
                    {a.status}
                  </span>
                </div>
                {a.status === 'pending' ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Clock className="w-3.5 h-3.5" /> Waiting for acceptance
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-mint/40 text-mint-deep text-xs font-semibold hover:bg-mint/60 transition-all">
                      <Video className="w-3.5 h-3.5" /> Video
                    </button>
                    {a.caregiver_phone && (
                      <a href={`tel:${a.caregiver_phone}`} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-lavender text-lavender-deep text-xs font-semibold hover:bg-lavender-deep/20 transition-all">
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  <p className="text-[10px] text-muted-foreground">
                    Permission: {a.permission_level.replace(/_/g, ' ')}
                  </p>
                  <button
                    onClick={() => handleRemove(a.id)}
                    className="text-[10px] text-destructive hover:text-red-300 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> {a.status === 'pending' ? 'Cancel' : 'Remove'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Social Isolation Detection */}
      <div className="bg-gradient-to-r from-amber/10 to-tiva-teal/10 rounded-2xl p-5 mb-6 border border-white/10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Heart className="w-6 h-6 text-peach" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-navy mb-1">Social Wellness Check</h3>
            <p className="text-sm text-navy">
              {messages.length > 5
                ? "You're staying well connected with your family. Keep it up — social engagement is great for your health!"
                : "Tiva noticed you haven't connected with family recently. Reaching out to loved ones can boost your mood and wellbeing."}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col" style={{ height: '500px' }}>
        <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-lavender-deep" />
          <h3 className="font-heading font-semibold text-navy">Family Messages</h3>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Sparkles className="w-10 h-10 text-lavender-deep mb-2" />
              <p className="text-sm text-muted-foreground">Send a message to your family. They'll receive it in their caregiver dashboard.</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.sender_role === 'patient';
              const isTiva = msg.sender_role === 'tiva';
              return (
                <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${isTiva ? 'w-full' : ''}`}>
                    <div className={`px-4 py-3 rounded-2xl ${
                      isMe ? 'bg-tiva-teal text-[#0A0F0D] rounded-tr-sm' :
                      isTiva ? 'bg-mint/30 text-navy border border-mint-deep/20 rounded-xl' :
                      'bg-lavender/60 text-navy rounded-tl-sm'
                    }`}>
                      {!isMe && !isTiva && (
                        <p className="text-xs font-semibold text-lavender-deep mb-1">{msg.sender_name}</p>
                      )}
                      {isTiva && (
                        <p className="text-xs font-semibold text-mint-deep mb-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Tiva
                        </p>
                      )}
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <p className={`text-[10px] text-muted-foreground mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                      {new Date(msg.sent_at || msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t border-border/40">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Send a message to your family..."
              className="flex-1 px-4 py-3 bg-white/5 rounded-xl text-sm text-navy placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-lavender-deep/30"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-11 h-11 rounded-xl bg-tiva-teal text-[#0A0F0D] flex items-center justify-center hover:bg-navy/90 transition-all disabled:opacity-40"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Family Member or Caregiver</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input value={inviteForm.caregiver_name} onChange={e => setInviteForm({...inviteForm, caregiver_name: e.target.value})} placeholder="e.g. Marie Nkomo" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={inviteForm.caregiver_email} onChange={e => setInviteForm({...inviteForm, caregiver_email: e.target.value})} placeholder="marie@example.com" />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input type="tel" value={inviteForm.caregiver_phone} onChange={e => setInviteForm({...inviteForm, caregiver_phone: e.target.value})} placeholder="+237 6XX XXX XXX" />
            </div>
            <div>
              <Label>Relationship</Label>
              <Input value={inviteForm.relationship} onChange={e => setInviteForm({...inviteForm, relationship: e.target.value})} placeholder="e.g. Daughter, Nurse" />
            </div>
            <div>
              <Label>Permission Level</Label>
              <div className="flex gap-2">
                {[
                  { value: 'view', label: 'View Only' },
                  { value: 'manage_alerts', label: 'Manage Alerts' },
                  { value: 'full_access', label: 'Full Access' },
                ].map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setInviteForm({...inviteForm, permission_level: p.value})}
                    className={`flex-1 p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                      inviteForm.permission_level === p.value ? 'border-tiva-teal bg-tiva-teal/15 text-navy' : 'border-border text-muted-foreground'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={sending} className="bg-tiva-teal text-[#0A0F0D]">{sending ? 'Sending...' : 'Send Invite'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}