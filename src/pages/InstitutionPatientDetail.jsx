import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/AppLayout';
import { SectionHeader, LoadingState, RiskBadge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pill, Activity, AlertCircle, FileText, Users, Phone, Heart, Calendar, CheckCircle, Download, Loader2 } from 'lucide-react';
import PatientTrendCharts from '@/components/PatientTrendCharts';
import RemoteStatusBanner from '@/components/institution/RemoteStatusBanner';
import PatientQuickActions from '@/components/institution/PatientQuickActions';
import ClinicalNotesPanel from '@/components/institution/ClinicalNotesPanel';
import CareTaskPanel from '@/components/caregiver/CareTaskPanel';

export default function InstitutionPatientDetail() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadDetail();
  }, [patientId]);

  const loadDetail = async () => {
    try {
      const res = await base44.functions.invoke('institutionPortal', {
        action: 'get_patient_detail',
        patient_user_id: patientId,
      });
      setData(res.data);
    } catch (e) {
      setData(null);
    }
    setLoading(false);
  };

  const profile = data?.profile;

  const handleExportCheckIn = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      doc.setFontSize(22);
      doc.setTextColor(64, 201, 162);
      doc.text('Tiva Patient Check-in Summary', 20, 22);

      doc.setFontSize(14);
      doc.setTextColor(23, 23, 23);
      doc.text(`Patient: ${profile?.full_name || 'Patient'}`, 20, 32);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Date of Birth: ${profile?.date_of_birth || 'N/A'} · Blood Type: ${profile?.blood_type || 'Unknown'}`, 20, 42);
      doc.text(`Care Mode: ${profile?.care_mode || 'General'} · Export Date: ${new Date().toLocaleDateString()}`, 20, 48);

      doc.setDrawColor(226, 232, 240);
      doc.line(20, 54, 190, 54);

      doc.setFontSize(11);
      doc.setTextColor(23, 23, 23);
      doc.text('Check-in History & Observations:', 20, 66);

      const observations = data?.observations || [];
      if (observations.length === 0) {
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text('No formal check-in observations recorded yet.', 25, 78);
      } else {
        let y = 78;
        observations.slice(0, 15).forEach((obs, i) => {
          doc.setFontSize(9);
          doc.setTextColor(71, 85, 105);
          const date = (obs.submitted_at || obs.created_date || '').slice(0, 10);
          const bp = obs.systolic_bp && obs.diastolic_bp ? `${obs.systolic_bp}/${obs.diastolic_bp} mmHg` : 'BP: N/A';
          const weight = obs.weight_kg ? `${obs.weight_kg} kg` : '';
          const score = obs.wellness_score ? `Wellness: ${obs.wellness_score}/5` : '';
          doc.text(`${i + 1}. ${date} — ${bp} ${weight ? `· ${weight}` : ''} ${score ? `· ${score}` : ''}`, 25, y);
          y += 8;
        });
      }

      doc.save(`Tiva_CheckIn_${profile?.full_name?.replace(/\s+/g, '_') || 'Patient'}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      alert('Could not export check-in report. Please try again.');
    }
    setExporting(false);
  };

  if (loading) return <AppLayout><LoadingState label="Loading patient data..." /></AppLayout>;

  return (
    <AppLayout>
      <SectionHeader
        title={profile?.full_name || 'Patient Detail'}
        subtitle="Institutional patient overview"
        action={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => navigate('/institution')} className="border-tiva-teal/40">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Portal
            </Button>
            <Button onClick={handleExportCheckIn} disabled={exporting} className="bg-tiva-teal text-[#0A0F0D]">
              {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
              {exporting ? 'Generating...' : 'Export Check-in Report'}
            </Button>
          </div>
        }
      />

      {/* Patient Header */}
      <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-5 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-lavender flex items-center justify-center text-navy font-heading font-bold text-2xl">
            {profile?.full_name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="font-heading font-bold text-xl text-navy">{profile?.full_name}</h2>
            <p className="text-sm text-muted-foreground">
              {profile?.date_of_birth ? `Born ${new Date(profile.date_of_birth).toLocaleDateString()}` : ''} · {profile?.gender || 'N/A'} · Blood: {profile?.blood_type || 'Unknown'}
            </p>
            {profile?.phone && (
              <a href={`tel:${profile.phone}`} className="inline-flex items-center gap-1 text-xs text-tiva-teal mt-1">
                <Phone className="w-3 h-3" /> {profile.phone}
              </a>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-white/5">
            <Pill className="w-4 h-4 text-mint-deep mb-1" />
            <p className="font-heading font-bold text-lg text-navy">{data?.meds?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Medications</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5">
            <Activity className="w-4 h-4 text-lavender-deep mb-1" />
            <p className="font-heading font-bold text-lg text-navy">{data?.reads?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Readings</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5">
            <AlertCircle className="w-4 h-4 text-destructive mb-1" />
            <p className="font-heading font-bold text-lg text-navy">{data?.alts?.filter(a => a.status === 'active').length || 0}</p>
            <p className="text-xs text-muted-foreground">Active Alerts</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5">
            <FileText className="w-4 h-4 text-peach-deep mb-1" />
            <p className="font-heading font-bold text-lg text-navy">{data?.docs?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Documents</p>
          </div>
        </div>
      </div>

      {/* Quick Actions: Call & Message */}
      <PatientQuickActions
        patientUserId={patientId}
        patientName={profile?.full_name}
        patientPhone={profile?.phone}
      />

      {/* Remote Status Banner */}
      <RemoteStatusBanner remoteStatus={data?.remote_status} />

      {/* Health conditions & allergies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-5">
          <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4 text-destructive" /> Conditions & Allergies
          </h3>
          <div className="space-y-2">
            {profile?.chronic_conditions?.length > 0 ? (
              profile.chronic_conditions.map((c, i) => (
                <span key={i} className="inline-block mr-2 mb-1 px-2.5 py-1 rounded-full text-xs bg-destructive/10 text-destructive">{c}</span>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No chronic conditions recorded</p>
            )}
            {profile?.allergies?.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Allergies:</p>
                {profile.allergies.map((a, i) => (
                  <span key={i} className="inline-block mr-2 mb-1 px-2.5 py-1 rounded-full text-xs bg-peach text-peach-deep">{a}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-5">
          <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-lavender-deep" /> Assigned Caregivers
          </h3>
          <div className="space-y-2">
            {data?.caregivers?.length > 0 ? data.caregivers.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
                <div className="w-8 h-8 rounded-full bg-mint flex items-center justify-center text-navy font-semibold text-sm">
                  {c.caregiver_name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy">{c.caregiver_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{c.permission_level?.replace(/_/g, ' ')}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No caregivers assigned</p>
            )}
          </div>
        </div>
      </div>

      {/* Care Tasks */}
      <div className="mb-4">
        <CareTaskPanel
          patientUserId={patientId}
          patientName={profile?.full_name}
          source="institution"
        />
      </div>

      {/* Clinical Notes (internal — staff only) */}
      <div className="mb-4">
        <ClinicalNotesPanel
          patientUserId={patientId}
          patientName={profile?.full_name}
          source="institution"
        />
      </div>

      {/* Health Trends */}
      {data?.reads?.length > 0 && (
        <div className="mb-4">
          <PatientTrendCharts readings={data.reads} />
        </div>
      )}

      {/* Active Alerts */}
      {data?.alts?.filter(a => a.status === 'active').length > 0 && (
        <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-5 mb-4">
          <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" /> Active Alerts
          </h3>
          <div className="space-y-2">
            {data.alts.filter(a => a.status === 'active').map(a => (
              <div key={a.id} className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(a.created_date).toLocaleString()}</p>
                </div>
                <RiskBadge level={a.severity} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medications */}
      <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-5 mb-4">
        <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2">
          <Pill className="w-4 h-4 text-mint-deep" /> Active Medications
        </h3>
        <div className="space-y-2">
          {data?.meds?.length > 0 ? data.meds.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <div className="w-8 h-8 rounded-lg bg-mint flex items-center justify-center">
                <Pill className="w-4 h-4 text-mint-deep" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-navy">{m.name} · {m.dosage}</p>
                <p className="text-xs text-muted-foreground">{m.frequency}</p>
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground">No active medications</p>}
        </div>
      </div>

      {/* Recent Readings */}
      <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-5">
        <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-lavender-deep" /> Recent Health Readings
        </h3>
        <div className="space-y-2">
          {data?.reads?.length > 0 ? data.reads.slice(0, 10).map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
              <div className="flex-1">
                <p className="text-sm font-medium text-navy capitalize">
                  {r.metric_type.replace(/_/g, ' ')}: {r.value}{r.secondary_value ? `/${r.secondary_value}` : ''} {r.unit}
                </p>
                <p className="text-xs text-muted-foreground">{r.ai_interpretation}</p>
              </div>
              <RiskBadge level={r.risk_level} />
            </div>
          )) : <p className="text-sm text-muted-foreground">No recent readings</p>}
        </div>
      </div>

      {/* Upcoming Appointments */}
      {data?.appointments?.length > 0 && (
        <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-5 mb-4">
          <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-mint-deep" /> Appointments
          </h3>
          <div className="space-y-2">
            {data.appointments.map(appt => (
              <div key={appt.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <div className="w-8 h-8 rounded-lg bg-mint flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-mint-deep" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy">{appt.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {appt.doctor_name ? `${appt.doctor_name} · ` : ''}
                    {new Date(appt.appointment_date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  appt.status === 'upcoming' ? 'bg-mint text-mint-deep' :
                  appt.status === 'completed' ? 'bg-lavender text-lavender-deep' :
                  appt.status === 'missed' ? 'bg-destructive/15 text-destructive' :
                  'bg-white/10 text-muted-foreground'
                }`}>
                  {appt.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Check-in History */}
      {data?.checkIns?.length > 0 && (
        <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-5 mb-4">
          <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-mint-deep" /> Check-in History
          </h3>
          <div className="space-y-2">
            {data.checkIns.map(ci => (
              <div key={ci.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <div className="w-8 h-8 rounded-lg bg-lavender flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-lavender-deep" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy">
                    BP: {ci.systolic_bp}/{ci.diastolic_bp} · HR: {ci.heart_rate || 'N/A'} bpm · Weight: {ci.weight_kg}kg
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Wellness: {ci.wellness_score}/5 · {new Date(ci.submitted_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                {ci.critical_alert_triggered && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-destructive/15 text-destructive">
                    Critical
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert History (including resolved) */}
      {data?.alts?.length > 0 && (
        <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-5">
          <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" /> Alert History
          </h3>
          <div className="space-y-2">
            {data.alts.map(a => (
              <div key={a.id} className={`p-3 rounded-xl border flex items-start gap-3 ${
                a.status === 'active'
                  ? 'bg-destructive/10 border-destructive/20'
                  : 'bg-white/5 border-white/10'
              }`}>
                <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${a.status === 'active' ? 'text-destructive' : 'text-muted-foreground'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-navy">{a.title}</p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      a.status === 'active' ? 'bg-destructive/15 text-destructive' :
                      a.status === 'acknowledged' ? 'bg-peach text-peach-deep' :
                      'bg-mint text-mint-deep'
                    }`}>
                      {a.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(a.created_date).toLocaleString()}
                    {a.resolved_at && ` · Resolved: ${new Date(a.resolved_at).toLocaleString()}`}
                  </p>
                </div>
                <RiskBadge level={a.severity} />
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}