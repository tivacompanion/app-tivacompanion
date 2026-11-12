import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Brain, Loader2, ChevronDown, Lightbulb, Zap, CalendarCheck } from 'lucide-react';

const URGENCY_CONFIG = {
  immediate: { icon: Zap, label: 'Immediate action', color: 'text-destructive', bg: 'bg-destructive/10' },
  within_24h: { icon: Brain, label: 'Within 24 hours', color: 'text-peach-deep', bg: 'bg-peach/10' },
  next_visit: { icon: CalendarCheck, label: 'At next visit', color: 'text-mint-deep', bg: 'bg-mint/15' },
};

export default function AlertExplanation({ alert }) {
  const [expanded, setExpanded] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchExplanation = async () => {
    setLoading(true);
    setError(null);
    setExpanded(true);
    try {
      const res = await base44.functions.invoke('caregiverPortal', {
        action: 'get_alert_explanation',
        alert_id: alert.id,
      });
      setExplanation(res.data?.explanation || null);
    } catch (e) {
      setError('Could not generate explanation. Try again later.');
    }
    setLoading(false);
  };

  const toggle = () => {
    if (!expanded && !explanation && !loading) {
      fetchExplanation();
    } else {
      setExpanded(!expanded);
    }
  };

  const urgencyCfg = explanation?.urgency ? URGENCY_CONFIG[explanation.urgency] || URGENCY_CONFIG.within_24h : null;
  const UrgencyIcon = urgencyCfg?.icon;

  return (
    <div className="mt-2">
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 text-xs font-medium text-tiva-teal hover:text-navy transition-colors"
      >
        <Brain className="w-3.5 h-3.5" />
        {loading ? 'Analyzing alert...' : explanation ? 'AI Alert Analysis' : 'Explain this alert'}
        <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-2 p-3 rounded-xl bg-tiva-teal/5 border border-tiva-teal/15 animate-fade-in">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing patient data, recent readings, and medication context...
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {explanation && !loading && (
            <div className="space-y-3">
              {urgencyCfg && (
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${urgencyCfg.bg} ${urgencyCfg.color}`}>
                  <UrgencyIcon className="w-3 h-3" />
                  {urgencyCfg.label}
                </div>
              )}

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-tiva-teal mb-1">Why this triggered</p>
                <p className="text-sm text-navy leading-relaxed">{explanation.reasoning}</p>
              </div>

              {explanation.recommended_actions?.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-tiva-teal mb-1.5 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" /> Recommended next steps
                  </p>
                  <ul className="space-y-1">
                    {explanation.recommended_actions.map((action, i) => (
                      <li key={i} className="text-sm text-navy flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-tiva-teal mt-1.5 flex-shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}