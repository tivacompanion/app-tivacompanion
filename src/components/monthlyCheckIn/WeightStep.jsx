import { useState } from 'react';
import { Scale, AlertCircle } from 'lucide-react';

export default function WeightStep({ value, onChange }) {
  const [unit, setUnit] = useState('kg');
  const [error, setError] = useState('');
  const [displayValue, setDisplayValue] = useState(value ? String(value) : '');

  const convertToKg = (val, fromUnit) => {
    if (fromUnit === 'lbs') return parseFloat((val / 2.20462).toFixed(1));
    return parseFloat(val);
  };

  const handleChange = (val) => {
    setDisplayValue(val);
    if (val === '') { onChange(null); setError(''); return; }
    const num = parseFloat(val);
    if (isNaN(num)) { setError('Please enter a valid number.'); return; }

    if (unit === 'kg' && (num < 20 || num > 300)) {
      setError('Weight must be between 20kg and 300kg.');
      return;
    }
    if (unit === 'lbs' && (num < 44 || num > 661)) {
      setError('Weight must be between 44 and 661 lbs.');
      return;
    }

    setError('');
    onChange(convertToKg(num, unit));
  };

  const toggleUnit = (newUnit) => {
    if (unit === newUnit) return;
    if (displayValue) {
      const num = parseFloat(displayValue);
      if (!isNaN(num)) {
        const converted = newUnit === 'kg'
          ? parseFloat((num / 2.20462).toFixed(1))
          : parseFloat((num * 2.20462).toFixed(1));
        setDisplayValue(String(converted));
        onChange(converted);
      }
    }
    setUnit(newUnit);
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-tiva-teal/15 flex items-center justify-center mx-auto mb-4">
          <Scale className="w-8 h-8 text-tiva-teal" />
        </div>
        <h2 className="font-heading font-bold text-lg text-navy mb-1">Weight</h2>
        <p className="text-sm text-muted-foreground">Step on your scale and enter your weight.</p>
      </div>

      {/* Unit toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl bg-white/5 p-1">
          <button
            onClick={() => toggleUnit('kg')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${unit === 'kg' ? 'bg-tiva-teal text-[#0A0F0D]' : 'text-muted-foreground'}`}
          >kg</button>
          <button
            onClick={() => toggleUnit('lbs')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${unit === 'lbs' ? 'bg-tiva-teal text-[#0A0F0D]' : 'text-muted-foreground'}`}
          >lbs</button>
        </div>
      </div>

      <div>
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          className="tiva-input text-center text-3xl font-bold"
          value={displayValue}
          onChange={e => handleChange(e.target.value)}
          placeholder="70.0"
          autoFocus
        />
        <p className="text-center text-xs text-muted-foreground mt-2">Enter your weight in {unit}</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}