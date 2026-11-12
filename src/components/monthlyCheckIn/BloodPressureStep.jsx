import { useState } from 'react';
import { Heart, AlertCircle } from 'lucide-react';

export default function BloodPressureStep({ value, onChange }) {
  const [error, setError] = useState('');

  const validate = (sys, dia) => {
    if (sys && (sys < 60 || sys > 250)) return 'Systolic must be between 60 and 250.';
    if (dia && (dia < 40 || dia > 150)) return 'Diastolic must be between 40 and 150.';
    return '';
  };

  const handleChange = (field, val) => {
    const num = val === '' ? '' : parseInt(val, 10);
    const next = { ...value, [field]: num };
    setError(validate(next.systolic, next.diastolic));
    onChange(next);
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-tiva-teal/15 flex items-center justify-center mx-auto mb-4">
          <Heart className="w-8 h-8 text-tiva-teal" />
        </div>
        <h2 className="font-heading font-bold text-lg text-navy mb-1">Blood Pressure</h2>
        <p className="text-sm text-muted-foreground">Enter your reading from your blood pressure cuff.</p>
      </div>

      {/* Visual guide */}
      <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-white/5">
        <div className="relative w-20 h-12 rounded-lg border-2 border-white/20 flex items-center justify-center">
          <div className="absolute top-1 left-2 text-[9px] text-muted-foreground">SYS</div>
          <span className="text-sm font-bold text-tiva-teal">{value.systolic || '---'}</span>
          <div className="absolute bottom-1 left-2 text-[9px] text-muted-foreground">DIA</div>
          <span className="absolute bottom-1 right-2 text-xs font-bold text-peach-deep">{value.diastolic || '--'}</span>
        </div>
        <p className="text-xs text-muted-foreground max-w-[140px]">
          The top number is systolic, the bottom is diastolic — shown on your cuff screen.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Systolic (top)</label>
          <input
            type="number"
            inputMode="numeric"
            className="tiva-input mt-1.5 text-center text-xl font-bold"
            value={value.systolic || ''}
            onChange={e => handleChange('systolic', e.target.value)}
            placeholder="120"
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Diastolic (bottom)</label>
          <input
            type="number"
            inputMode="numeric"
            className="tiva-input mt-1.5 text-center text-xl font-bold"
            value={value.diastolic || ''}
            onChange={e => handleChange('diastolic', e.target.value)}
            placeholder="80"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {value.systolic && value.diastolic && !error && (value.systolic > 180 || value.diastolic > 120) && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          This reading is very high. Tiva will alert your care team immediately after you confirm.
        </div>
      )}
    </div>
  );
}