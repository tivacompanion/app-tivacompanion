import { useState, useEffect } from 'react';
import { Activity, Plus, Mic, Heart, Droplet, Footprints, Moon, Scale, Thermometer, Zap, Sparkles } from 'lucide-react';
import WearableSyncPanel from '@/components/WearableSyncPanel';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/AppLayout';
import { SectionHeader, EmptyState, LoadingState, RiskBadge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import DailyCheckIn from '@/components/DailyCheckIn';
import { createHealthReading } from '@/utils/healthSync';

const accentClasses = {
  lavender: { bg: 'bg-lavender', text: 'text-lavender-deep' },
  mint: { bg: 'bg-mint', text: 'text-mint-deep' },
  peach: { bg: 'bg-peach', text: 'text-peach-deep' },
  navy: { bg: 'bg-tiva-teal text-[#0A0F0D]', text: 'text-white' },
};

const metricConfig = {
  blood_pressure_systolic: { label: 'Systolic BP', unit: 'mmHg', icon: Heart, accent: 'lavender', normal: [90, 120] },
  blood_pressure_diastolic: { label: 'Diastolic BP', unit: 'mmHg', icon: Heart, accent: 'lavender', normal: [60, 80] },
  glucose: { label: 'Glucose', unit: 'mg/dL', icon: Droplet, accent: 'peach', normal: [70, 110] },
  heart_rate: { label: 'Heart Rate', unit: 'bpm', icon: Activity, accent: 'mint', normal: [60, 100] },
  hrv: { label: 'HRV', unit: 'ms', icon: Zap, accent: 'mint', normal: [20, 100] },
  sleep_hours: { label: 'Sleep', unit: 'hours', icon: Moon, accent: 'navy', normal: [6, 9] },
  steps: { label: 'Steps', unit: 'steps', icon: Footprints, accent: 'mint', normal: [4000, 10000] },
  weight: { label: 'Weight', unit: 'kg', icon: Scale, accent: 'lavender', normal: [50, 90] },
  oxygen_saturation: { label: 'Oxygen', unit: '%', icon: Activity, accent: 'mint', normal: [95, 100] },
  temperature: { label: 'Temperature', unit: '°C', icon: Thermometer, accent: 'peach', normal: [36, 37.5] },
};

export default function HealthTracking() {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ metric_type: 'blood_pressure_systolic', value: '', secondary_value: '', source: 'manual', notes: '' });
  const [listening, setListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [showCheckIn, setShowCheckIn] = useState(false);

  useEffect(() => {
    loadData();
    const unsubscribe = base44.entities.HealthReading.subscribe(() => {
      loadData();
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const loadData = async () => {
    const data = await base44.entities.HealthReading.list('-created_date', 100).catch(() => []);
    setReadings(data);
    setLoading(false);
  };

  const getRiskLevel = (metric, value) => {
    const cfg = metricConfig[metric];
    if (!cfg) return 'green';
    const [min, max] = cfg.normal;
    if (value >= min && value <= max) return 'green';
    if (value < min * 0.85 || value > max * 1.15) return 'red';
    return 'amber';
  };

  const handleSubmit = async () => {
    if (!form.value) return;
    await createHealthReading({
      metric_type: form.metric_type,
      value: parseFloat(form.value),
      secondary_value: form.secondary_value ? parseFloat(form.secondary_value) : undefined,
      source: form.source,
      notes: form.notes,
    });
    setForm({ metric_type: 'blood_pressure_systolic', value: '', secondary_value: '', source: 'manual', notes: '' });
    setShowAdd(false);
    loadData();
  };

  const startVoiceLog = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
      setVoiceText(transcript);
      if (event.results[0].isFinal) {
        parseVoiceInput(transcript);
        setListening(false);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
  };

  const parseVoiceInput = async (text) => {
    // "my blood pressure is 140 over 90"
    const bpMatch = text.match(/blood pressure.*?(\d+)\s*(?:over|\/)\s*(\d+)/i);
    if (bpMatch) {
      const sys = parseInt(bpMatch[1]);
      const dia = parseInt(bpMatch[2]);
      const risk = sys > 140 || dia > 90 ? 'red' : sys > 120 || dia > 80 ? 'amber' : 'green';
      await base44.entities.HealthReading.create({
        metric_type: 'blood_pressure_systolic',
        value: sys,
        secondary_value: dia,
        unit: 'mmHg',
        source: 'voice',
        recorded_at: new Date().toISOString(),
        ai_interpretation: risk === 'green' ? 'Your blood pressure is normal.' : risk === 'amber' ? 'Your blood pressure is slightly elevated.' : 'Your blood pressure is high. Please consult your doctor.',
        risk_level: risk,
      });
      loadData();
      return;
    }
    const glucoseMatch = text.match(/glucose.*?(\d+)/i);
    if (glucoseMatch) {
      const val = parseInt(glucoseMatch[1]);
      const risk = val > 180 ? 'red' : val > 110 ? 'amber' : 'green';
      await base44.entities.HealthReading.create({
        metric_type: 'glucose',
        value: val,
        unit: 'mg/dL',
        source: 'voice',
        recorded_at: new Date().toISOString(),
        ai_interpretation: risk === 'green' ? 'Your glucose is normal.' : risk === 'amber' ? 'Your glucose is slightly elevated.' : 'Your glucose is high. Please consult your doctor.',
        risk_level: risk,
      });
      loadData();
      return;
    }
    const hrMatch = text.match(/heart rate.*?(\d+)/i);
    if (hrMatch) {
      const val = parseInt(hrMatch[1]);
      const risk = val > 120 || val < 50 ? 'red' : val > 100 || val < 60 ? 'amber' : 'green';
      await base44.entities.HealthReading.create({
        metric_type: 'heart_rate',
        value: val,
        unit: 'bpm',
        source: 'voice',
        recorded_at: new Date().toISOString(),
        ai_interpretation: risk === 'green' ? 'Your heart rate is normal.' : 'Please monitor your heart rate.',
        risk_level: risk,
      });
      loadData();
      return;
    }
  };

  const getChartData = (metric) => {
    return readings
      .filter(r => r.metric_type === metric)
      .slice(0, 14)
      .reverse()
      .map(r => ({
        date: new Date(r.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        value: r.value,
      }));
  };

  const getLatestByType = (type) => readings.find(r => r.metric_type === type);

  if (loading) return <AppLayout><LoadingState label="Loading health data..." /></AppLayout>;

  const trackedMetrics = [...new Set(readings.map(r => r.metric_type))];

  return (
    <AppLayout>
      <SectionHeader
        title="Health Tracking"
        subtitle="Monitor your vitals with manual or voice logging — or connect a wearable or Bluetooth device to sync automatically"
        action={
          <div className="flex flex-wrap gap-2 justify-end">
            <Button onClick={() => setShowCheckIn(true)} className="bg-tiva-teal text-[#0A0F0D] font-bold h-11 px-5 tiva-glow-teal">
              <Sparkles className="w-4 h-4 mr-1.5" /> Daily Check-In
            </Button>
            <Button variant="outline" onClick={startVoiceLog} className="border-tiva-teal/40">
              <Mic className={`w-4 h-4 mr-1 ${listening ? 'animate-pulse-soft text-destructive' : ''}`} />
              <span className="hidden sm:inline">{listening ? 'Listening...' : 'Voice Log'}</span>
            </Button>
            <Button variant="outline" onClick={() => setShowAdd(true)} className="border-tiva-teal/40">
              <Plus className="w-4 h-4 mr-1" /> <span className="hidden sm:inline">Add Reading</span>
            </Button>
          </div>
        }
      />

      <WearableSyncPanel onSynced={loadData} />

      {listening && (
        <div className="mb-4 bg-amber/10 border border-amber/20 rounded-2xl p-4 flex items-center gap-3">
          <Mic className="w-5 h-5 text-peach-deep animate-pulse-soft" />
          <div>
            <p className="text-sm font-medium text-peach-deep">Listening... say something like "My blood pressure is 120 over 80"</p>
            {voiceText && <p className="text-xs text-navy mt-1">Heard: "{voiceText}"</p>}
          </div>
        </div>
      )}

      {/* Latest Readings Grid */}
      {trackedMetrics.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {trackedMetrics.slice(0, 8).map((type) => {
            const cfg = metricConfig[type];
            const latest = getLatestByType(type);
            if (!cfg || !latest) return null;
            const Icon = cfg.icon;
            return (
              <div key={type} className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-9 h-9 rounded-lg ${accentClasses[cfg.accent].bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${accentClasses[cfg.accent].text}`} />
                  </div>
                  <RiskBadge level={latest.risk_level} />
                </div>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-heading font-bold text-xl text-navy">{latest.value}</span>
                  <span className="text-xs text-muted-foreground">{latest.unit}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(latest.recorded_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Charts */}
      {trackedMetrics.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {trackedMetrics.slice(0, 4).map((type) => {
            const cfg = metricConfig[type];
            if (!cfg) return null;
            const chartData = getChartData(type);
            const colors = { lavender: '#B0A8D1', mint: '#87C7A8', peach: '#E6C195', navy: '#1A1F2E' };
            return (
              <div key={type} className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-heading font-semibold text-navy">{cfg.label} Trend</h3>
                    <p className="text-xs text-muted-foreground">
                      Target: {cfg.normal[0]}–{cfg.normal[1]} {cfg.unit} · Last {chartData.length} readings
                    </p>
                  </div>
                  <div className={`w-9 h-9 rounded-lg ${accentClasses[cfg.accent].bg} flex items-center justify-center`}>
                    <cfg.icon className={`w-4 h-4 ${accentClasses[cfg.accent].text}`} />
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={colors[cfg.accent]}
                      strokeWidth={2.5}
                      dot={{ fill: colors[cfg.accent], r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Activity}
          title="No health readings yet"
          description="Log your first reading manually or use voice. Say 'My blood pressure is 120 over 80' and Tiva will interpret it for you."
          action={<Button onClick={() => setShowAdd(true)} className="bg-tiva-teal text-[#0A0F0D]"><Plus className="w-4 h-4 mr-1" /> Log your first reading</Button>}
        />
      )}

      {/* Recent Readings */}
      {readings.length > 0 && (
        <div>
          <h3 className="font-heading font-semibold text-navy mb-3">Recent Readings</h3>
          <div className="space-y-2">
            {readings.slice(0, 10).map((r) => {
              const cfg = metricConfig[r.metric_type];
              return (
                <div key={r.id} className="bg-card/50 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${accentClasses[cfg?.accent || 'lavender'].bg} flex items-center justify-center`}>
                    {cfg && <cfg.icon className={`w-4 h-4 ${accentClasses[cfg?.accent || 'lavender'].text}`} />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-navy">
                      {cfg?.label || r.metric_type}: {r.value}{r.secondary_value ? `/${r.secondary_value}` : ''} {r.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.ai_interpretation}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground capitalize">{r.source}</span>
                    <RiskBadge level={r.risk_level} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Check-In */}
      {showCheckIn && (
        <DailyCheckIn
          onClose={() => setShowCheckIn(false)}
          onComplete={loadData}
        />
      )}

      {/* Add Reading Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Health Reading</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Metric Type</Label>
              <Select value={form.metric_type} onValueChange={v => setForm({...form, metric_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(metricConfig).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Value</Label>
                <Input type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})} placeholder="0" />
              </div>
              {form.metric_type === 'blood_pressure_systolic' && (
                <div>
                  <Label>Diastolic (bottom)</Label>
                  <Input type="number" value={form.secondary_value} onChange={e => setForm({...form, secondary_value: e.target.value})} placeholder="0" />
                </div>
              )}
            </div>

            {/* Quick Presets */}
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1.5">Quick Presets</p>
              <div className="flex flex-wrap gap-1.5">
                {form.metric_type === 'blood_pressure_systolic' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, value: '120', secondary_value: '80' }))}
                      className="px-2.5 py-1 rounded-lg bg-mint/20 text-mint-deep text-xs font-semibold hover:bg-mint/30 transition-all"
                    >
                      Normal 120/80
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, value: '130', secondary_value: '85' }))}
                      className="px-2.5 py-1 rounded-lg bg-peach/20 text-peach-deep text-xs font-semibold hover:bg-peach/30 transition-all"
                    >
                      Pre-HTN 130/85
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, value: '140', secondary_value: '90' }))}
                      className="px-2.5 py-1 rounded-lg bg-destructive/15 text-destructive text-xs font-semibold hover:bg-destructive/25 transition-all"
                    >
                      Stage 1 140/90
                    </button>
                  </>
                )}
                {form.metric_type === 'glucose' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, value: '95' }))}
                      className="px-2.5 py-1 rounded-lg bg-mint/20 text-mint-deep text-xs font-semibold hover:bg-mint/30 transition-all"
                    >
                      Fasting 95
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, value: '120' }))}
                      className="px-2.5 py-1 rounded-lg bg-peach/20 text-peach-deep text-xs font-semibold hover:bg-peach/30 transition-all"
                    >
                      Pre-meal 120
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, value: '140' }))}
                      className="px-2.5 py-1 rounded-lg bg-peach/20 text-peach-deep text-xs font-semibold hover:bg-peach/30 transition-all"
                    >
                      Post-meal 140
                    </button>
                  </>
                )}
                {form.metric_type === 'heart_rate' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, value: '65' }))}
                      className="px-2.5 py-1 rounded-lg bg-mint/20 text-mint-deep text-xs font-semibold hover:bg-mint/30 transition-all"
                    >
                      Resting 65 bpm
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, value: '75' }))}
                      className="px-2.5 py-1 rounded-lg bg-mint/20 text-mint-deep text-xs font-semibold hover:bg-mint/30 transition-all"
                    >
                      Normal 75 bpm
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, value: '95' }))}
                      className="px-2.5 py-1 rounded-lg bg-peach/20 text-peach-deep text-xs font-semibold hover:bg-peach/30 transition-all"
                    >
                      Active 95 bpm
                    </button>
                  </>
                )}
                {form.metric_type === 'oxygen_saturation' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, value: '98' }))}
                      className="px-2.5 py-1 rounded-lg bg-mint/20 text-mint-deep text-xs font-semibold hover:bg-mint/30 transition-all"
                    >
                      Normal 98%
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, value: '99' }))}
                      className="px-2.5 py-1 rounded-lg bg-mint/20 text-mint-deep text-xs font-semibold hover:bg-mint/30 transition-all"
                    >
                      Optimal 99%
                    </button>
                  </>
                )}
                {form.metric_type === 'sleep_hours' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, value: '7.0' }))}
                      className="px-2.5 py-1 rounded-lg bg-mint/20 text-mint-deep text-xs font-semibold hover:bg-mint/30 transition-all"
                    >
                      7.0 hrs
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, value: '8.0' }))}
                      className="px-2.5 py-1 rounded-lg bg-mint/20 text-mint-deep text-xs font-semibold hover:bg-mint/30 transition-all"
                    >
                      8.0 hrs
                    </button>
                  </>
                )}
              </div>
            </div>
            <div>
              <Label>Source</Label>
              <Select value={form.source} onValueChange={v => setForm({...form, source: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="voice">Voice Input</SelectItem>
                  <SelectItem value="google_health">Google Health</SelectItem>
                  <SelectItem value="apple_health">Apple Health</SelectItem>
                  <SelectItem value="wearable">Wearable Device</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-tiva-teal text-[#0A0F0D]">Save Reading</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}