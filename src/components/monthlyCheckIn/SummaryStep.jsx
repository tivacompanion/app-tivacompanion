import { Activity, Scale, Heart, Smile, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function SummaryStep({ data, submitting, critical }) {
  const items = [
    { icon: Activity, label: 'Blood Pressure', value: `${data.systolic_bp}/${data.diastolic_bp}`, unit: 'mmHg' },
    { icon: Scale, label: 'Weight', value: data.weight_kg, unit: 'kg' },
    { icon: Heart, label: 'Heart Rate', value: data.heart_rate, unit: 'bpm' },
    { icon: Smile, label: 'Wellness Score', value: `${data.wellness_score}/5`, unit: '' },
  ];

  const methodLabel = {
    'camera-high': 'Camera (high confidence)',
    'camera-medium': 'Camera (medium confidence)',
    'manual': 'Manual entry',
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-tiva-teal/15 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-tiva-teal" />
        </div>
        <h2 className="font-heading font-bold text-lg text-navy mb-1">Review your check-in</h2>
        <p className="text-sm text-muted-foreground">Confirm everything looks correct before saving.</p>
      </div>

      {critical && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          Your blood pressure reading is critical. Your care team will be notified immediately.
        </div>
      )}

      <div className="space-y-3">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-lavender flex items-center justify-center">
                <Icon className="w-5 h-5 text-lavender-deep" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-base font-semibold text-navy">
                  {item.value} {item.unit && <span className="text-sm text-muted-foreground">{item.unit}</span>}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
        <p className="text-xs text-muted-foreground">Heart rate capture method</p>
        <p className="text-sm font-medium text-navy">{methodLabel[data.heart_rate_capture_method]}</p>
      </div>

      {submitting && (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(64,201,162,0.2)', borderTopColor: '#40C9A2' }} />
          <p className="text-sm text-muted-foreground">Saving your check-in...</p>
        </div>
      )}
    </div>
  );
}