import { useNavigate } from 'react-router-dom';
import { Activity, Heart, Pill, AlertCircle, ChevronRight, Clock } from 'lucide-react';
import { RiskBadge, EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';

function formatTimeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function VitalCard({ patient, navigate }) {
  const { profile, vitals, active_alerts } = patient;
  const bp = vitals?.blood_pressure;
  const hr = vitals?.heart_rate;
  const hasAlerts = active_alerts?.length > 0;
  const overallRisk = active_alerts?.some(a => a.severity === 'red') ? 'red'
    : hasAlerts ? 'amber'
    : bp?.risk || hr?.risk || 'green';

  return (
    <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-4 hover:border-tiva-teal/30 transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-lavender flex items-center justify-center text-navy font-semibold">
          {profile?.full_name?.charAt(0)?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy truncate">{profile?.full_name}</p>
          <p className="text-xs text-muted-foreground">{profile?.blood_type || 'N/A'} blood</p>
        </div>
        <RiskBadge level={overallRisk} size="sm" />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2.5 rounded-xl bg-white/5">
          <div className="flex items-center gap-1 mb-0.5">
            <Heart className="w-3 h-3 text-destructive" />
            <span className="text-[10px] text-muted-foreground">Blood Pressure</span>
          </div>
          {bp ? (
            <p className="text-sm font-semibold text-navy">
              {bp.systolic}/{bp.diastolic}
              <span className="text-xs text-muted-foreground ml-1">mmHg</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>
        <div className="p-2.5 rounded-xl bg-white/5">
          <div className="flex items-center gap-1 mb-0.5">
            <Activity className="w-3 h-3 text-mint-deep" />
            <span className="text-[10px] text-muted-foreground">Heart Rate</span>
          </div>
          {hr ? (
            <p className="text-sm font-semibold text-navy">
              {hr.value}<span className="text-xs text-muted-foreground ml-1">bpm</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Pill className="w-3 h-3" /> {patient.med_count} meds
          </span>
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3" /> {patient.reading_count} readings
          </span>
        </div>
        {hasAlerts && (
          <span className="flex items-center gap-1 text-destructive font-medium">
            <AlertCircle className="w-3 h-3" /> {active_alerts.length}
          </span>
        )}
      </div>

      {active_alerts?.[0] && (
        <div className="mt-2 p-2 rounded-lg bg-destructive/8 border border-destructive/15">
          <p className="text-xs text-destructive font-medium truncate">{active_alerts[0].title}</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="w-2.5 h-2.5" /> {formatTimeAgo(active_alerts[0].created_date)}
          </p>
        </div>
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={() => navigate(`/institution/patient/${patient.patient_user_id}`)}
        className="w-full mt-3 border-tiva-teal/30 h-8"
      >
        View Details <ChevronRight className="w-3.5 h-3.5 ml-1" />
      </Button>
    </div>
  );
}

export default function RemoteMonitoringPanel({ patients }) {
  const navigate = useNavigate();

  if (!patients || patients.length === 0) {
    return <EmptyState icon={Activity} title="No patients to monitor" description="Assign patients to your institution to see real-time health metrics here." />;
  }

  const sorted = [...patients].sort((a, b) => {
    const aRisk = a.active_alerts?.some(a => a.severity === 'red') ? 0 : a.active_alerts?.length > 0 ? 1 : 2;
    const bRisk = b.active_alerts?.some(a => a.severity === 'red') ? 0 : b.active_alerts?.length > 0 ? 1 : 2;
    return aRisk - bRisk;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-heading font-semibold text-navy">Real-Time Patient Monitoring</h3>
          <p className="text-xs text-muted-foreground">Live vitals & alerts — sorted by risk priority</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-mint-deep" /> Normal</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-peach-deep" /> Attention</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" /> Critical</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map(p => (
          <VitalCard key={p.profile.id} patient={p} navigate={navigate} />
        ))}
      </div>
    </div>
  );
}