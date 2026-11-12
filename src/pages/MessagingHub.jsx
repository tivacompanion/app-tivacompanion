import { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, ImagePlus, X, Sparkles, Users, Phone, Lock, ArrowLeft, MapPin, MessageCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/AppLayout';
import { LoadingState } from '@/components/ui/primitives';
import MessageBubble from '@/components/messaging/MessageBubble';
import SosLocationMap from '@/components/SosLocationMap';
import { useVoiceInput } from '@/hooks/useVoice';
import 'leaflet/dist/leaflet.css';

export default function MessagingHub() {
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [isCaregiver, setIsCaregiver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [mode, setMode] = useState('private');
  const [selectedContact, setSelectedContact] = useState(null);
  const [previewContact, setPreviewContact] = useState(null);
  const [previewLocation, setPreviewLocation] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) loadMessages();
  }, [mode, selectedContact, loading, isCaregiver]);

  useEffect(() => {
    if (loading) return;
    const pollInterval = setInterval(loadMessages, 5000);
    const unsubscribe = base44.entities.FamilyMessage.subscribe(() => {
      loadMessages();
    });
    return () => {
      clearInterval(pollInterval);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [loading, mode, selectedContact, isCaregiver]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    const user = await base44.auth.me().catch(() => null);

    const [p, contactsRes, caregiverCheck] = await Promise.all([
      base44.entities.HealthProfile.list().then(r => r[0]).catch(() => null),
      base44.functions.invoke('caregiverPortal', { action: 'fetch_private_contacts' }).catch(() => ({ data: { contacts: [] } })),
      base44.functions.invoke('caregiverPortal', { action: 'check_caregiver' }).catch(() => ({ data: { is_caregiver: false } })),
    ]);

    setUserName(user?.full_name || 'You');
    setUserId(user?.id || null);
    setProfile(p);
    setContacts(contactsRes.data?.contacts || []);
    setIsCaregiver(!!caregiverCheck.data?.is_caregiver);
    setLoading(false);
  };

  const loadMessages = async () => {
    try {
      const params = { action: 'fetch_messages', mode };
      if (mode === 'private' && selectedContact) {
        params.contact_user_id = selectedContact.user_id;
        if (selectedContact.role === 'patient') {
          params.patient_user_id = selectedContact.user_id;
        }
      }
      if (mode === 'group' && isCaregiver && selectedContact) {
        params.patient_user_id = selectedContact.user_id;
      }
      const res = await base44.functions.invoke('caregiverPortal', params);
      setMessages(res.data?.messages || []);
    } catch {
      setMessages([]);
    }
  };

  const { listening, interimText, start: startVoiceInput, stop: stopVoiceInput } = useVoiceInput({
    lang: profile?.language === 'fr' ? 'fr-FR' : 'en-US',
    onFinal: (text) => setInput(text),
  });

  // Whether the user needs to select a contact before messaging
  const needsSelection = mode === 'private' ? !selectedContact : (isCaregiver && !selectedContact);

  const handleSelectContact = async (c) => {
    if (isCaregiver) {
      setPreviewContact(c);
      setPreviewLocation(null);
      setLoadingPreview(true);
      try {
        const targetId = c?.user_id || c?.patient_user_id || c?.id;
        if (targetId) {
          const alerts = await base44.entities.Alert.filter({ patient_user_id: targetId }, '-created_date', 20).catch(() => []);
          const withLoc = alerts.find(a => a.location_lat != null && a.location_lng != null);
          if (withLoc) {
            setPreviewLocation({ lat: withLoc.location_lat, lng: withLoc.location_lng, timestamp: withLoc.created_date });
          }
        }
      } catch {}
      setLoadingPreview(false);
    } else {
      setSelectedContact(c);
    }
  };

  const openConversation = () => {
    setSelectedContact(previewContact);
    setPreviewContact(null);
    setPreviewLocation(null);
  };

  const handleSendText = async () => {
    const content = (input || interimText).trim();
    if (!content || sending || needsSelection) return;
    setSending(true);
    try {
      if (isCaregiver && selectedContact) {
        await base44.functions.invoke('caregiverPortal', {
          action: 'send_message',
          patient_user_id: selectedContact.user_id,
          content,
          is_private: mode === 'private',
          recipient_user_id: mode === 'private' ? selectedContact.user_id : undefined,
        });
      } else {
        await base44.functions.invoke('caregiverPortal', {
          action: 'patient_send_message',
          content,
          is_private: mode === 'private',
          recipient_user_id: mode === 'private' ? selectedContact?.user_id : undefined,
        });
      }
      setInput('');
      await loadMessages();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSendImage = async () => {
    if (!pendingImage || needsSelection) return;
    setSending(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pendingImage });
      if (isCaregiver && selectedContact) {
        await base44.functions.invoke('caregiverPortal', {
          action: 'send_message',
          patient_user_id: selectedContact.user_id,
          content: '📷 Photo',
          message_type: 'image',
          image_url: file_url,
          is_private: mode === 'private',
          recipient_user_id: mode === 'private' ? selectedContact.user_id : undefined,
        });
      } else {
        await base44.functions.invoke('caregiverPortal', {
          action: 'patient_send_message',
          content: '📷 Photo',
          message_type: 'image',
          image_url: file_url,
          is_private: mode === 'private',
          recipient_user_id: mode === 'private' ? selectedContact?.user_id : undefined,
        });
      }
      setPendingImage(null);
      setImagePreview(null);
      await loadMessages();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <AppLayout><LoadingState label="Loading messages..." /></AppLayout>;

  const contactLabel = isCaregiver ? 'Patients' : 'Caregivers';
  const emptyMsg = isCaregiver ? 'No patients connected yet.' : 'No caregivers connected yet.';

  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 h-[calc(100vh-7rem)] lg:h-[calc(100vh-4rem)]">
        {/* Sidebar (desktop) */}
        <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex flex-col hidden lg:flex">
          <div className="flex items-center gap-2 mb-4">
            {mode === 'private' ? <Lock className="w-5 h-5 text-amber" /> : <Users className="w-5 h-5 text-lavender-deep" />}
            <h2 className="font-heading font-semibold text-navy">
              {mode === 'private' ? 'Private Contacts' : `Your ${contactLabel}`}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2">
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{emptyMsg}</p>
            ) : (
              contacts.map((c) => {
                const isSelected = selectedContact?.user_id === c.user_id;
                const showCall = !isCaregiver && mode === 'group';
                return (
                  <button
                    key={c.user_id}
                    onClick={() => handleSelectContact(c)}
                    className={`w-full p-3 rounded-xl transition-all text-left ${
                      isSelected
                        ? mode === 'private' ? 'bg-peach/30 border border-amber/30' : 'bg-tiva-teal/15 border border-tiva-teal/30'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-navy font-semibold text-sm ${
                        mode === 'private' ? 'bg-peach/30' : 'bg-lavender'
                      }`}>
                        {c.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-navy truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.relationship || (isCaregiver ? 'Patient' : 'Caregiver')}</p>
                      </div>
                      {mode === 'private' ? (
                        <Lock className="w-3 h-3 text-amber" />
                      ) : showCall && c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center justify-center w-7 h-7 rounded-lg bg-lavender text-lavender-deep hover:bg-lavender-deep/20"
                        >
                          <Phone className="w-3 h-3" />
                        </a>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col overflow-hidden">
          {/* Mode Tabs */}
          <div className="flex items-center gap-1 p-2 border-b border-white/10">
            <button
              onClick={() => { setMode('group'); setSelectedContact(null); setPreviewContact(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                mode === 'group' ? 'bg-tiva-teal text-[#0A0F0D]' : 'text-muted-foreground hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" /> Care Circle
            </button>
            <button
              onClick={() => { setMode('private'); setSelectedContact(null); setPreviewContact(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                mode === 'private' ? 'bg-peach text-peach-deep' : 'text-muted-foreground hover:bg-white/5'
              }`}
            >
              <Lock className="w-4 h-4" /> Private
            </button>
          </div>

          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
            {!needsSelection && (
              <button
                onClick={() => setSelectedContact(null)}
                className="lg:hidden w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all flex-shrink-0"
                title="Back to contacts"
              >
                <ArrowLeft className="w-5 h-5 text-navy" />
              </button>
            )}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              mode === 'private' ? 'bg-peach/30' : 'bg-gradient-to-br from-tiva-teal/30 to-tiva-teal/5'
            }`}>
              {mode === 'private' ? (
                selectedContact ? (
                  <span className="text-navy font-heading font-bold text-sm">
                    {selectedContact.name?.charAt(0)?.toUpperCase()}
                  </span>
                ) : <Lock className="w-5 h-5 text-amber" />
              ) : (
                selectedContact && isCaregiver ? (
                  <span className="text-navy font-heading font-bold text-sm">
                    {selectedContact.name?.charAt(0)?.toUpperCase()}
                  </span>
                ) : <Sparkles className="w-5 h-5 text-mint" />
              )}
            </div>
            <div>
              <h2 className="font-heading font-semibold text-navy">
                {mode === 'private' && selectedContact
                  ? `Private with ${selectedContact.name}`
                  : mode === 'private'
                    ? 'Select a contact'
                    : mode === 'group' && isCaregiver && selectedContact
                      ? `Care Circle · ${selectedContact.name}`
                      : mode === 'group' && isCaregiver
                        ? 'Select a patient'
                        : 'Care Circle Messages'}
              </h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {mode === 'private' ? (
                  <>
                    <Lock className="w-2.5 h-2.5 text-amber" />
                    Only you and {selectedContact?.name || 'this contact'} can see these messages
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-mint-deep animate-pulse-soft" />
                    {contacts.length} {contactLabel.toLowerCase().replace(/s$/, '')}{contacts.length !== 1 ? 's' : ''} connected
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 lg:p-6 space-y-3">
            {/* Contact location preview before chat opens */}
            {previewContact ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={() => { setPreviewContact(null); setPreviewLocation(null); }}
                    className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all flex-shrink-0"
                  >
                    <ArrowLeft className="w-5 h-5 text-navy" />
                  </button>
                  <h3 className="font-heading font-semibold text-navy">{previewContact.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4 px-1">
                  {previewContact.relationship || 'Patient'} · Last known location before opening conversation
                </p>
                {loadingPreview ? (
                  <LoadingState label="Fetching location..." />
                ) : previewLocation ? (
                  <SosLocationMap lat={previewLocation.lat} lng={previewLocation.lng} timestamp={previewLocation.timestamp} />
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-lavender flex items-center justify-center mb-4">
                      <MapPin className="w-8 h-8 text-lavender-deep" />
                    </div>
                    <p className="text-sm text-muted-foreground max-w-md">No location data available for this patient yet.</p>
                  </div>
                )}
                <div className="mt-auto pt-4">
                  <button
                    onClick={openConversation}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-tiva-teal text-[#0A0F0D] font-heading font-semibold hover:brightness-110 transition-all"
                  >
                    <MessageCircle className="w-5 h-5" /> Open Conversation
                  </button>
                </div>
              </div>
            ) : needsSelection ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 px-1 pb-3">
                  {mode === 'private' ? <Lock className="w-4 h-4 text-amber" /> : <Users className="w-4 h-4 text-lavender-deep" />}
                  <h3 className="font-heading font-semibold text-navy">
                    {mode === 'private' ? 'Private Conversations' : `Select a ${isCaregiver ? 'Patient' : 'Caregiver'}`}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground px-1 pb-3">
                  {mode === 'private'
                    ? 'Tap a contact to start a private conversation. Only you and they can see these messages.'
                    : isCaregiver
                      ? 'Select a patient to view their care circle messages and send updates.'
                      : 'Tap a caregiver to start a conversation.'}
                </p>
                {contacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-peach/30 flex items-center justify-center mb-4">
                      {mode === 'private' ? <Lock className="w-8 h-8 text-amber" /> : <Users className="w-8 h-8 text-lavender-deep" />}
                    </div>
                    <p className="text-sm text-muted-foreground max-w-md">{emptyMsg}</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2">
                    {contacts.map((c) => (
                      <button
                        key={c.user_id}
                        onClick={() => handleSelectContact(c)}
                        className="w-full p-3 rounded-xl transition-all text-left bg-white/5 hover:bg-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-navy font-semibold ${
                            mode === 'private' ? 'bg-peach/30' : 'bg-lavender'
                          }`}>
                            {c.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-navy truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.relationship || (isCaregiver ? 'Patient' : 'Caregiver')}</p>
                          </div>
                          {mode === 'private'
                            ? <Lock className="w-3.5 h-3.5 text-amber" />
                            : c.phone
                              ? <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                              : null}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-lavender flex items-center justify-center mb-4">
                  {mode === 'private' ? <Lock className="w-8 h-8 text-amber" /> : <Sparkles className="w-8 h-8 text-lavender-deep" />}
                </div>
                <h3 className="font-heading font-semibold text-lg text-navy mb-1">
                  {mode === 'private' ? 'Start a private conversation' : 'Start the conversation'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {mode === 'private'
                    ? `Send a private message to ${selectedContact?.name}. Only they will see it.`
                    : isCaregiver
                      ? `Send a message to ${selectedContact?.name}'s care circle. The patient and their family will see it.`
                      : 'Send a message, voice note, or photo to your family and caregivers.'}
                </p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = userId ? msg.sender_user_id === userId : msg.sender_role === 'patient';
                return (
                  <MessageBubble
                    key={msg.id || i}
                    message={msg}
                    isMe={isMe}
                    isTiva={msg.sender_role === 'tiva'}
                    isPrivate={msg.is_private}
                  />
                );
              })
            )}
            {sending && (
              <div className="flex justify-end animate-fade-in">
                <div className={`px-4 py-3 rounded-2xl rounded-tr-sm ${mode === 'private' ? 'bg-peach/30' : 'bg-tiva-teal/30'}`}>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-tiva-teal animate-pulse" />
                    <span className="w-2 h-2 rounded-full bg-tiva-teal animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-tiva-teal animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Image preview */}
          {imagePreview && (
            <div className="px-4 py-3 border-t border-white/10 flex items-center gap-3">
              <img src={imagePreview} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
              <button
                onClick={handleSendImage}
                disabled={sending}
                className="px-4 py-2 rounded-xl bg-tiva-teal text-[#0A0F0D] text-sm font-semibold disabled:opacity-40"
              >
                {sending ? 'Sending...' : 'Send Photo'}
              </button>
              <button
                onClick={() => { setPendingImage(null); setImagePreview(null); }}
                className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {/* Input */}
          {!needsSelection && (
            <div className="p-4 border-t border-border/40">
              {/* Quick Care Prompts */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-1">
                {(isCaregiver ? [
                  'Did you take your pills today? 💊',
                  'How are you feeling right now? 🩺',
                  'Remember to drink water 💧',
                  'I am on my way to visit 🚗',
                  'Call me if you need anything 📞',
                ] : [
                  'I took my medications 💊',
                  'Feeling well today 😊',
                  'Checked my blood pressure 🩺',
                  'Need a hand with something 🙋',
                  'Resting peacefully now 💤',
                ]).map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border border-white/5 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              {listening && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-peach/40 rounded-xl">
                  <Mic className="w-4 h-4 text-peach-deep animate-pulse-soft" />
                  <span className="text-sm text-peach-deep font-medium">Listening... {interimText}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-11 h-11 rounded-xl bg-lavender text-navy hover:bg-lavender-deep/30 transition-all flex items-center justify-center flex-shrink-0"
                  title="Send photo"
                >
                  <ImagePlus className="w-5 h-5" />
                </button>
                <button
                  onClick={listening ? stopVoiceInput : startVoiceInput}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                    listening ? 'bg-destructive text-white animate-pulse-soft' : 'bg-peach/40 text-peach-deep hover:bg-peach/60'
                  }`}
                  title="Voice to text"
                >
                  {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <input
                  type="text"
                  value={listening ? interimText || input : input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                  placeholder={mode === 'private' ? `Private message to ${selectedContact?.name}...` : `Message to ${selectedContact?.name || 'care circle'}...`}
                  className="flex-1 min-w-0 px-4 py-3 bg-white/5 rounded-xl text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-lavender-deep/30"
                />
                <button
                  onClick={handleSendText}
                  disabled={(!input.trim() && !interimText.trim()) || sending}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center hover:brightness-110 transition-all flex-shrink-0 disabled:opacity-40 ${
                    mode === 'private' ? 'bg-peach text-peach-deep' : 'bg-tiva-teal text-[#0A0F0D]'
                  }`}
                  title="Send"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}