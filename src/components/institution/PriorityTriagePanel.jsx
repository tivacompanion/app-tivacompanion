import { useNavigate } from 'react-router-dom';
import { ChevronRight, AlertTriangle, Activity } from 'lucide-react';
import { RiskBadge } from '@/components/ui/primitives';

const RISK_ORDER = { red: 0, amber: 1, green: 2 };

function VitalChip({ label, value, risk }) {
  const colors = {
    red: 'bg-destructive/15 text-red-300 border-destructive/25',
    amber: 'bg-peach text-peach-deep border-peach-deep/25',
    green: 'bg-mint text-mint-deep border-mint-deep/25',
  };
  const c = colors[risk] || colors.green;
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${c}`}>
      <span className="font-semibold">{value}</span>
      <span className="opacity-70">{label}</span>
    </div>
  );
}

function getRiskLevel(p) {
  if (p.active_alerts?.some(a => a.severity === 'red')) return 'red';
  if (p.active_alerts?.length > 0) return 'amber';
  return 'green';
}

function PatientTriageRow({ p, rank }) {
  const navigate = useNavigate();
  const risk = getRiskLevel(p);
  const bp = p.vitals?.blood_pressure;
  const hr = p.vitals?.heart_rate;

  return (
    <div className={`bg-card/50 backdrop-blur-md rounded-2xl border p-4 ${
      risk === 'red' ? 'border-destructive/30' : risk === 'amber' ? 'border-peach-deep/30' : 'border-white/10'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-heading font-bold text-sm flex-shrink-0 ${
          rank <= 3 ? 'bg-destructive/20 text-red-300' : 'bg-white/5 text-muted-foreground'
        }`}>
          {rank}
        </div>
        <div className="w-10 h-10 rounded-full bg-lavender flex items-center justify-center text-navy font-semibold flex-shrink-0">
          {p.profile?.full_name?.charAt(0)?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy truncate">{p.profile?.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {p.profile?.blood_type || 'N/A'} blood · {p.med_count} meds
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5">
          {bp && <VitalChip label="BP" value={`${bp.systolic}/${bp.diastolic}`} risk={bp.risk} />}
          {hr && <VitalChip label="BPM" value={hr.value} risk={hr.risk} />}
        </div>
        {p.active_alerts?.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">
            <AlertTriangle className="w-3 h-3" />
            {p.active_alerts.length}
          </div>
        )}
        <RiskBadge level={risk} size="sm" />
        <button
          onClick={() => navigate(`/institution/patient/${p.patient_user_id}`)}
          className="flex items-center gap-0.5 px-3 py-1.5 rounded-lg border border-tiva-teal/30 text-sm text-navy hover:bg-tiva-teal/10 transition-colors flex-shrink-0"
        >
          View <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      {(bp || hr) && (
        <div className="flex sm:hidden items-center gap-1.5 mt-2 pl-11">
          {bp && <VitalChip label="BP" value={`${bp.systolic}/${bp.diastolic}`} risk={bp.risk} />}
          {hr && <VitalChip label="BPM" value={hr.value} risk={hr.risk} />}
        </div>
      )}
      {p.active_alerts?.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/5 pl-11 space-y-1">
          {p.active_alerts.slice(0, 2).map(a => (
            <div key={a.id} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className={`w-3 h-3 mt-0.5 flex-shrink-0 ${a.severity === 'red' ? 'text-destructive' : 'text-peach-deep'}`} />
              <span>{a.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PriorityTriagePanel({ patients }) {
  const sorted = [...patients].sort((a, b) => {
    const diff = RISK_ORDER[getRiskLevel(a)] - RISK_ORDER[getRiskLevel(b)];
    if (diff !== 0) return diff;
    return (b.active_alerts?.length || 0) - (a.active_alerts?.length || 0);
  });

  const redCount = sorted.filter(p => p.active_alerts?.some(a => a.severity === 'red')).length;
  const amberCount = sorted.filter(p => {
    const hasRed = p.active_alerts?.some(a => a.severity === 'red');
    return !hasRed && p.active_alerts?.length > 0;
  }).length;
  const greenCount = sorted.length - redCount - amberCount;

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-lavender flex items-center justify-center mb-3">
          <Activity className="w-7 h-7 text-lavender-deep" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-semibold text-navy mb-1">No patients to triage</p>
        <p className="text-xs text-muted-foreground">Assign patients to caregivers to start monitoring.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/20">
          <div className="w-2 h-2 rounded-full bg-destructive" />
          <span className="text-sm font-semibold text-red-300">{redCount} Critical</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-peach border border-peach-deep/20">
          <div className="w-2 h-2 rounded-full bg-peach-deep" />
          <span className="text-sm font-semibold text-peach-deep">{amberCount} Attention</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-mint border border-mint-deep/20">
          <div className="w-2 h-2 rounded-full bg-mint-deep" />
          <span className="text-sm font-semibold text-mint-deep">{greenCount} Stable</span>
        </div>
      </div>
      <div className="space-y-2">
        {sorted.map((p, i) => (
          <PatientTriageRow key={p.profile?.id || p.patient_user_id} p={p} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}