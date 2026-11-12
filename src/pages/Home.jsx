import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageCircle, Pill, Activity, Siren, TrendingUp, Heart,
  Calendar, CheckCircle2, AlertCircle, ArrowRight, FileText, Users, Sparkles } from
'lucide-react';
import { base44 } from '@/api/base44Client';
import { ClipboardCheck } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { RiskBadge, SectionHeader, LoadingState } from '@/components/ui/primitives';
import DailyCheckIn from '@/components/DailyCheckIn';
import WelcomeGuide from '@/components/WelcomeGuide';
import MonthlyCheckIn from '@/components/MonthlyCheckIn';
import { speak } from '@/utils/tts';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [medications, setMedications] = useState([]);
  const [readings, setReadings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [greeting, setGreeting] = useState('');
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showMonthlyCheckIn, setShowMonthlyCheckIn] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');else
    if (hour < 18) setGreeting('Good afternoon');else
    setGreeting('Good evening');

    Promise.all([
    base44.entities.HealthProfile.list().then((r) => r[0]).catch(() => null),
    base44.entities.Medication.filter({ status: 'active' }, '-created_date', 10).catch(() => []),
    base44.entities.HealthReading.list('-created_date', 20).catch(() => []),
    base44.entities.Alert.filter({ status: 'active' }, '-created_date', 5).catch(() => []),
    base44.entities.Prediction.list('-created_date', 3).catch(() => []),
    base44.entities.Reminder.filter({ status: 'pending' }, 'scheduled_time', 5).catch(() => [])]
    ).then(([p, meds, reads, alts, preds, rems]) => {
      setProfile(p);
      setMedications(meds);
      setReadings(reads);
      setAlerts(alts);
      setPredictions(preds);
      setReminders(rems);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const lastCheckIn = localStorage.getItem('lastCheckInTime');
    const frequency = localStorage.getItem('checkInFrequency') || '8h';
    if (frequency === 'manual') return;
    const hoursMap = { '4h': 4, '6h': 6, '8h': 8, '12h': 12, '24h': 24 };
    const hours = hoursMap[frequency] || 8;
    const interval = hours * 60 * 60 * 1000;
    if (!lastCheckIn || Date.now() - parseInt(lastCheckIn) >= interval) {
      const timer = setTimeout(() => setShowCheckIn(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (loading || sessionStorage.getItem('tivaIntroSpoken')) return;
    sessionStorage.setItem('tivaIntroSpoken', '1');

    let status = '';
    if (alerts.length > 0) {
      status = "Your attention is needed regarding some health alerts.";
    } else if (reminders.length > 0) {
      const time = new Date(reminders[0].scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      status = `Please remember your medication scheduled for ${time}.`;
    } else if ((predictions[0]?.risk_level || 'green') === 'green') {
      status = "Your vitals are stable today.";
    } else {
      status = "You're looking active today.";
    }

    speak(`Hi, Tiva here. ${status}`);
  }, [loading]);

  const getLatestReading = (type) => readings.find((r) => r.metric_type === type);

  const bpSys = getLatestReading('blood_pressure_systolic');
  const heartRate = getLatestReading('heart_rate');
  const glucose = getLatestReading('glucose');
  const steps = getLatestReading('steps');

  const todayCompliance = reminders.length > 0 ?
  Math.round(reminders.filter((r) => r.status === 'confirmed').length / reminders.length * 100) :
  100;

  const overallRisk = predictions[0]?.risk_level || 'green';

  if (loading) return <AppLayout><LoadingState label="Loading your health dashboard..." /></AppLayout>;

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  return (
    <AppLayout>
      {/* Welcome Banner */}
      <div className="mb-6 animate-settle">
        <div className="bg-gradient-to-br from-[#0F1614] to-[#1A3F33] rounded-3xl p-6 lg:p-8 text-white relative overflow-hidden border border-white/5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-tiva-teal/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
          <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-tiva-teal/20 rounded-full translate-y-1/2 blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-tiva-teal text-sm font-medium">{greeting},</span>
            </div>
            <h1 className="font-heading font-bold text-2xl lg:text-3xl mb-2">{firstName} 👋</h1>
            <p className="text-white/70 text-sm lg:text-base max-w-lg">
              {overallRisk === 'green' && "Your health looks stable today. Heart rate is steady and medications are on track."}
              {overallRisk === 'amber' && "There are a few things that need your attention today. Check your predictions."}
              {overallRisk === 'red' && "A health alert needs your attention. Please review your alerts and contact your caregiver."}
            </p>
            <div className="flex flex-row flex-nowrap gap-3 mt-5">
              <Link
                to="/chat"
                className="flex-1 inline-flex items-center justify-center gap-2 text-[#0A0F0D] px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all duration-200 whitespace-nowrap bg-[hsl(var(--primary))]">Chat with Tiva



              </Link>
              <Link
                to="/emergency"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-destructive/20 text-white border border-destructive/40 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-destructive transition-all duration-200 whitespace-nowrap">
                
                <Siren className="w-4 h-4 flex-shrink-0" />
                Emergency
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Health Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-1 bg-card/50 backdrop-blur-md rounded-2xl p-6 border border-white/10 animate-settle">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-navy">Health Status</h3>
            <RiskBadge level={overallRisk} size="md" />
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={overallRisk === 'green' ? 'hsl(var(--mint-deep))' : overallRisk === 'amber' ? 'hsl(var(--peach-deep))' : 'hsl(var(--destructive))'}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${overallRisk === 'green' ? 264 : overallRisk === 'amber' ? 180 : 90} 264`} />
                
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-heading font-bold text-2xl text-navy">{todayCompliance}%</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Today's Compliance</p>
              <p className="text-sm font-medium text-navy mb-2">
                {todayCompliance === 100 ? 'Perfect day so far!' : `${todayCompliance}% of tasks done`}
              </p>
              <Link to="/predictions" className="text-xs font-semibold text-lavender-deep hover:underline flex items-center gap-1">
                View full report <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
          { icon: Heart, label: 'Heart Rate', value: heartRate?.value || '--', unit: 'bpm', accent: 'mint', trend: heartRate?.risk_level === 'green' ? 'Stable' : 'Check' },
          { icon: Activity, label: 'Blood Pressure', value: bpSys ? `${bpSys.value}/${bpSys.secondary_value || '--'}` : '--/--', unit: 'mmHg', accent: 'lavender' },
          { icon: TrendingUp, label: 'Glucose', value: glucose?.value || '--', unit: 'mg/dL', accent: 'peach' },
          { icon: CheckCircle2, label: 'Steps Today', value: steps?.value || '0', unit: '', accent: 'navy' }].
          map((card) => {
            const Icon = card.icon;
            const accents = {
              mint: 'bg-mint text-mint-deep',
              lavender: 'bg-lavender text-lavender-deep',
              peach: 'bg-peach text-peach-deep',
              navy: 'bg-tiva-teal text-[#0A0F0D]'
            };
            return (
              <div key={card.label} className="bg-card/50 backdrop-blur-md rounded-2xl p-3 border border-white/10 transition-all duration-300 hover:-translate-y-0.5">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${accents[card.accent]}`}>
                    <Icon className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground truncate">{card.label}</span>
                  {card.trend && <span className="text-[10px] text-muted-foreground ml-auto">{card.trend}</span>}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-heading font-bold text-xl text-navy">{card.value}</span>
                  {card.unit && <span className="text-[11px] text-muted-foreground">{card.unit}</span>}
                </div>
              </div>);

          })}
        </div>
      </div>

      {/* Monthly Health Check-in CTA */}
      <button
        onClick={() => setShowMonthlyCheckIn(true)}
        className="group block w-full mb-6 rounded-3xl p-5 lg:p-6 bg-gradient-to-br from-[#0F2A22] to-[#1A3F33] border border-tiva-teal/30 hover:border-tiva-teal/50 transition-all duration-300 hover:-translate-y-0.5 animate-settle text-left">
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-tiva-teal flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <ClipboardCheck className="w-6 h-6 text-[#0A0F0D]" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-bold text-lg text-navy">Monthly Health Check-in</h3>
            <p className="text-sm text-white/60">Record your vitals — blood pressure, weight, heart rate & wellness</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-tiva-teal/20 flex items-center justify-center group-hover:bg-tiva-teal/30 transition-all">
            <ArrowRight className="w-4 h-4 text-tiva-teal group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </button>

      {/* Predictive Health CTA */}
      <Link
        to="/predictions"
        className="group block mb-6 rounded-3xl p-5 lg:p-6 bg-gradient-to-br from-[#1A3F33] to-[#0F2A22] border border-tiva-teal/30 hover:border-tiva-teal/50 transition-all duration-300 hover:-translate-y-0.5 animate-settle">
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-tiva-teal flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Sparkles className="w-6 h-6 text-[#0A0F0D]" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-bold text-lg text-navy">Predictive Health Insights</h3>
            <p className="text-sm text-white/60">See your AI risk assessment, trends & early warning signs</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-tiva-teal/20 flex items-center justify-center group-hover:bg-tiva-teal/30 transition-all">
            <ArrowRight className="w-4 h-4 text-tiva-teal group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
        { icon: MessageCircle, label: 'Ask Tiva', desc: 'Voice or text', path: '/chat', accent: 'lavender' },
        { icon: Pill, label: 'Medications', desc: `${medications.length} active`, path: '/medications', accent: 'mint' },
        { icon: FileText, label: 'Medical Vault', desc: 'Documents', path: '/vault', accent: 'peach' },
        { icon: Users, label: 'Family', desc: 'Stay connected', path: '/family', accent: 'navy' }].
        map((action) => {
          const Icon = action.icon;
          const accents = {
            lavender: 'bg-lavender text-lavender-deep',
            mint: 'bg-mint text-mint-deep',
            peach: 'bg-peach text-peach-deep',
            navy: 'bg-tiva-teal text-[#0A0F0D]'
          };
          return (
            <Link
              key={action.path}
              to={action.path}
              className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:-translate-y-0.5 transition-all duration-300 group">
              
              <div className={`w-11 h-11 rounded-xl ${accents[action.accent]} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" strokeWidth={2} />
              </div>
              <p className="font-heading font-semibold text-sm text-navy">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.desc}</p>
            </Link>);

        })}
      </div>

      {/* Two Column: Reminders + AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Reminders */}
        <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
          <SectionHeader
            title="Today's Reminders"
            subtitle="Medications and appointments"
            action={<Link to="/medications" className="text-xs font-semibold text-lavender-deep hover:underline">View all</Link>} />
          
          {reminders.length === 0 ?
          <div className="py-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-mint-deep mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All caught up! No pending reminders.</p>
            </div> :

          <div className="space-y-2">
              {reminders.slice(0, 4).map((r) =>
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              r.type === 'medication' ? 'bg-mint' : r.type === 'appointment' ? 'bg-lavender' : 'bg-peach'}`
              }>
                    {r.type === 'medication' ? <Pill className="w-4 h-4 text-mint-deep" /> :
                r.type === 'appointment' ? <Calendar className="w-4 h-4 text-lavender-deep" /> :
                <Heart className="w-4 h-4 text-peach-deep" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              r.status === 'pending' ? 'bg-peach text-peach-deep' :
              r.status === 'confirmed' ? 'bg-mint text-mint-deep' : 'bg-muted text-muted-foreground'}`
              }>
                    {r.status}
                  </span>
                </div>
            )}
            </div>
          }
        </div>

        {/* AI Insights / Predictions */}
        <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
          <SectionHeader
            title="AI Health Insights"
            subtitle="Predictive analysis & recommendations"
            action={<Link to="/predictions" className="text-xs font-semibold text-lavender-deep hover:underline">Full report</Link>} />
          
          {predictions.length === 0 ?
          <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-lavender flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-lavender-deep" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">No predictions yet. Tiva needs a few days of data.</p>
              <Link to="/health" className="text-xs font-semibold text-lavender-deep hover:underline">Log your first reading</Link>
            </div> :

          <div className="space-y-3">
              {predictions.slice(0, 3).map((p) =>
            <div key={p.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {p.report_type.replace(/_/g, ' ')}
                    </span>
                    <RiskBadge level={p.risk_level} />
                  </div>
                  <p className="text-sm text-navy font-medium mb-2">{p.summary}</p>
                  {p.recommended_actions?.length > 0 &&
              <div className="flex items-start gap-2 mt-2">
                      <AlertCircle className="w-3.5 h-3.5 text-peach-deep mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">{p.recommended_actions[0]}</p>
                    </div>
              }
                </div>
            )}
            </div>
          }
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 &&
      <div className="mt-6 bg-destructive/5 border border-destructive/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Siren className="w-5 h-5 text-destructive" />
            <h3 className="font-heading font-semibold text-destructive">Active Alerts ({alerts.length})</h3>
          </div>
          <div className="space-y-2">
            {alerts.map((a) =>
          <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-card/50 backdrop-blur-md border border-destructive/20">
                <div>
                  <p className="text-sm font-medium text-navy">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
                <Link to="/emergency" className="text-xs font-semibold text-destructive hover:underline">Review</Link>
              </div>
          )}
          </div>
        </div>
      }

      {showCheckIn &&
      <DailyCheckIn
        onClose={() => {
          localStorage.setItem('lastCheckInTime', Date.now().toString());
          setShowCheckIn(false);
        }} />

      }

      {showMonthlyCheckIn &&
      <MonthlyCheckIn onClose={() => setShowMonthlyCheckIn(false)} />
      }

      <WelcomeGuide />
    </AppLayout>);

}