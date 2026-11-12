import { Activity, Clock, Calendar, Pill, TrendingUp, Stethoscope } from 'lucide-react';
import { RiskBadge } from '@/components/ui/primitives';

function formatRelative(dateStr) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) {
      const mins = Math.floor(diff / (1000 * 60));
      return mins <= 1 ? 'Just now' : `${mins}m ago`;
    }
    return `${hours}h ago`;
  }
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

function getStatusColor(daysSinceActivity) {
  if (daysSinceActivity === null) return 'text-muted-foreground';
  if (daysSinceActivity <= 1) return 'text-mint-deep';
  if (daysSinceActivity <= 3) return 'text-peach-deep';
  return 'text-destructive';
}

export default function RemoteStatusBanner({ remoteStatus }) {
  if (!remoteStatus) return null;

  const {
    last_activity_date,
    days_since_activity,
    last_reading,
    last_checkin,
    latest_risk_level,
    latest_prediction_summary,
    med_adherence_rate,
    next_checkin_date,
    checkin_enabled,
  } = remoteStatus;

  const statusColor = getStatusColor(days_since_activity);

  return (
    <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-tiva-teal/20 p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-tiva-teal/15 flex items-center justify-center">
          <Stethoscope className="w-4 h-4 text-tiva-teal" />
        </div>
        <h3 className="font-heading font-semibold text-navy">Remote Patient Status</h3>
        <div className="ml-auto">
          <RiskBadge level={latest_risk_level} size="md" />
        </div>
      </div>

      {/* Last Activity Banner */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-4">
        <Clock className={`w-5 h-5 ${statusColor}`} />
        <div className="flex-1">
          <p className="text-sm font-medium text-navy">
            Last activity: <span className={statusColor}>{formatRelative(last_activity_date)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {days_since_activity === null
              ? 'No readings or check-ins recorded yet'
              : days_since_activity === 0
                ? 'Patient has been active today'
                : `${days_since_activity} day(s) since last activity`}
          </p>
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Last Reading */}
        <div className="p-3 rounded-xl bg-white/5">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-lavender-deep" />
            <span className="text-xs text-muted-foreground">Last Reading</span>
          </div>
          {last_reading ? (
            <>
              <p className="text-sm font-semibold text-navy capitalize">
                {last_reading.metric_type.replace(/_/g, ' ')}: {last_reading.value}{last_reading.unit ? ` ${last_reading.unit}` : ''}
              </p>
              <p className="text-xs text-muted-foreground">{formatRelative(last_reading.recorded_at)}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No readings</p>
          )}
        </div>

        {/* Last Check-in */}
        <div className="p-3 rounded-xl bg-white/5">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-mint-deep" />
            <span className="text-xs text-muted-foreground">Last Check-in</span>
          </div>
          {last_checkin ? (
            <>
              <p className="text-sm font-semibold text-navy">
                BP: {last_checkin.systolic_bp}/{last_checkin.diastolic_bp}
              </p>
              <p className="text-xs text-muted-foreground">
                Wellness: {last_checkin.wellness_score}/5 · {formatRelative(last_checkin.submitted_at)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No check-ins</p>
          )}
        </div>

        {/* Med Adherence */}
        <div className="p-3 rounded-xl bg-white/5">
          <div className="flex items-center gap-1.5 mb-1">
            <Pill className="w-3.5 h-3.5 text-peach-deep" />
            <span className="text-xs text-muted-foreground">Med Adherence</span>
          </div>
          {med_adherence_rate !== null ? (
            <>
              <p className={`text-sm font-semibold ${med_adherence_rate >= 80 ? 'text-mint-deep' : med_adherence_rate >= 50 ? 'text-peach-deep' : 'text-destructive'}`}>
                {med_adherence_rate}%
              </p>
              <p className="text-xs text-muted-foreground">Recent logs</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No data</p>
          )}
        </div>

        {/* Next Check-in */}
        <div className="p-3 rounded-xl bg-white/5">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-tiva-teal" />
            <span className="text-xs text-muted-foreground">Next Check-in</span>
          </div>
          {checkin_enabled && next_checkin_date ? (
            <>
              <p className="text-sm font-semibold text-navy">
                {new Date(next_checkin_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{checkin_enabled ? 'Not set' : 'Disabled'}</p>
          )}
        </div>
      </div>

      {/* AI Prediction Summary */}
      {latest_prediction_summary && (
        <div className="mt-4 p-3 rounded-xl bg-tiva-teal/8 border border-tiva-teal/15">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-tiva-teal flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-tiva-teal mb-0.5">AI Risk Assessment</p>
              <p className="text-xs text-muted-foreground">{latest_prediction_summary}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}