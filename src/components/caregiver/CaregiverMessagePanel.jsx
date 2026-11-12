import { useState, useEffect, useRef } from 'react';
import { Send, X, Phone, MessageCircle, Lock, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CaregiverMessagePanel({ patient, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState('group');
  const messagesEndRef = useRef(null);

  const loadMessages = async () => {
    try {
      const res = await base44.functions.invoke('caregiverPortal', {
        action: 'fetch_messages',
        patient_user_id: patient.assignment.patient_user_id,
        mode,
        contact_user_id: mode === 'private' ? patient.assignment.patient_user_id : undefined,
      });
      setMessages(res.data?.messages || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    loadMessages();
  }, [patient.assignment.patient_user_id, mode]);

  useEffect(() => {
    const pollInterval = setInterval(loadMessages, 5000);
    return () => clearInterval(pollInterval);
  }, [mode, patient.assignment.patient_user_id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await base44.functions.invoke('caregiverPortal', {
        action: 'send_message',
        patient_user_id: patient.assignment.patient_user_id,
        content: input.trim(),
        is_private: mode === 'private',
      });
      if (res.data?.message) {
        setMessages(prev => [...prev, res.data.message]);
      }
      setInput('');
    } catch {}
    setSending(false);
  };

  const phone = patient.profile?.phone;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div
        className="bg-card/90 backdrop-blur-xl rounded-3xl border border-white/10 w-full max-w-lg flex flex-col shadow-2xl animate-slide-up"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <div className="w-11 h-11 rounded-full bg-lavender flex items-center justify-center text-navy font-semibold">
            {patient.assignment.patient_name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-bold text-navy truncate">{patient.assignment.patient_name}</h3>
            <p className="text-xs text-muted-foreground">{patient.assignment.relationship || 'Patient'}</p>
          </div>
          {phone && (
            <a
              href={`tel:${phone}`}
              className="w-10 h-10 rounded-xl bg-mint/40 text-mint-deep flex items-center justify-center hover:bg-mint/60 transition-all"
              title="Call patient"
            >
              <Phone className="w-5 h-5" />
            </a>
          )}
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-1 p-2 border-b border-white/10">
          <button
            onClick={() => setMode('group')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'group' ? 'bg-tiva-teal text-[#0A0F0D]' : 'text-muted-foreground hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Care Circle
          </button>
          <button
            onClick={() => setMode('private')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'private' ? 'bg-peach text-peach-deep' : 'text-muted-foreground hover:bg-white/5'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Private
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3 min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 rounded-full animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: 'rgba(64,201,162,0.2)', borderTopColor: '#40C9A2' }} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              {mode === 'private' ? (
                <>
                  <div className="w-12 h-12 rounded-xl bg-peach/30 flex items-center justify-center mb-3">
                    <Lock className="w-6 h-6 text-amber" />
                  </div>
                  <p className="text-sm text-muted-foreground">No private messages yet. Send a private message — only you and {patient.assignment.patient_name} will see it.</p>
                </>
              ) : (
                <>
                  <MessageCircle className="w-10 h-10 text-lavender-deep mb-2" />
                  <p className="text-sm text-muted-foreground">No messages yet. Send a message to check in on {patient.assignment.patient_name}.</p>
                </>
              )}
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.sender_role === 'caregiver';
              const isTiva = msg.sender_role === 'tiva';
              return (
                <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`max-w-[75%] ${isTiva ? 'w-full' : ''}`}>
                    {msg.is_private && (
                      <div className={`flex items-center gap-1 mb-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <Lock className="w-2.5 h-2.5 text-amber" />
                        <span className="text-[9px] text-amber font-medium">Private</span>
                      </div>
                    )}
                    <div className={`px-4 py-3 rounded-2xl ${
                      isMe ? 'bg-tiva-teal text-[#0A0F0D] rounded-tr-sm' :
                      isTiva ? 'bg-mint/30 text-navy border border-mint-deep/20 rounded-xl' :
                      msg.is_private ? 'bg-peach/30 text-navy border border-amber/30 rounded-tl-sm' :
                      'bg-lavender/60 text-navy rounded-tl-sm'
                    }`}>
                      {!isMe && !isTiva && (
                        <p className="text-xs font-semibold text-lavender-deep mb-1">{msg.sender_name}</p>
                      )}
                      {isTiva && (
                        <p className="text-xs font-semibold text-mint-deep mb-1">Tiva</p>
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

        {/* Input */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={mode === 'private'
                ? `Private message to ${patient.assignment.patient_name}...`
                : `Message ${patient.assignment.patient_name}...`}
              className="flex-1 px-4 py-3 bg-white/5 rounded-xl text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-tiva-teal/30"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className={`w-11 h-11 rounded-xl flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-40 ${
                mode === 'private' ? 'bg-peach text-peach-deep' : 'bg-tiva-teal text-[#0A0F0D]'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}