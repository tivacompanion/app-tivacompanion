import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PredictiveInsightBanner() {
  const [prediction, setPrediction] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    base44.entities.Prediction.list('-created_date', 1)
      .then(preds => {
        if (preds.length > 0) setPrediction(preds[0]);
      })
      .catch(() => {});
  }, []);

  if (dismissed || !prediction || prediction.risk_level === 'green') return null;

  const isAmber = prediction.risk_level === 'amber';
  const bgColor = isAmber ? 'bg-peach/20 border-peach-deep/30' : 'bg-destructive/15 border-destructive/30';
  const iconColor = isAmber ? 'text-peach-deep' : 'text-destructive';

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${bgColor} mb-2`}>
      <Sparkles className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1">
        <p className="text-sm font-medium text-navy">
          {isAmber ? 'Health pattern detected' : 'Health alert'}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {prediction.summary}
        </p>
        <Link to="/predictions" className="inline-flex items-center gap-1 text-xs font-semibold text-tiva-teal mt-1.5 hover:underline">
          View report <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <button onClick={() => setDismissed(true)} className="flex-shrink-0">
        <X className="w-4 h-4 text-muted-foreground hover:text-navy" />
      </button>
    </div>
  );
}