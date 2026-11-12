import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, Siren } from 'lucide-react';
import { triggerSOS } from '@/utils/sosTrigger';

const WAKE_WORDS = ['hey tiva', 'hi tiva', 'ok tiva', 'okay tiva', 'tiva help'];
const EMERGENCY_PHRASES = [
  'tiva help emergency', 'tiva emergency', 'hey tiva emergency',
  'tiva help me emergency', 'tiva sos', 'hey tiva sos',
  'tiva help sos', 'tiva call emergency',
];

export default function WakeWordListener() {
  const navigate = useNavigate();
  const recognitionRef = useRef(null);
  const restartingRef = useRef(false);
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | listening | denied | unsupported
  const [heard, setHeard] = useState(false);
  const [emergencyTriggered, setEmergencyTriggered] = useState(false);

  const enabled = localStorage.getItem('wakeWordEnabled') === 'true';

  const stop = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    setStatus('idle');
  };

  const start = () => {
    if (!enabled) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setStatus('unsupported'); return; }

    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => setStatus('listening');

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setStatus('denied');
      } else if (e.error === 'no-speech' || e.error === 'aborted') {
        // restart handled by onend
      }
    };

    recognition.onend = () => {
      // auto-restart if still enabled and not denied
      if (localStorage.getItem('wakeWordEnabled') === 'true' && status !== 'denied') {
        try { recognition.start(); } catch (err) {}
      }
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.toLowerCase().trim();
        // check emergency phrases first (higher priority)
        const isEmergency = EMERGENCY_PHRASES.some(p => transcript.includes(p));
        if (isEmergency && !heard) {
          setHeard(true);
          setEmergencyTriggered(true);
          // urgent haptic pattern + alarm sound
          if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 880; osc.type = 'square';
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
            osc.start(); osc.stop(ctx.currentTime + 0.8);
          } catch (e) {}
          // trigger full SOS
          triggerSOS({ source: 'wake_word', phrase: transcript })
            .then(() => navigate('/emergency'))
            .catch(() => navigate('/emergency'));
          setTimeout(() => { setHeard(false); setEmergencyTriggered(false); }, 5000);
          break;
        }
        // then check wake words
        const matched = WAKE_WORDS.some(w => transcript.includes(w));
        if (matched && !heard) {
          setHeard(true);
          if (navigator.vibrate) navigator.vibrate(120);
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 660; osc.type = 'sine';
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start(); osc.stop(ctx.currentTime + 0.4);
          } catch (e) {}
          navigate('/chat');
          setTimeout(() => setHeard(false), 2500);
          break;
        }
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch (e) {}
  };

  useEffect(() => {
    if (!enabled) { stop(); return; }
    start();
    return () => stop();
  }, [enabled]);

  useEffect(() => {
    const handler = () => {
      if (localStorage.getItem('wakeWordEnabled') === 'true') {
        if (!recognitionRef.current) start();
      } else {
        stop();
      }
    };
    window.addEventListener('storage', handler);
    window.addEventListener('wakeWordToggle', handler);
    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener('wakeWordToggle', handler);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      {emergencyTriggered && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-destructive/20 backdrop-blur-sm animate-fade-in pointer-events-none">
          <div className="bg-destructive text-white rounded-3xl p-8 text-center max-w-sm mx-4 pointer-events-auto">
            <Siren className="w-16 h-16 mx-auto mb-3 animate-pulse-soft" />
            <h2 className="font-heading font-bold text-2xl mb-1">Emergency SOS Triggered</h2>
            <p className="text-sm text-white/80">Notifying your contacts, local services & caregivers…</p>
          </div>
        </div>
      )}
      <div className="fixed bottom-20 lg:bottom-6 right-4 z-50">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-md border text-xs font-medium ${
          status === 'listening' ? 'bg-mint/20 border-mint-deep/40 text-mint-deep' :
          status === 'denied' ? 'bg-destructive/15 border-destructive/40 text-destructive' :
          status === 'unsupported' ? 'bg-peach/20 border-peach-deep/40 text-peach-deep' :
          'bg-card/60 border-white/10 text-muted-foreground'
        }`}>
          <Sparkles className="w-3.5 h-3.5" />
          {status === 'listening' && <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-mint-deep animate-pulse-soft" /> Listening for "Hey Tiva"
          </span>}
          {status === 'denied' && <span>Mic access denied</span>}
          {status === 'unsupported' && <span>Voice wake not supported</span>}
          {status === 'idle' && <span>Starting…</span>}
          <button
            onClick={() => {
              localStorage.setItem('wakeWordEnabled', 'false');
              window.dispatchEvent(new Event('wakeWordToggle'));
            }}
            className="ml-1 opacity-60 hover:opacity-100"
            title="Disable wake word"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </>
  );
}