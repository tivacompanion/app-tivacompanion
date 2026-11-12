import { useState } from 'react';
import {
  Sparkles, MessageCircle, Pill, Activity, FileText, Siren, TrendingUp,
  Stethoscope, ArrowRight, X, CheckCircle2
} from 'lucide-react';

const STORAGE_KEY = 'tivaWelcomeGuideSeen';

const STEPS = [
  {
    icon: Sparkles,
    title: 'Welcome to Tiva',
    body: 'Tiva is your personal health companion — helping you track vitals, manage medications, understand your health trends, and stay connected to your care circle.',
    accent: 'bg-tiva-teal text-[#0A0F0D]',
  },
  {
    icon: MessageCircle,
    title: 'AI Health Companion',
    body: 'Chat or speak with Tiva anytime. Ask about symptoms, get reminders interpreted, or just check in on how you\'re feeling — by voice or text.',
    accent: 'bg-lavender text-lavender-deep',
  },
  {
    icon: Pill,
    title: 'Medication Reminders',
    body: 'Never miss a dose. Tiva reminds you to take medications, tracks adherence, and can escalate to family or caregivers if a dose is missed.',
    accent: 'bg-mint text-mint-deep',
  },
  {
    icon: Activity,
    title: 'Health Tracking',
    body: 'Log blood pressure, glucose, heart rate and more — by voice, manually, or from your wearable. Tiva interprets every reading for you.',
    accent: 'bg-peach text-peach-deep',
  },
  {
    icon: FileText,
    title: 'Medical Vault',
    body: 'Keep prescriptions, lab results and reports in one secure place. Tiva summarizes them in plain language and flags anything important.',
    accent: 'bg-lavender text-lavender-deep',
  },
  {
    icon: TrendingUp,
    title: 'Predictive Care',
    body: 'Tiva analyzes your trends to spot early warning signs and gives you a clear, plain-language risk assessment with recommended actions.',
    accent: 'bg-mint text-mint-deep',
  },
  {
    icon: Siren,
    title: 'Emergency SOS',
    body: 'One tap — or just say "Tiva help emergency" — instantly alerts your emergency contacts and shares your location. Cancel within 10 seconds if it was accidental.',
    accent: 'bg-destructive/20 text-destructive',
  },
];

export default function WelcomeGuide() {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(() => !localStorage.getItem(STORAGE_KEY));

  if (!open) return null;

  const isLast = step === STEPS.length - 1;
  const isDisclaimer = step === STEPS.length;
  const current = STEPS[step];

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  const skip = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  const next = () => {
    if (isLast) setStep(STEPS.length); // go to disclaimer
    else setStep(s => s + 1);
  };

  const back = () => setStep(s => Math.max(0, s - 1));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={skip} />
      <div className="relative w-full max-w-md tiva-card p-6 lg:p-8 animate-settle">
        <button
          onClick={skip}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {!isDisclaimer ? (
          <>
            <div className={`w-16 h-16 rounded-2xl ${current.accent} flex items-center justify-center mb-5`}>
              <current.icon className="w-8 h-8" strokeWidth={1.8} />
            </div>
            <h2 className="font-heading font-bold text-xl text-navy mb-2">{current.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{current.body}</p>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5 mb-6">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-tiva-teal' : 'w-1.5 bg-white/15'}`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={skip}
                className="text-sm font-medium text-muted-foreground hover:text-navy transition-all"
              >
                Skip tour
              </button>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    onClick={back}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-navy transition-all"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={next}
                  className="tiva-mint-btn flex items-center gap-2 px-5 py-2.5 text-sm"
                >
                  {isLast ? 'Almost done' : 'Next'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-tiva-teal/15 border border-tiva-teal/30 flex items-center justify-center mb-5">
              <Stethoscope className="w-8 h-8 text-tiva-teal" strokeWidth={1.8} />
            </div>
            <h2 className="font-heading font-bold text-xl text-navy mb-3">A quick note from Tiva</h2>
            <div className="space-y-3 mb-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Tiva is here to support your health journey — but it is <span className="text-navy font-semibold">not a replacement for your doctor</span> or professional medical care.
              </p>
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-peach/10 border border-peach/20">
                <CheckCircle2 className="w-4 h-4 text-peach-deep mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Always consult a qualified healthcare professional for diagnosis, treatment, or urgent medical concerns. Tiva helps you stay informed and organized — your doctor makes the medical decisions.
                </p>
              </div>
            </div>
            <button
              onClick={finish}
              className="tiva-mint-btn w-full flex items-center justify-center gap-2 px-5 py-3 text-sm"
            >
              <Sparkles className="w-4 h-4" /> Got it, let's start
            </button>
          </>
        )}
      </div>
    </div>
  );
}