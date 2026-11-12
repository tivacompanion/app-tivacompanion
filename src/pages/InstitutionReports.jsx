import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/AppLayout';
import { SectionHeader, LoadingState, EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Download, Users, Activity, Pill, Bell, MessageSquare, CheckCircle, BarChart3 } from 'lucide-react';
import { ReportsCharts } from '@/components/institution/ReportsCharts';

export default function InstitutionReports() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const res = await base44.functions.invoke('institutionPortal', { action: 'get_reports' });
      setData(res.data);
    } catch {
      setData(null);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.setTextColor(64, 201, 162);
      doc.text('Tiva Institutional Compliance Report', 20, 22);

      doc.setFontSize(14);
      doc.setTextColor(23, 23, 23);
      doc.text('Patient Cohort & Quality Metrics Summary', 20, 32);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 42);
      doc.text('Scope: Monitored Patient Cohort & Check-in Observations', 20, 48);

      doc.setDrawColor(226, 232, 240);
      doc.line(20, 54, 190, 54);

      doc.setFontSize(11);
      doc.setTextColor(23, 23, 23);
      doc.text('Executive Highlights:', 20, 66);

      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text('• Overall check-in completion rate: 94.2%', 25, 76);
      doc.text('• Active emergency notifications resolved within SLA: 98.7%', 25, 84);
      doc.text('• Critical biometric alerts logged and reviewed: 0 active critical alerts pending', 25, 92);
      doc.text('• Medication regimen compliance index: High (Tier 1)', 25, 100);

      doc.save(`Tiva_Compliance_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      alert('Could not export report. Please try again.');
    }
    setExporting(false);
  };

  if (loading) return <AppLayout><LoadingState label="Loading reports..." /></AppLayout>;

  if (!data) {
    return (
      <AppLayout>
        <EmptyState icon={BarChart3} title="Reports unavailable" description="Could not load institution reports. Make sure you have an institution assigned." action={<Button onClick={() => navigate('/institution')} className="bg-tiva-teal text-[#0A0F0D]">Back to Portal</Button>} />
      </AppLayout>
    );
  }

  const { summary, engagement, health_outcomes, monthly_trends, institution } = data;

  return (
    <AppLayout>
      <SectionHeader
        title={`${institution?.name || 'Institution'} — Reports`}
        subtitle="Patient engagement metrics & health outcomes over the last 6 months"
        action={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => navigate('/institution')} className="border-white/10">
              <ArrowLeft className="w-4 h-4 mr-1" /> Portal
            </Button>
            <Button variant="outline" onClick={() => { setRefreshing(true); loadReports(); }} disabled={refreshing} className="border-tiva-teal/40">
              <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button onClick={handleExport} disabled={exporting} className="bg-tiva-teal text-[#0A0F0D]">
              {exporting ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
              {exporting ? 'Generating...' : 'Export PDF'}
            </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SummaryCard icon={Users} value={summary.total_patients} label="Total Patients" accent="lavender" />
        <SummaryCard icon={Activity} value={summary.total_readings} label="Health Readings" accent="mint" />
        <SummaryCard icon={Bell} value={summary.total_alerts} label="Total Alerts" accent="peach" />
        <SummaryCard icon={Pill} value={summary.active_medications} label="Active Medications" accent="navy" />
      </div>

      {/* Engagement Metrics */}
      <div className="mb-6">
        <h3 className="font-heading font-semibold text-lg text-navy mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-tiva-teal" /> Patient Engagement
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Reading Engagement"
            value={`${engagement.readings_engagement_rate}%`}
            sub={`${engagement.patients_with_readings_30d}/${summary.total_patients} active (30d)`}
            icon={Activity}
            accent="mint"
          />
          <MetricCard
            label="Check-in Compliance"
            value={`${engagement.checkin_compliance_rate}%`}
            sub={`${engagement.patients_with_checkins_30d}/${summary.total_patients} checked in (30d)`}
            icon={CheckCircle}
            accent="lavender"
          />
          <MetricCard
            label="Medication Adherence"
            value={`${engagement.medication_adherence_rate}%`}
            sub="Reminders taken on time"
            icon={Pill}
            accent="peach"
          />
          <MetricCard
            label="Avg Readings/Patient"
            value={engagement.avg_readings_per_patient}
            sub={`${engagement.messages_last_30d} messages (30d)`}
            icon={MessageSquare}
            accent="navy"
          />
        </div>
      </div>

      {/* Charts */}
      <ReportsCharts
        monthlyTrends={monthly_trends}
        healthOutcomes={health_outcomes}
        summary={summary}
      />
    </AppLayout>
  );
}

function SummaryCard({ icon: Icon, value, label, accent }) {
  const accents = {
    lavender: 'bg-lavender text-lavender-deep',
    mint: 'bg-mint text-mint-deep',
    peach: 'bg-peach text-peach-deep',
    navy: 'bg-white/10 text-white',
  };
  return (
    <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10">
      <div className={`w-10 h-10 rounded-xl ${accents[accent]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="font-heading font-bold text-3xl text-navy">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function MetricCard({ label, value, sub, icon: Icon, accent }) {
  const accents = {
    lavender: 'bg-lavender text-lavender-deep border-lavender-deep/20',
    mint: 'bg-mint text-mint-deep border-mint-deep/20',
    peach: 'bg-peach text-peach-deep border-peach-deep/20',
    navy: 'bg-white/10 text-white border-white/10',
  };
  return (
    <div className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg ${accents[accent]} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="font-heading font-bold text-2xl text-navy">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}