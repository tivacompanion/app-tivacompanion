import { Users, Activity, Heart, CheckCircle, TrendingUp, AlertCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';

const RISK_COLORS = { green: '#40C9A2', amber: '#F5E6C8', red: '#F2C9C9' };
const ALERT_TYPE_LABELS = {
  emergency_sos: 'Emergency SOS',
  health_reading: 'Health Reading',
  inactivity: 'Inactivity',
  medication_missed: 'Medication Missed',
  fall_detected: 'Fall Detected',
  caregiver_alert: 'Caregiver Alert',
  health_risk: 'Health Risk',
};

export function ReportsCharts({ monthlyTrends = [], healthOutcomes = {}, summary = {} }) {
  const trends = Array.isArray(monthlyTrends) ? monthlyTrends : [];
  const hasTrendData = trends.some(m => m.readings > 0 || m.checkins > 0 || m.alerts > 0);

  // Pie data for risk distribution
  const riskDist = healthOutcomes?.risk_distribution || {};
  const riskData = [
    { name: 'Normal', value: riskDist.green || 0, color: RISK_COLORS.green },
    { name: 'Attention', value: riskDist.amber || 0, color: RISK_COLORS.amber },
    { name: 'Alert', value: riskDist.red || 0, color: RISK_COLORS.red },
  ].filter(d => d.value > 0);

  // Alert by type data
  const alertTypeData = Object.entries(healthOutcomes?.alert_by_type || {})
    .map(([type, count]) => ({ name: ALERT_TYPE_LABELS[type] || type.replace(/_/g, ' '), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const chartTooltipStyle = {
    background: 'rgba(15,22,20,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#fff',
  };

  return (
    <div className="space-y-6">
      {/* Monthly Trends */}
      <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
        <h3 className="font-heading font-semibold text-lg text-navy mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-tiva-teal" /> Engagement & Activity Trends (6 Months)
        </h3>
        {!hasTrendData ? (
          <p className="text-sm text-muted-foreground text-center py-8">No activity recorded yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyTrends}>
              <defs>
                <linearGradient id="colorReadings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#40C9A2" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#40C9A2" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F2C9C9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F2C9C9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCheckins" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F5E6C8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F5E6C8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="readings" name="Readings" stroke="#40C9A2" fillOpacity={1} fill="url(#colorReadings)" strokeWidth={2} />
              <Area type="monotone" dataKey="checkins" name="Check-ins" stroke="#F5E6C8" fillOpacity={1} fill="url(#colorCheckins)" strokeWidth={2} />
              <Area type="monotone" dataKey="alerts" name="Alerts" stroke="#F2C9C9" fillOpacity={1} fill="url(#colorAlerts)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blood Pressure & Heart Rate Trend */}
        <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
          <h3 className="font-heading font-semibold text-lg text-navy mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-destructive" /> Vitals Trends (6 Months)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="avg_systolic" name="Avg Systolic" stroke="#F2C9C9" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="avg_diastolic" name="Avg Diastolic" stroke="#E8A8A8" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="avg_heart_rate" name="Avg Heart Rate" stroke="#40C9A2" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution Pie */}
        <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
          <h3 className="font-heading font-semibold text-lg text-navy mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-tiva-teal" /> Patient Risk Distribution
          </h3>
          {riskData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
          ) : (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={2}>
                    {riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert Types Breakdown */}
        <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
          <h3 className="font-heading font-semibold text-lg text-navy mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-peach-deep" /> Alert Breakdown by Type
          </h3>
          {alertTypeData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No alerts recorded</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={alertTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.7)' }} width={110} />
                <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="count" fill="#F5E6C8" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Wellness Score Trend */}
        <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
          <h3 className="font-heading font-semibold text-lg text-navy mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-tiva-teal" /> Wellness Score Trend
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
              <YAxis domain={[1, 5]} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line type="monotone" dataKey="avg_wellness" name="Avg Wellness" stroke="#40C9A2" strokeWidth={2} dot={{ r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Active Patients Bar */}
      <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
        <h3 className="font-heading font-semibold text-lg text-navy mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-lavender-deep" /> Monthly Active Patients
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyTrends}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} allowDecimals={false} />
            <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Bar dataKey="active_patients" name="Active Patients" fill="#40C9A2" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}