import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { Send, Mic, MicOff, Volume2, VolumeX, Sparkles } from 'lucide-react';

const SYSTEM_PROMPT = `You are Tiva, an AI-powered predictive healthcare companion. Your role is to:
- Explain medical information in simple, clear language
- Provide health risk indicators (never diagnose diseases)
- Remind about medications and appointments
- Detect emergency keywords and flag them
- Warn about potential medication conflicts
- Always recommend professional medical help when needed
- Be warm, empathetic, and supportive
- Remember the user's health context and personalize responses

You NEVER provide a medical diagnosis. You identify patterns and suggest when to see a doctor.
Keep responses concise, warm, and easy to understand for someone with limited medical knowledge.
If the user mentions emergency keywords (chest pain, can't breathe, severe bleeding, unconscious, stroke symptoms), immediately advise them to use the Emergency button or call emergency services.`;

export default function AIChat() {
  const { language } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakResponses, setSpeakResponses] = useState(true);
  const [profile, setProfile] = useState(null);
  const [medications, setMedications] = useState([]);
  const [readings, setReadings] = useState([]);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    async function loadContext() {
      const [profiles, meds, reads] = await Promise.all([
        base44.entities.HealthProfile.list().catch(() => []),
        base44.entities.Medication.filter({ status: 'active' }).catch(() => []),
        base44.entities.HealthReading.list('-created_date', 10).catch(() => []),
      ]);
      setProfile(profiles[0] || null);
      setMedications(meds || []);
      setReadings(reads || []);
    }
    loadContext();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildContext = () => {
    let ctx = '';
    if (profile) {
      ctx += `User: ${profile.full_name}, ${profile.date_of_birth ? Math.floor((new Date() - new Date(profile.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) + ' years old' : 'age unknown'}. `;
      if (profile.blood_type) ctx += `Blood type: ${profile.blood_type}. `;
      if (profile.chronic_conditions?.length) ctx += `Conditions: ${profile.chronic_conditions.join(', ')}. `;
      if (profile.allergies?.length) ctx += `Allergies: ${profile.allergies.join(', ')}. `;
    }
    if (medications.length) {
      ctx += `Current medications: ${medications.map(m => `${m.name} (${m.dosage})`).join(', ')}. `;
    }
    if (readings.length) {
      const bp = readings.find(r => r.metric_type === 'blood_pressure_systolic');
      if (bp) ctx += `Latest BP: ${bp.value}/${bp.secondary_value} mmHg. `;
      const glucose = readings.find(r => r.metric_type === 'glucose');
      if (glucose) ctx += `Latest glucose: ${glucose.value} mg/dL. `;
    }
    return ctx;
  };

  const handleSend = async (text) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    const userMsg = { role: 'user', content: messageText, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const context = buildContext();
      const conversationHistory = messages.map(m => `${m.role === 'user' ? 'User' : 'Tiva'}: ${m.content}`).join('\n');
      const prompt = `${SYSTEM_PROMPT}\n\nUser health context: ${context}\n\nPrevious conversation:\n${conversationHistory}\n\nUser says: "${messageText}"\n\nRespond as Tiva in ${language === 'fr' ? 'French' : 'English'}:`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: 'automatic',
      });

      const responseText = typeof response === 'string' ? response : response?.response || response?.text || JSON.stringify(response);
      const aiMsg = { role: 'assistant', content: responseText, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, aiMsg]);

      // Save conversation
      try {
        const existing = await base44.entities.Conversation.list('-created_date', 1);
        if (existing.length > 0) {
          await base44.entities.Conversation.update(existing[0].id, {
            messages: [...(existing[0].messages || []), userMsg, aiMsg],
          });
        } else {
          await base44.entities.Conversation.create({
            title: 'Health Chat',
            messages: [userMsg, aiMsg],
            language,
          });
        }
      } catch (e) {
        console.error('Save error:', e);
      }

      // Text-to-speech
      if (speakResponses && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(responseText);
        utterance.lang = language === 'fr' ? 'fr-FR' : 'en-US';
        speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'assistant', content: 'I apologize, I had trouble responding just now. Please try again.', timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice input is not supported on this device. You can type instead.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'fr' ? 'fr-FR' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      handleSend(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const quickPrompts = language === 'fr' ? [
    'Quels sont mes signes vitaux actuels ?',
    'Rappelle-moi mes médicaments',
    'Je me sens fatigué aujourd\'hui',
    'Conseils pour mon hypertension',
  ] : [
    'What are my current vitals?',
    'Remind me about my medications',
    'I feel tired today',
    'Tips for my blood pressure',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-6rem)] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--tiva-navy)' }}>
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold" style={{ color: 'var(--tiva-navy)' }}>Tiva AI</h1>
            <p className="text-sm" style={{ color: 'var(--tiva-navy)', opacity: 0.5 }}>
              {isListening ? 'Listening...' : 'Your health companion'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setSpeakResponses(!speakResponses)}
          className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200"
          style={{ backgroundColor: speakResponses ? 'var(--tiva-mint)' : 'var(--tiva-card)', border: '1px solid var(--tiva-border)' }}
        >
          {speakResponses ? <Volume2 size={20} style={{ color: 'var(--tiva-navy)' }} /> : <VolumeX size={20} style={{ color: 'var(--tiva-navy)', opacity: 0.5 }} />}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-settle">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5" style={{ backgroundColor: 'var(--tiva-lavender)' }}>
              <Sparkles size={36} style={{ color: 'var(--tiva-navy)' }} />
            </div>
            <h2 className="font-heading text-2xl font-bold mb-2" style={{ color: 'var(--tiva-navy)' }}>
              {language === 'fr' ? 'Bonjour, je suis Tiva' : 'Hi, I\'m Tiva'}
            </h2>
            <p className="text-sm max-w-md mb-8" style={{ color: 'var(--tiva-navy)', opacity: 0.5 }}>
              {language === 'fr'
                ? 'Posez-moi une question sur votre santé, vos médicaments, ou dites-moi comment vous vous sentez.'
                : 'Ask me about your health, medications, or tell me how you\'re feeling. I\'m here to help.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="tiva-card p-4 text-left text-sm font-heading font-semibold transition-all duration-200 hover:-translate-y-0.5"
                  style={{ color: 'var(--tiva-navy)' }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            <div
              className="max-w-[80%] px-5 py-3.5 rounded-3xl"
              style={msg.role === 'user'
                ? { backgroundColor: 'var(--tiva-navy)', color: 'white', borderBottomRightRadius: '8px' }
                : { backgroundColor: 'var(--tiva-card)', border: '1px solid var(--tiva-border)', color: 'var(--tiva-navy)', borderBottomLeftRadius: '8px' }
              }
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="px-5 py-4 rounded-3xl" style={{ backgroundColor: 'var(--tiva-card)', border: '1px solid var(--tiva-border)' }}>
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--tiva-lavender-mid)', animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--tiva-lavender-mid)', animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: 'var(--tiva-lavender-mid)', animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="mt-4">
        <div className="flex items-center gap-2 p-2 rounded-3xl" style={{ backgroundColor: 'var(--tiva-card)', border: '1px solid var(--tiva-border)', boxShadow: 'var(--tiva-shadow)' }}>
          <button
            onClick={toggleVoice}
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
            style={isListening ? { backgroundColor: 'var(--tiva-red)' } : { backgroundColor: 'var(--tiva-lavender)' }}
          >
            {isListening ? <MicOff size={22} style={{ color: 'var(--tiva-navy)' }} /> : <Mic size={22} style={{ color: 'var(--tiva-navy)' }} />}
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={language === 'fr' ? 'Tapez ou parlez à Tiva...' : 'Type or speak to Tiva...'}
            className="flex-1 bg-transparent outline-none px-2 text-base"
            style={{ color: 'var(--tiva-navy)' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-200 disabled:opacity-30"
            style={{ backgroundColor: 'var(--tiva-navy)' }}
          >
            <Send size={20} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}