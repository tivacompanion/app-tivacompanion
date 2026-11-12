import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ScrollText, AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import { LoadingState, EmptyState } from '@/components/ui/primitives';

export default function ActivityLogPanel({ institutionId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('institutionPortal', { action: 'get_activity_log' });
      setLogs(res.data?.logs || []);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, [institutionId]);

  const severityConfig = {
    info: { icon: Info, color: 'text-muted-foreground', bg: 'bg-white/5', label: 'Info' },
    warning: { icon: AlertTriangle, color: 'text-peach-deep', bg: 'bg-peach/30', label: 'Warning' },
    critical: { icon: ShieldAlert, color: 'text-destructive', bg: 'bg-destructive/15', label: 'Critical' },
  };

  const actionLabels = {
    ASSIGN_PATIENT: 'Patient Assigned',
    REASSIGN_PATIENT: 'Patient Reassigned',
    DISCONNECT_CAREGIVER: 'Caregiver Disconnected',
    REMOVE_ASSIGNMENT: 'Assignment Removed',
    BULK_ASSIGN: 'Bulk Assignment',
    BULK_REMOVE: 'Bulk Removal',
    DELETE_CAREGIVER_ACCOUNT: 'Account Deleted',
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-5">
      <div className="flex items-center gap-2 mb-4">
        <ScrollText className="w-5 h-5 text-tiva-teal" />
        <h3 className="font-heading font-semibold text-navy">Activity Log</h3>
        <span className="text-xs text-muted-foreground ml-auto">{logs.length} {logs.length === 1 ? 'entry' : 'entries'}</span>
      </div>

      {loading ? (
        <LoadingState label="Loading activity log..." />
      ) : logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="No activity yet" description="Bulk operations, patient assignments, and caregiver changes will appear here for auditing." />
      ) : (
        <div className="space-y-1 max-h-[500px] overflow-y-auto scrollbar-thin">
          {logs.map((log) => {
            const config = severityConfig[log.severity] || severityConfig.info;
            const Icon = config.icon;
            return (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-navy">{actionLabels[log.action] || log.action}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${config.bg} ${config.color}`}>{config.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-muted-foreground/70">{log.actor_name}</span>
                    <span className="text-[11px] text-muted-foreground/50">·</span>
                    <span className="text-[11px] text-muted-foreground/70">{formatTime(log.created_date)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}