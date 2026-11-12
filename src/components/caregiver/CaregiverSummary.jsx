import { Activity, Heart, Droplet, Scale, AlertCircle, Pill, ChevronRight, MessageCircle } from 'lucide-react';
import { RiskBadge } from '@/components/ui/primitives';

export default function CaregiverSummary({ patients, onSelect, onMessage }) {
  if (!patients || patients.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="font-heading font-semibold text-navy mb-3">Patient Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {patients.map((p) => {
          const v = p.vitals;
          const risk = p.latestPrediction?.risk_level || (p.activeAlerts.some(a => a.severity === 'red') ? 'red' : p.activeAlerts.length > 0 ? 'amber' : 'green');
          return (
            <div
              key={p.assignment.id}
              className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:border-tiva-teal/30 transition-all cursor-pointer"
              onClick={() => onSelect(p)}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-lavender flex items-center justify-center text-navy font-semibold">
                  {p.assignment.patient_name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">{p.assignment.patient_name}</p>
                  <p className="text-xs text-muted-foreground">{p.assignment.relationship || 'Patient'}</p>
                </div>
                <RiskBadge level={risk} />
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {v.blood_pressure ? (
                  <VitalChip icon={Heart} label="BP" value={`${v.blood_pressure.systolic}/${v.blood_pressure.diastolic || ''}`} risk={v.blood_pressure.risk} />
                ) : (
                  <VitalChip icon={Heart} label="BP" value="—" />
                )}
                {v.heart_rate ? (
                  <VitalChip icon={Activity} label="HR" value={`${v.heart_rate.value}`} risk={v.heart_rate.risk} />
                ) : (
                  <VitalChip icon={Activity} label="HR" value="—" />
                )}
                {v.glucose ? (
                  <VitalChip icon={Droplet} label="Glucose" value={`${v.glucose.value}`} risk={v.glucose.risk} />
                ) : (
                  <VitalChip icon={Droplet} label="Glucose" value="—" />
                )}
                {v.weight ? (
                  <VitalChip icon={Scale} label="Weight" value={`${v.weight.value}`} />
                ) : (
                  <VitalChip icon={Scale} label="Weight" value="—" />
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Pill className="w-3 h-3" /> {p.activeMedCount} meds
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" /> {p.totalReadings} readings
                </span>
                {p.activeAlerts.length > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertCircle className="w-3 h-3" /> {p.activeAlerts.length} alerts
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onMessage(p); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-mint/40 text-mint-deep text-xs font-semibold hover:bg-mint/60 transition-all"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Message
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onSelect(p); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-lavender text-lavender-deep text-xs font-semibold hover:bg-lavender-deep/20 transition-all"
                >
                  Details <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VitalChip({ icon: Icon, label, value, risk }) {
  const riskColor = risk === 'red' ? 'text-destructive' : risk === 'amber' ? 'text-peach-deep' : 'text-mint-deep';
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5">
      <Icon className={`w-3.5 h-3.5 ${riskColor}`} />
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className={`text-xs font-semibold ${value === '—' ? 'text-muted-foreground' : 'text-navy'}`}>{value}</p>
      </div>
    </div>
  );
}