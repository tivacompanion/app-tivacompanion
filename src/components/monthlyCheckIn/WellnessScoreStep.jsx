import { Heart } from 'lucide-react';

const OPTIONS = [
  { value: 1, label: 'Very poor', emoji: '😞' },
  { value: 2, label: 'Poor', emoji: '😕' },
  { value: 3, label: 'Okay', emoji: '😐' },
  { value: 4, label: 'Good', emoji: '🙂' },
  { value: 5, label: 'Very good', emoji: '😄' },
];

export default function WellnessScoreStep({ value, onChange }) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-tiva-teal/15 flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-tiva-teal" />
        </div>
        <h2 className="font-heading font-bold text-lg text-navy mb-1">How have you been feeling this week?</h2>
        <p className="text-sm text-muted-foreground">Tap the option that best describes your overall wellbeing.</p>
      </div>

      <div className="space-y-3">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
              value === opt.value
                ? 'border-tiva-teal bg-tiva-teal/15'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <span className="text-3xl">{opt.emoji}</span>
            <div className="flex-1 text-left">
              <p className="font-heading font-semibold text-navy">{opt.value}. {opt.label}</p>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              value === opt.value ? 'border-tiva-teal bg-tiva-teal' : 'border-white/20'
            }`}>
              {value === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-[#0A0F0D]" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}