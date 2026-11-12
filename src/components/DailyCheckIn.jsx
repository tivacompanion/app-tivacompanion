import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, X, Check, ChevronRight, Volume2, Sparkles, Heart, Moon, Activity } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { speak, cancel } from '@/utils/tts';

const questions = [
{
  id: 'feeling',
  icon: Heart,
  prompt: "Let's do your daily check-in. How are you feeling today?",
  placeholder: 'e.g., "I feel pretty good today, a little tired but okay"'
},
{
  id: 'sleep',
  icon: Moon,
  prompt: "How many hours did you sleep last night?",
  placeholder: 'e.g., "I slept about 7 hours"'
},
{
  id: 'symptoms',
  icon: Activity,
  prompt: "Are you experiencing any pain, discomfort, or unusual symptoms?",
  placeholder: 'e.g., "No pain today" or "I have a slight headache"'
}];


export default function DailyCheckIn({ onClose, onComplete }) {
  const [step, setStep] = useState(0); // 0-2 questions, 3 analyzing, 4 done
  const [responses, setResponses] = useState(['', '', '']);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [result, setResult] = useState(null);
  const recognitionRef = useRef(null);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
    setInterimText('');
  }, []);

  // Speak the question when step changes
  useEffect(() => {
    if (step < 3) {
      const message = step === 0 ? `Hi, Tiva here. ${questions[step].prompt}` : questions[step].prompt;
      const timer = setTimeout(() => speak(message), 300);
      return () => {
        clearTimeout(timer);
        cancel();
        stopListening();
      };
    }
  }, [step]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
      stopListening();
    };
  }, []);

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    stopListening();
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      let transcript = '';
      let isFinal = false;
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) isFinal = true;
      }
      setInterimText(transcript);
      if (isFinal) {
        setResponses((prev) => {
          const next = [...prev];
          next[step] = transcript.trim();
          return next;
        });
        setListening(false);
        setInterimText('');
        recognitionRef.current = null;
      }
    };
    recognition.onerror = () => {
      setListening(false);
      setInterimText('');
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  const handleNext = () => {
    stopListening();
    if (step < 2) {
      setStep(step + 1);
    } else {
      analyzeAndSave();
    }
  };

  const handleBack = () => {
    stopListening();
    if (step > 0) setStep(step - 1);
  };

  const analyzeAndSave = async () => {
    setStep(3);
    const [feeling, sleep, symptoms] = responses;

    let analysis;
    try {
      analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Tiva, a warm health companion. A patient just completed a daily voice check-in. Analyze their responses and extract structured health data.

Responses:
1. How are you feeling: "${feeling}"
2. Sleep hours: "${sleep}"
3. Symptoms/pain: "${symptoms}"

Extract:
- sleep_hours: number if mentioned (null if not)
- mood_score: 1-5 based on their feeling response (5=great, 1=very poor)
- mood_label: a short label for their mood
- wellness_summary: a warm 1-2 sentence summary of their check-in
- pain_reported: boolean
- pain_description: description if pain mentioned
- risk_level: green/amber/red based on overall assessment
- recommendation: a brief, caring recommendation
- extracted_metrics: any specific vitals mentioned (heart rate, blood pressure, glucose, weight, temperature, steps) as array of {metric_type, value, unit}

Return JSON per the schema.`,
        response_json_schema: {
          type: 'object',
          properties: {
            sleep_hours: { type: 'number' },
            mood_score: { type: 'integer' },
            mood_label: { type: 'string' },
            wellness_summary: { type: 'string' },
            pain_reported: { type: 'boolean' },
            pain_description: { type: 'string' },
            risk_level: { type: 'string', enum: ['green', 'amber', 'red'] },
            recommendation: { type: 'string' },
            extracted_metrics: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  metric_type: { type: 'string' },
                  value: { type: 'number' },
                  unit: { type: 'string' }
                }
              }
            }
          }
        }
      });
    } catch (e) {
      analysis = {
        sleep_hours: null,
        mood_score: 3,
        mood_label: 'Checked In',
        wellness_summary: 'Your check-in has been recorded.',
        pain_reported: false,
        pain_description: '',
        risk_level: 'green',
        recommendation: 'Keep up with your daily health routine.',
        extracted_metrics: []
      };
    }

    // Save sleep hours as HealthReading
    if (analysis.sleep_hours) {
      await base44.entities.HealthReading.create({
        metric_type: 'sleep_hours',
        value: analysis.sleep_hours,
        unit: 'hours',
        source: 'voice',
        recorded_at: new Date().toISOString(),
        ai_interpretation: analysis.sleep_hours >= 6 ? 'Sleep duration is adequate.' : 'Sleep duration is below recommended levels.',
        risk_level: analysis.sleep_hours >= 6 ? 'green' : 'amber',
        notes: 'Daily voice check-in'
      }).catch(() => {});
    }

    // Save extracted vitals as HealthReadings
    for (const m of analysis.extracted_metrics || []) {
      await base44.entities.HealthReading.create({
        metric_type: m.metric_type,
        value: m.value,
        unit: m.unit || '',
        source: 'voice',
        recorded_at: new Date().toISOString(),
        ai_interpretation: 'Recorded during daily voice check-in.',
        risk_level: 'green',
        notes: 'Daily voice check-in'
      }).catch(() => {});
    }

    // Save wellness entry
    await base44.entities.WellnessEntry.create({
      entry_type: 'mental_check',
      mood_score: analysis.mood_score || 3,
      mood_label: analysis.mood_label || 'Checked In',
      content: `Feeling: ${feeling}\nSleep: ${sleep}\nSymptoms: ${symptoms}`,
      ai_advice: analysis.wellness_summary + (analysis.recommendation ? ` ${analysis.recommendation}` : ''),
      recorded_at: new Date().toISOString()
    }).catch(() => {});

    // Create alert if red risk
    if (analysis.risk_level === 'red' || analysis.pain_reported && analysis.risk_level === 'amber') {
      await base44.entities.Alert.create({
        type: 'health_risk',
        severity: analysis.risk_level,
        title: 'Daily check-in flagged a concern',
        description: analysis.pain_description || analysis.wellness_summary,
        trigger_source: 'user',
        status: 'active'
      }).catch(() => {});
    }

    setResult(analysis);
    setStep(4);
    if (onComplete) onComplete();
  };

  const handleClose = () => {
    cancel();
    stopListening();
    onClose();
  };

  const currentQ = questions[step];
  const canProceed = responses[step]?.trim().length > 0;
  const hasSR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} onClick={handleClose}>
      <div
        className="backdrop-blur-xl rounded-3xl border border-white/10 w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-slide-up bg-[hsl(var(--ring))]"
        onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-tiva-teal flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#0A0F0D]" />
            </div>
            <h3 className="font-heading font-bold text-lg text-navy">Daily Check-In</h3>
          </div>
          <button onClick={handleClose} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {step < 3 && currentQ &&
        <>
            {/* Progress dots */}
            <div className="flex items-center gap-2 mb-6">
              {questions.map((_, i) =>
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-tiva-teal' : i < step ? 'w-4 bg-tiva-teal/50' : 'w-4 bg-white/10'}`} />

            )}
            </div>

            {/* Question */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-tiva-teal/15 flex items-center justify-center mx-auto mb-4">
                <currentQ.icon className="w-8 h-8 text-tiva-teal" />
              </div>
              <p className="font-heading font-semibold text-base text-navy leading-relaxed">{currentQ.prompt}</p>
            </div>

            {/* Voice indicator */}
            {listening &&
          <div className="flex items-center justify-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map((i) =>
              <div
                key={i}
                className="w-1.5 rounded-full bg-tiva-teal animate-pulse-soft"
                style={{ height: `${8 + i % 3 * 6}px`, animationDelay: `${i * 100}ms` }} />

              )}
                </div>
                <span className="text-sm text-tiva-teal font-medium">Listening...</span>
              </div>
          }

            {/* Response input */}
            <div className="mb-4">
              <textarea
              value={listening ? interimText || responses[step] : responses[step]}
              onChange={(e) => {
                const val = e.target.value;
                setResponses((prev) => {
                  const next = [...prev];
                  next[step] = val;
                  return next;
                });
              }}
              placeholder={currentQ.placeholder}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-navy placeholder:text-muted-foreground/50 focus:outline-none focus:border-tiva-teal/40 resize-none"
              rows={3} />
            
            </div>

            {/* Voice button */}
            {hasSR &&
          <button
            onClick={listening ? stopListening : startListening}
            className={`w-full py-3 rounded-2xl font-heading font-semibold text-sm flex items-center justify-center gap-2 transition-all mb-4 ${
            listening ?
            'bg-destructive/15 text-destructive hover:bg-destructive/20' :
            'bg-tiva-teal/15 text-tiva-teal hover:bg-tiva-teal/25'}`
            }>
            
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {listening ? 'Stop Listening' : 'Tap to Speak'}
              </button>
          }

            {/* Navigation */}
            <div className="flex gap-3">
              {step > 0 &&
            <button onClick={handleBack} className="px-5 py-3 rounded-2xl font-heading font-semibold text-sm bg-white/5 text-muted-foreground hover:bg-white/10 transition-all">
                  Back
                </button>
            }
              <button
              onClick={handleNext}
              disabled={!canProceed}
              className="flex-1 py-3 rounded-2xl font-heading font-semibold text-sm bg-tiva-teal text-[#0A0F0D] disabled:opacity-30 hover:brightness-110 transition-all flex items-center justify-center gap-2">
              
                {step < 2 ? 'Next' : 'Finish'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        }

        {/* Analyzing */}
        {step === 3 &&
        <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 rounded-full animate-spin mb-4" style={{ borderColor: 'rgba(64,201,162,0.2)', borderTopColor: '#40C9A2' }} />
            <p className="font-heading font-semibold text-navy">Tiva is reviewing your check-in...</p>
            <p className="text-sm text-muted-foreground mt-1">Recording your responses to your health log</p>
          </div>
        }

        {/* Done */}
        {step === 4 && result &&
        <div className="animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-mint flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-mint-deep" />
              </div>
              <h3 className="font-heading font-bold text-lg text-navy mb-2">Check-In Complete!</h3>
              <p className="text-sm text-muted-foreground">Your responses have been saved to your health log.</p>
            </div>

            <div className="space-y-3 mb-6">
              {result.mood_label &&
            <div className="p-3 rounded-xl bg-white/5 flex items-center gap-3">
                  <span className="text-2xl">{['😞', '😕', '😐', '🙂', '😄'][Math.min(Math.max((result.mood_score || 3) - 1, 0), 4)]}</span>
                  <div>
                    <p className="text-xs text-muted-foreground">Mood</p>
                    <p className="text-sm font-semibold text-navy">{result.mood_label}</p>
                  </div>
                </div>
            }
              {result.sleep_hours != null &&
            <div className="p-3 rounded-xl bg-white/5 flex items-center gap-3">
                  <Moon className="w-5 h-5 text-lavender-deep" />
                  <div>
                    <p className="text-xs text-muted-foreground">Sleep</p>
                    <p className="text-sm font-semibold text-navy">{result.sleep_hours} hours</p>
                  </div>
                </div>
            }
              {result.pain_reported &&
            <div className="p-3 rounded-xl bg-amber/10 border border-amber/20 flex items-center gap-3">
                  <Activity className="w-5 h-5 text-peach-deep" />
                  <div>
                    <p className="text-xs text-muted-foreground">Symptoms</p>
                    <p className="text-sm font-semibold text-navy">{result.pain_description || 'Reported discomfort'}</p>
                  </div>
                </div>
            }
            </div>

            {result.wellness_summary &&
          <div className="p-4 rounded-2xl bg-tiva-teal/10 border border-tiva-teal/20 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="w-4 h-4 text-tiva-teal" />
                  <span className="text-xs font-heading font-semibold text-tiva-teal">Tiva's Summary</span>
                </div>
                <p className="text-sm text-navy leading-relaxed">{result.wellness_summary}</p>
                {result.recommendation && <p className="text-sm text-muted-foreground mt-2">{result.recommendation}</p>}
              </div>
          }

            <button onClick={handleClose} className="w-full py-3 rounded-2xl font-heading font-semibold text-sm bg-tiva-teal text-[#0A0F0D] hover:brightness-110 transition-all">
              Done
            </button>
          </div>
        }
      </div>
    </div>);

}