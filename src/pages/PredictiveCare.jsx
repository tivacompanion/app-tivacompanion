import { useState, useEffect } from 'react';
import { TrendingUp, Sparkles, AlertCircle, CheckCircle2, Activity, Pill, MessageCircle, RefreshCw, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/AppLayout';
import { SectionHeader, EmptyState, LoadingState, RiskBadge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import DoctorReportActions from '@/components/predictive/DoctorReportActions';

export default function PredictiveCare() {
  const [predictions, setPredictions] = useState([]);
  const [readings, setReadings] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [preds, reads, rems, convs] = await Promise.all([
      base44.entities.Prediction.list('-created_date', 20).catch(() => []),
      base44.entities.HealthReading.list('-created_date', 50).catch(() => []),
      base44.entities.Reminder.list('-created_date', 50).catch(() => []),
      base44.entities.Conversation.list('-created_date', 10).catch(() => []),
    ]);
    setPredictions(preds);
    setReadings(reads);
    setReminders(rems);
    setConversations(convs);
    setLoading(false);
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const result = await base44.functions.invoke('predictiveAnalysis', {});
      if (result.data?.success) {
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  if (loading) return <AppLayout><LoadingState label="Loading predictive insights..." /></AppLayout>;

  const latest = predictions[0];

  return (
    <AppLayout>
      <SectionHeader
        title="Predictive Care Engine"
        subtitle="AI-powered risk analysis and early detection"
        action={
          <Button onClick={generateReport} disabled={generating} className="bg-tiva-teal text-[#0A0F0D]">
            {generating ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4 mr-1" /> Generate Report</>}
          </Button>
        }
      />

      {/* Disclaimer */}
      <div className="bg-peach/30 border border-peach-deep/20 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-peach-deep flex-shrink-0 mt-0.5" />
        <p className="text-sm text-navy">
          <span className="font-semibold">Important:</span> Tiva does not diagnose diseases. The AI identifies patterns and risk indicators. Always consult a healthcare professional for clinical decisions.
        </p>
      </div>

      {predictions.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No predictions yet"
          description="Tiva needs health data to generate predictions. Log readings, take medications, and chat with Tiva — then generate your first predictive report."
          action={<Button onClick={generateReport} className="bg-tiva-teal text-[#0A0F0D]"><Sparkles className="w-4 h-4 mr-1" /> Generate First Report</Button>}
        />
      ) : (
        <>
          {/* Latest Report Hero */}
          {latest && (
            <div className="bg-card/50 backdrop-blur-md rounded-3xl p-6 border border-white/10 mb-6 animate-settle">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {latest.report_type ? (latest.report_type === 'weekly' ? 'Weekly Report' : String(latest.report_type).replace(/_/g, ' ')) : 'Health Risk Assessment'}
                  </span>
                  <h2 className="font-heading font-bold text-2xl text-navy mt-1">Health Risk Assessment</h2>
                  {(latest.period_start || latest.period_end) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {latest.period_start || ''} {latest.period_end ? `to ${latest.period_end}` : ''}
                    </p>
                  )}
                </div>
                <RiskBadge level={latest.risk_level} size="md" />
              </div>

              {/* Risk Score Gauge */}
              <div className="flex items-center gap-6 mb-6">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke={latest.risk_level === 'green' ? 'hsl(var(--mint-deep))' : latest.risk_level === 'amber' ? 'hsl(var(--peach-deep))' : 'hsl(var(--destructive))'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${(latest.risk_score || 0) * 2.64} 264`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-heading font-bold text-3xl text-navy">{latest.risk_score || 0}</span>
                    <span className="text-xs text-muted-foreground">risk score</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-navy font-medium mb-2">{latest.summary}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Activity className="w-3.5 h-3.5" />
                    {latest.metrics_analyzed?.length || 0} metrics analyzed
                  </div>
                </div>
              </div>

              {/* Detected Patterns */}
              {latest.detected_patterns?.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-heading font-semibold text-navy mb-3">Detected Patterns</h3>
                  <div className="space-y-2">
                    {latest.detected_patterns.map((pattern, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                        <TrendingUp className="w-4 h-4 text-peach-deep flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-navy">{pattern}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Factors */}
              {latest.risk_factors?.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-heading font-semibold text-navy mb-3">Risk Factors</h3>
                  <div className="space-y-2">
                    {latest.risk_factors.map((rf, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                        <RiskBadge level={rf.level || 'green'} size="sm" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-navy">{rf.factor}</p>
                          {rf.explanation && <p className="text-xs text-muted-foreground mt-1">{rf.explanation}</p>}
                          {rf.trend && (
                            <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${rf.trend === 'worsening' ? 'bg-destructive' : rf.trend === 'improving' ? 'bg-mint-deep' : 'bg-peach-deep'}`}
                                style={{ width: `${(rf.weight || 0.5) * 100}%` }}
                              />
                            </div>
                          )}
                        </div>
                        {rf.trend && (
                          <span className={`text-xs font-semibold capitalize ${rf.trend === 'worsening' ? 'text-destructive' : rf.trend === 'improving' ? 'text-mint-deep' : 'text-peach-deep'}`}>
                            {rf.trend}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Actions */}
              {latest.recommended_actions?.length > 0 && (
                <div>
                  <h3 className="font-heading font-semibold text-navy mb-3">Recommended Actions</h3>
                  <div className="space-y-2">
                    {latest.recommended_actions.map((action, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-mint/20 border border-mint-deep/20">
                        <CheckCircle2 className="w-4 h-4 text-mint-deep flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-navy">{action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Doctor Report */}
              {latest.doctor_report && (
                <div className="mt-6 p-4 rounded-xl bg-tiva-teal/8 border border-tiva-teal/20">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-tiva-teal" />
                    <h3 className="font-heading font-semibold text-navy text-sm">Report for Your Doctor</h3>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{latest.doctor_report}</p>
                  <p className="text-xs text-muted-foreground mt-3 italic">Share this summary with your healthcare professional for clinical review.</p>
                </div>
              )}

              <DoctorReportActions report={latest} />
            </div>
          )}

          {/* Analysis Sources */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { icon: Activity, label: 'Health Readings', value: readings.length, accent: 'lavender' },
              { icon: Pill, label: 'Reminders', value: reminders.length, accent: 'mint' },
              { icon: MessageCircle, label: 'AI Conversations', value: conversations.length, accent: 'peach' },
              { icon: TrendingUp, label: 'Reports Generated', value: predictions.length, accent: 'navy' },
            ].map((s) => {
              const Icon = s.icon;
              const accents = {
                lavender: 'bg-lavender text-lavender-deep',
                mint: 'bg-mint text-mint-deep',
                peach: 'bg-peach text-peach-deep',
                navy: 'bg-white/10 text-white',
              };
              return (
                <div key={s.label} className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <div className={`w-9 h-9 rounded-lg ${accents[s.accent]} flex items-center justify-center mb-2`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="font-heading font-bold text-xl text-navy">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* Previous Reports */}
          {predictions.length > 1 && (
            <div>
              <h3 className="font-heading font-semibold text-navy mb-3">Previous Reports</h3>
              <div className="space-y-2">
                {predictions.slice(1).map((p) => (
                  <div key={p.id} className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-3">
                    <RiskBadge level={p.risk_level} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-navy">{p.summary.slice(0, 100)}...</p>
                      <p className="text-xs text-muted-foreground">
                        {p.period_start} to {p.period_end} · Score: {p.risk_score}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}