import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, Droplet, HeartPulse, Footprints, Moon, Weight } from 'lucide-react';

const metricConfig = {
  heart_rate: { label: 'Heart Rate', color: '#40C9A2', icon: HeartPulse, unit: 'bpm' },
  blood_pressure_systolic: { label: 'Systolic BP', color: '#F9844A', icon: Activity, unit: 'mmHg' },
  blood_pressure_diastolic: { label: 'Diastolic BP', color: '#F86624', icon: Activity, unit: 'mmHg' },
  glucose: { label: 'Glucose', color: '#A78BFA', icon: Droplet, unit: 'mg/dL' },
  steps: { label: 'Steps', color: '#60D394', icon: Footprints, unit: '' },
  sleep_hours: { label: 'Sleep', color: '#818CF8', icon: Moon, unit: 'hrs' },
  weight: { label: 'Weight', color: '#F472B6', icon: Weight, unit: 'kg' },
  oxygen_saturation: { label: 'SpO₂', color: '#38BDF8', icon: Activity, unit: '%' },
};

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function CustomTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/90 backdrop-blur-md rounded-xl border border-white/20 px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color || p.stroke }}>
          {p.name}: {p.value}{unit ? ` ${unit}` : ''}
        </p>
      ))}
    </div>
  );
}

function TrendCard({ metricKey, data }) {
  const cfg = metricConfig[metricKey];
  if (!cfg) return null;
  const Icon = cfg.icon;
  const sorted = [...data].sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
  const chartData = sorted.map(r => ({
    date: formatDate(r.recorded_at),
    value: r.value,
    secondary: r.secondary_value,
  }));
  const latest = sorted[sorted.length - 1];
  const hasSecondary = metricKey === 'blood_pressure_systolic' && sorted.some(r => r.secondary_value != null);

  return (
    <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cfg.color}20` }}>
            <Icon className="w-4 h-4" style={{ color: cfg.color }} />
          </div>
          <span className="text-sm font-heading font-semibold text-navy">{cfg.label}</span>
        </div>
        {latest && (
          <span className="text-sm font-heading font-bold" style={{ color: cfg.color }}>
            {latest.value}{cfg.unit ? ` ${cfg.unit}` : ''}
          </span>
        )}
      </div>
      {chartData.length >= 2 ? (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
            <Tooltip content={<CustomTooltip unit={cfg.unit} />} />
            <Line type="monotone" dataKey="value" stroke={cfg.color} strokeWidth={2.5} dot={{ fill: cfg.color, r: 3 }} activeDot={{ r: 5 }} name={cfg.label} />
            {hasSecondary && (
              <Line type="monotone" dataKey="secondary" stroke="#F86624" strokeWidth={2} dot={{ fill: '#F86624', r: 2 }} name="Diastolic" />
            )}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[120px] flex items-center justify-center">
          <p className="text-xs text-muted-foreground">Not enough data for trend</p>
        </div>
      )}
    </div>
  );
}

export default function PatientTrendCharts({ readings }) {
  if (!readings || readings.length === 0) return null;

  // Group by metric type
  const grouped = {};
  readings.forEach(r => {
    if (!grouped[r.metric_type]) grouped[r.metric_type] = [];
    grouped[r.metric_type].push(r);
  });

  // Prioritize key metrics, then include any others with enough data
  const priority = ['heart_rate', 'blood_pressure_systolic', 'glucose', 'steps', 'sleep_hours', 'oxygen_saturation', 'weight'];
  const available = Object.keys(grouped);
  const ordered = [
    ...priority.filter(k => available.includes(k)),
    ...available.filter(k => !priority.includes(k) && metricConfig[k]),
  ].slice(0, 6);

  if (ordered.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4 text-tiva-teal" /> Health Metric Trends
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ordered.map(key => (
          <TrendCard key={key} metricKey={key} data={grouped[key]} />
        ))}
      </div>
    </div>
  );
}