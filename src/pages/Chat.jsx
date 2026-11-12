import { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Sparkles, AlertTriangle, Trash2, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/AppLayout';
import { LoadingState } from '@/components/ui/primitives';
import ReactMarkdown from 'react-markdown';
import { speak as speakText } from '@/utils/tts';
import PredictiveInsightBanner from '@/components/PredictiveInsightBanner';

const SYSTEM_PROMPT = `You are Tiva, an AI-powered predictive healthcare companion. Your role is to:
- Explain medical information in simple, accessible language
- Provide health guidance based on the user's profile
- Detect potential emergencies and recommend professional help
- Never diagnose diseases — you identify patterns and risk indicators
- Be warm, empathetic, and supportive
- Adapt your language level to the user
- Warn about medication conflicts when relevant
- Always recommend consulting a healthcare professional for clinical decisions

Keep responses concise, clear, and actionable. Use a warm, caring tone.`;

export default function Chat() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [profile, setProfile] = useState(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    try {
      const [p, convs] = await Promise.all([
        base44.entities.HealthProfile.list().then(r => r[0]).catch(() => null),
        base44.entities.Conversation.list('-created_date', 20).catch(() => []),
      ]);
      setProfile(p);
      setConversations(convs);
      if (convs.length > 0) {
        setActiveConv(convs[0]);
        setMessages(convs[0].messages || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const startNewConversation = async () => {
    const conv = await base44.entities.Conversation.create({
      title: 'New Conversation',
      messages: [{
        role: 'assistant',
        content: `Hello${profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! I'm Tiva, your AI health companion. How can I help you today? You can ask me about your medications, health readings, or any health questions.`,
        timestamp: new Date().toISOString(),
        voice: false,
      }],
    });
    setActiveConv(conv);
    setMessages(conv.messages);
    setConversations([conv, ...conversations]);
  };

  const buildContext = () => {
    if (!profile) return '';
    let ctx = `\n\nUser Health Context:\n- Name: ${profile.full_name}\n- Age: ${profile.date_of_birth ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear() : 'unknown'}\n- Blood type: ${profile.blood_type || 'unknown'}\n- Conditions: ${profile.chronic_conditions?.join(', ') || 'none'}\n- Medications: ${profile.current_medications?.join(', ') || 'none'}\n- Allergies: ${profile.allergies?.join(', ') || 'none'}\n- Care mode: ${profile.care_mode}`;
    return ctx;
  };

  const handleSend = async (text) => {
    const content = text || input.trim();
    if (!content || sending) return;

    let conv = activeConv;
    if (!conv) {
      conv = await base44.entities.Conversation.create({
        title: content.slice(0, 40),
        messages: [],
      });
      setActiveConv(conv);
      setConversations([conv, ...conversations]);
    }

    const userMsg = { role: 'user', content, timestamp: new Date().toISOString(), voice: listening };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setSending(true);

    try {
      const conversationHistory = updatedMessages.slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

      const prompt = `${SYSTEM_PROMPT}${buildContext()}\n\nConversation history:\n${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUser: ${content}\n\nTiva:`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            response: { type: 'string' },
            is_emergency: { type: 'boolean' },
            category: { type: 'string' },
          },
        },
      });

      const aiContent = response.response || response;
      const isEmergency = response.is_emergency || /emergency|urgent|call.*doctor|911|help.*now/i.test(content);

      const aiMsg = {
        role: 'assistant',
        content: typeof aiContent === 'string' ? aiContent : JSON.stringify(aiContent),
        timestamp: new Date().toISOString(),
        voice: voiceEnabled,
      };

      const allMessages = [...updatedMessages, aiMsg];
      setMessages(allMessages);

      await base44.entities.Conversation.update(conv.id, {
        title: conv.title === 'New Conversation' ? content.slice(0, 40) : conv.title,
        messages: allMessages,
        flagged_emergency: isEmergency,
      });

      if (isEmergency) {
        await base44.entities.Alert.create({
          type: 'health_risk',
          severity: 'red',
          title: 'Emergency keyword detected in chat',
          description: `User message: "${content.slice(0, 100)}"`,
          trigger_source: 'ai',
          status: 'active',
        });
      }

      if (voiceEnabled && typeof aiMsg.content === 'string') {
        speakText(aiMsg.content);
      }
    } catch (e) {
      const errMsg = {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
      };
      setMessages([...updatedMessages, errMsg]);
    }
    setSending(false);
    setListening(false);
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice recognition is not supported in your browser. You can still type.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = profile?.language === 'fr' ? 'fr-FR' : 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join('');
      setInput(transcript);
      if (event.results[0].isFinal) {
        setListening(false);
        handleSend(transcript);
      }
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const selectConversation = (conv) => {
    setActiveConv(conv);
    setMessages(conv.messages || []);
  };

  const deleteConversation = async (id, e) => {
    e.stopPropagation();
    await base44.entities.Conversation.delete(id);
    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    if (activeConv?.id === id) {
      setActiveConv(updated[0] || null);
      setMessages(updated[0]?.messages || []);
    }
  };

  if (loading) return <AppLayout><LoadingState label="Loading conversations..." /></AppLayout>;

  return (
    <AppLayout>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-7rem)] lg:h-[calc(100vh-4rem)]">
        {/* Conversation List */}
        <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex flex-col hidden lg:flex">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-navy">Conversations</h2>
            <button
              onClick={startNewConversation}
              className="w-8 h-8 rounded-lg bg-lavender flex items-center justify-center hover:bg-lavender-deep/30 transition-all"
            >
              <Plus className="w-4 h-4 text-navy" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-1">
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No conversations yet</p>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => selectConversation(c)}
                  className={`group p-3 rounded-xl cursor-pointer transition-all ${
                    activeConv?.id === c.id ? 'bg-lavender' : 'hover:bg-muted/60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <p className={`text-sm font-medium truncate flex-1 ${activeConv?.id === c.id ? 'text-navy' : 'text-muted-foreground'}`}>
                      {c.title}
                    </p>
                    <button
                      onClick={(e) => deleteConversation(c.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                  {c.flagged_emergency && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-destructive">
                      <AlertTriangle className="w-3 h-3" /> Emergency flagged
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tiva-teal/30 to-tiva-teal/5 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-mint" />
              </div>
              <div>
                <h2 className="font-heading font-semibold text-navy">Tiva AI Companion</h2>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-mint-deep animate-pulse-soft" />
                  Online · Voice ready
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                  voiceEnabled ? 'bg-mint text-mint-deep' : 'bg-muted text-muted-foreground'
                }`}
                title={voiceEnabled ? 'Voice responses on' : 'Voice responses off'}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={startNewConversation}
                className="lg:hidden w-9 h-9 rounded-lg bg-lavender flex items-center justify-center"
              >
                <Plus className="w-4 h-4 text-navy" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 lg:p-6 space-y-4">
            <PredictiveInsightBanner />
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl bg-lavender flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-lavender-deep" />
                </div>
                <h3 className="font-heading font-semibold text-lg text-navy mb-1">Start a conversation with Tiva</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                  Ask me about your health, medications, or say "Hey Tiva" to use voice. I remember your health profile.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['What do my blood pressure readings mean?', 'Remind me about my medications', 'I feel dizzy today'].map(s => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="px-3 py-1.5 rounded-full bg-white/5 text-sm text-white hover:bg-lavender transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-tiva-teal text-[#0A0F0D] rounded-tr-sm'
                        : 'bg-tiva-teal/15 text-white rounded-tl-sm'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown className="text-sm prose prose-sm max-w-none [&>*]:mb-2 [&>*:last-child]:mb-0">
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  <p className={`text-[10px] text-muted-foreground mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.voice && ' · 🎤 voice'}
                  </p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-lavender/60 px-4 py-3 rounded-2xl rounded-tl-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-lavender-deep animate-typing" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-lavender-deep animate-typing" style={{ animationDelay: '200ms' }} />
                    <span className="w-2 h-2 rounded-full bg-lavender-deep animate-typing" style={{ animationDelay: '400ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border/40">
            {listening && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-peach/40 rounded-xl">
                <Mic className="w-4 h-4 text-peach-deep animate-pulse-soft" />
                <span className="text-sm text-peach-deep font-medium">Listening... speak now</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={listening ? stopListening : startListening}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                  listening ? 'bg-destructive text-white animate-pulse-soft' : 'bg-lavender text-navy hover:bg-lavender-deep/30'
                }`}
              >
                {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Tiva anything about your health..."
                className="flex-1 px-4 py-3 bg-white/5 rounded-xl text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-lavender-deep/30"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || sending}
                className="w-11 h-11 rounded-xl bg-tiva-teal text-[#0A0F0D] flex items-center justify-center hover:bg-navy/90 transition-all flex-shrink-0 disabled:opacity-40"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}