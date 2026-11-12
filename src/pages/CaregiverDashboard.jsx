import { useState, useEffect } from 'react';
import { Stethoscope, Search, Activity, Pill, AlertCircle, FileText, Users, RefreshCw, ChevronRight, Phone, MessageCircle, CalendarClock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/AppLayout';
import { SectionHeader, LoadingState, RiskBadge, EmptyState } from '@/components/ui/primitives';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PatientTrendCharts from '@/components/PatientTrendCharts';
import CaregiverSummary from '@/components/caregiver/CaregiverSummary';
import CaregiverMessagePanel from '@/components/caregiver/CaregiverMessagePanel';
import ClinicalNotesPanel from '@/components/institution/ClinicalNotesPanel';
import CareTaskPanel from '@/components/caregiver/CareTaskPanel';
import AlertExplanation from '@/components/caregiver/AlertExplanation';

export default function CaregiverDashboard() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetail, setPatientDetail] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [overrideType, setOverrideType] = useState('monthly');
  const [overrideInterval, setOverrideInterval] = useState(2);
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [messagingPatient, setMessagingPatient] = useState(null);

  useEffect(() => {
    loadOverview();
  }, []);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('caregiverPortal', { action: 'overview' });
      setPatients(res.data?.patients || []);
    } catch {
      setPatients([]);
    }
    setLoading(false);
  };

  const selectPatient = async (p) => {
    setSelectedPatient(p);
    setPatientDetail(null);
    setLoadingPatient(true);
    try {
      const patientUserId = p?.assignment?.patient_user_id || p?.profile?.created_by_id || p?.profile?.id;
      const res = await base44.functions.invoke('caregiverPortal', {
        action: 'patient_detail',
        patient_user_id: patientUserId,
      });
      const data = res.data;
      setPatientDetail(data);
      if (data.profile?.clinician_override) {
        setOverrideType(data.profile.clinician_override.schedule_type || 'monthly');
        setOverrideInterval(data.profile.clinician_override.week_interval || 2);
      } else {
        setOverrideType(data.profile?.checkin_schedule_type || 'monthly');
        setOverrideInterval(data.profile?.checkin_week_interval || 2);
      }
    } catch {}
    setLoadingPatient(false);
  };

  const applyOverride = async () => {
    if (!patientDetail?.profile) return;
    setOverrideSaving(true);
    try {
      const patientUserId = selectedPatient?.assignment?.patient_user_id || selectedPatient?.profile?.created_by_id || selectedPatient?.profile?.id;
      await base44.functions.invoke('clinicianOverrideCheckin', {
        patient_profile_id: patientDetail.profile.id,
        schedule_type: overrideType,
        week_interval: overrideInterval,
      });
      // Refresh detail
      const res = await base44.functions.invoke('caregiverPortal', {
        action: 'patient_detail',
        patient_user_id: patientUserId,
      });
      setPatientDetail(res.data);
    } catch {}
    setOverrideSaving(false);
  };

  const openMessaging = (p) => {
    // Use overview patient data; enrich with profile from detail if available
    setMessagingPatient({
      assignment: p?.assignment || {},
      profile: patientDetail?.profile || selectedPatient?.profile || p?.profile || null,
    });
  };

  if (loading) return <AppLayout><LoadingState label="Loading caregiver dashboard..." /></AppLayout>;

  const filteredPatients = patients.filter(p => {
    const name = p?.assignment?.patient_name || p?.profile?.full_name || 'Patient';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const getPatientRisk = (p) => {
    if (p?.latestPrediction?.risk_level) return p.latestPrediction.risk_level;
    if (p?.activeAlerts?.some(a => a.severity === 'red')) return 'red';
    if (p?.activeAlerts?.length > 0) return 'amber';
    return 'green';
  };

  const redCount = patients.filter(p => getPatientRisk(p) === 'red').length;
  const amberCount = patients.filter(p => getPatientRisk(p) === 'amber').length;
  const greenCount = patients.filter(p => getPatientRisk(p) === 'green').length;

  return (
    <AppLayout>
      <SectionHeader
        title="Caregiver Monitoring Portal"
        subtitle={`${patients.length} patients · ${redCount} red · ${amberCount} amber · ${greenCount} green`}
        action={
          <Button variant="outline" onClick={loadOverview} className="border-tiva-teal/40">
            <RefreshCw className="w-4 h-4 mr-1" /> Sync
          </Button>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-destructive/10 rounded-2xl p-4 border border-destructive/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
            <span className="text-sm font-medium text-destructive">Red Alert</span>
          </div>
          <p className="font-heading font-bold text-3xl text-destructive">{redCount}</p>
          <p className="text-xs text-muted-foreground">Need immediate attention</p>
        </div>
        <div className="bg-amber/10 rounded-2xl p-4 border border-amber/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-peach-deep" />
            <span className="text-sm font-medium text-peach-deep">Amber</span>
          </div>
          <p className="font-heading font-bold text-3xl text-peach-deep">{amberCount}</p>
          <p className="text-xs text-muted-foreground">Needs monitoring</p>
        </div>
        <div className="bg-tiva-teal/15 rounded-2xl p-4 border border-tiva-teal/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-mint-deep" />
            <span className="text-sm font-medium text-mint-deep">Green</span>
          </div>
          <p className="font-heading font-bold text-3xl text-mint-deep">{greenCount}</p>
          <p className="text-xs text-muted-foreground">Stable</p>
        </div>
      </div>

      {/* Patient Summary Cards */}
      {patients.length > 0 && (
        <CaregiverSummary patients={patients} onSelect={selectPatient} onMessage={openMessaging} />
      )}

      {patients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No patients connected yet"
          description="When patients invite you as their caregiver, they'll appear here. Ask them to invite you from their Family page."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-4">
          {/* Patient List */}
          <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search patients..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
              {filteredPatients.map((p) => {
                const risk = getPatientRisk(p);
                return (
                  <button
                    key={p.assignment.id}
                    onClick={() => selectPatient(p)}
                    className={`w-full flex items-center gap-3 p-4 border-b border-white/10 text-left transition-all hover:bg-white/5 ${
                      selectedPatient?.assignment?.id === p.assignment.id ? 'bg-tiva-teal/15' : ''
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-lavender flex items-center justify-center text-navy font-semibold">
                      {p.assignment.patient_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy truncate">{p.assignment.patient_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.assignment.relationship || 'Patient'} · {p.assignment.permission_level.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.activeAlerts.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-destructive animate-pulse-soft" />
                      )}
                      <RiskBadge level={risk} />
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Patient Detail */}
          <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-5">
            {!selectedPatient ? (
              <EmptyState
                icon={Stethoscope}
                title="Select a patient"
                description="Choose a patient from the list or summary cards to view their health overview, medications, alerts, and documents."
              />
            ) : loadingPatient || !patientDetail ? (
              <LoadingState label="Loading patient data..." />
            ) : (
              <div className="animate-fade-in">
                {/* Patient Header */}
                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-white/10">
                  <div className="w-14 h-14 rounded-2xl bg-lavender flex items-center justify-center text-navy font-heading font-bold text-xl">
                    {selectedPatient.assignment.patient_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h2 className="font-heading font-bold text-xl text-navy">{selectedPatient.assignment.patient_name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedPatient.assignment.relationship} · Last sync: {new Date(selectedPatient.assignment.last_sync_at || selectedPatient.assignment.created_date).toLocaleString()}
                    </p>
                  </div>
                  <RiskBadge level={getPatientRisk(selectedPatient)} size="md" />
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => openMessaging(selectedPatient)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-mint/40 text-mint-deep text-sm font-semibold hover:bg-mint/60 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" /> Message
                  </button>
                  {patientDetail.profile?.phone && (
                    <a
                      href={`tel:${patientDetail.profile.phone}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-lavender text-lavender-deep text-sm font-semibold hover:bg-lavender-deep/20 transition-all"
                    >
                      <Phone className="w-4 h-4" /> Call
                    </a>
                  )}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-white/5">
                    <Pill className="w-4 h-4 text-mint-deep mb-1" />
                    <p className="font-heading font-bold text-lg text-navy">{patientDetail.meds?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Medications</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5">
                    <Activity className="w-4 h-4 text-lavender-deep mb-1" />
                    <p className="font-heading font-bold text-lg text-navy">{patientDetail.reads?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Readings</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5">
                    <AlertCircle className="w-4 h-4 text-destructive mb-1" />
                    <p className="font-heading font-bold text-lg text-navy">{patientDetail.alts?.filter(a => a.status === 'active').length || 0}</p>
                    <p className="text-xs text-muted-foreground">Active Alerts</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5">
                    <FileText className="w-4 h-4 text-peach-deep mb-1" />
                    <p className="font-heading font-bold text-lg text-navy">{patientDetail.docs?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Documents</p>
                  </div>
                </div>

                {/* Care Tasks */}
                <div className="mb-6">
                  <CareTaskPanel
                    patientUserId={selectedPatient.assignment.patient_user_id}
                    patientName={selectedPatient.assignment.patient_name}
                    source="caregiver"
                  />
                </div>

                {/* Clinical Notes (internal — staff only) */}
                <div className="mb-6">
                  <ClinicalNotesPanel
                    patientUserId={selectedPatient.assignment.patient_user_id}
                    patientName={selectedPatient.assignment.patient_name}
                    source="caregiver"
                  />
                </div>

                {/* Health Metric Trend Charts */}
                <PatientTrendCharts readings={patientDetail.reads} />

                {/* Active Alerts */}
                {patientDetail.alts?.filter(a => a.status === 'active').length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-heading font-semibold text-navy mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive" /> Active Alerts
                    </h3>
                    <div className="space-y-2">
                      {patientDetail.alts.filter(a => a.status === 'active').map(a => (
                        <div key={a.id} className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-navy">{a.title}</p>
                            <p className="text-xs text-muted-foreground">{a.description}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {new Date(a.created_date).toLocaleString()}
                            </p>
                            <AlertExplanation alert={a} />
                          </div>
                          <RiskBadge level={a.severity} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medications */}
                <div className="mb-6">
                  <h3 className="font-heading font-semibold text-navy mb-2 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-mint-deep" /> Active Medications
                  </h3>
                  <div className="space-y-2">
                    {(patientDetail.meds || []).map(m => (
                      <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                        <div className="w-8 h-8 rounded-lg bg-mint flex items-center justify-center">
                          <Pill className="w-4 h-4 text-mint-deep" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-navy">{m.name} · {m.dosage}</p>
                          <p className="text-xs text-muted-foreground">{m.frequency}</p>
                        </div>
                      </div>
                    ))}
                    {(!patientDetail.meds || patientDetail.meds.length === 0) && (
                      <p className="text-sm text-muted-foreground">No active medications</p>
                    )}
                  </div>
                </div>

                {/* Recent Readings */}
                <div>
                  <h3 className="font-heading font-semibold text-navy mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-lavender-deep" /> Recent Health Readings
                  </h3>
                  <div className="space-y-2">
                    {(patientDetail.reads || []).slice(0, 5).map(r => (
                      <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-navy capitalize">
                            {r.metric_type.replace(/_/g, ' ')}: {r.value}{r.secondary_value ? `/${r.secondary_value}` : ''} {r.unit}
                          </p>
                          <p className="text-xs text-muted-foreground">{r.ai_interpretation}</p>
                        </div>
                        <RiskBadge level={r.risk_level} />
                      </div>
                    ))}
                    {(!patientDetail.reads || patientDetail.reads.length === 0) && (
                      <p className="text-sm text-muted-foreground">No recent readings</p>
                    )}
                  </div>
                </div>

                {/* Clinician Check-in Schedule Override */}
                {patientDetail.profile && (
                  <div className="mt-6 p-4 rounded-xl bg-lavender border border-lavender-deep/20">
                    <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-lavender-deep" /> Check-in Schedule Override
                    </h3>
                    {patientDetail.profile.clinician_override && (
                      <p className="text-xs text-mint-deep mb-3">
                        ✓ Override active — set on {new Date(patientDetail.profile.clinician_override.set_at).toLocaleDateString()}
                      </p>
                    )}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {['monthly', 'weekly', 'every_x_weeks'].map(t => (
                        <button
                          key={t}
                          onClick={() => setOverrideType(t)}
                          className={`py-2 px-2 rounded-lg text-xs font-medium transition-all border-2 ${
                            overrideType === t ? 'border-tiva-teal bg-tiva-teal/15 text-navy' : 'border-white/10 text-muted-foreground'
                          }`}
                        >
                          {t === 'every_x_weeks' ? 'Every X weeks' : t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                    {overrideType === 'every_x_weeks' && (
                      <div className="flex items-center gap-2 mb-3">
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={overrideInterval}
                          onChange={e => setOverrideInterval(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="w-16 text-center bg-white/10 rounded-lg px-2 py-1.5 text-sm text-navy border border-white/10"
                        />
                        <span className="text-xs text-muted-foreground">weeks</span>
                      </div>
                    )}
                    <button
                      onClick={applyOverride}
                      disabled={overrideSaving}
                      className="w-full py-2.5 rounded-xl font-heading font-semibold text-xs bg-tiva-teal text-[#0A0F0D] disabled:opacity-50 hover:brightness-110 transition-all"
                    >
                      {overrideSaving ? 'Applying…' : 'Apply Override & Notify Patient'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messaging Panel */}
      {messagingPatient && (
        <CaregiverMessagePanel
          patient={messagingPatient}
          onClose={() => setMessagingPatient(null)}
        />
      )}
    </AppLayout>
  );
}