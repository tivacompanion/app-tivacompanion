import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Stethoscope, Shield, AlertCircle, ChevronRight, UserPlus, UserMinus, RefreshCw, Trash2, Link2, Loader2, ScrollText, Megaphone, ShieldCheck, XCircle } from 'lucide-react';
import { RiskBadge, EmptyState } from '@/components/ui/primitives';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import InviteCaregiverModal from '@/components/institution/InviteCaregiverModal';
import InviteAdminModal from '@/components/institution/InviteAdminModal';
import AssignPatientModal from '@/components/institution/AssignPatientModal';
import ReassignPatientModal from '@/components/institution/ReassignPatientModal';
import BulkManageModal from '@/components/institution/BulkManageModal';
import BroadcastMessageModal from '@/components/institution/BroadcastMessageModal';
import PatientSortControls from '@/components/institution/PatientSortControls';
import CriticalAlertsPanel from '@/components/institution/CriticalAlertsPanel';
import ActivityLogPanel from '@/components/institution/ActivityLogPanel';
import RemoteMonitoringPanel from '@/components/institution/RemoteMonitoringPanel';
import PatientSearchBar from '@/components/institution/PatientSearchBar';
import PriorityTriagePanel from '@/components/institution/PriorityTriagePanel';
import { Layers, BarChart3, Radio, Siren } from 'lucide-react';

export default function InstitutionAdminView({ data, onRefresh }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('caregivers');
  const [showInvite, setShowInvite] = useState(false);
  const [showAdminInvite, setShowAdminInvite] = useState(false);
  const [adminInvites, setAdminInvites] = useState([]);
  const [assignTarget, setAssignTarget] = useState(null);
  const [reassignTarget, setReassignTarget] = useState(null);
  const [disconnectTarget, setDisconnectTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showBulk, setShowBulk] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [sortBy, setSortBy] = useState('risk');
  const [riskFilter, setRiskFilter] = useState('all');

  const caregivers = data?.caregivers || [];
  const patients = data?.patients || [];
  const institution = data?.institution || {};
  const stats = data?.stats || {};

  const loadAdminInvites = async () => {
    try {
      const res = await base44.functions.invoke('institutionPortal', { action: 'get_admin_invites' });
      setAdminInvites(res.data?.invites || []);
    } catch {}
  };

  useEffect(() => {
    loadAdminInvites();
  }, []);

  const handleRevokeAdminInvite = async (inviteId) => {
    if (!confirm('Revoke this admin invitation?')) return;
    try {
      await base44.functions.invoke('institutionPortal', { action: 'revoke_admin_invite', invite_id: inviteId });
      loadAdminInvites();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleDisconnect = async () => {
    setActionLoading(true);
    try {
      await base44.functions.invoke('institutionPortal', {
        action: 'disconnect_caregiver',
        caregiver_user_id: disconnectTarget.caregiver_user_id,
      });
      setDisconnectTarget(null);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
    setActionLoading(false);
  };

  const handleRemoveAssignment = async (assignmentId) => {
    if (!confirm('Remove this patient-caregiver assignment?')) return;
    try {
      await base44.functions.invoke('institutionPortal', { action: 'remove_assignment', assignment_id: assignmentId });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleDeleteAccount = async () => {
    setActionLoading(true);
    try {
      await base44.functions.invoke('institutionPortal', {
        action: 'delete_caregiver_account',
        caregiver_user_id: deleteTarget.caregiver_user_id,
      });
      setDeleteTarget(null);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
    setActionLoading(false);
  };

  const getPatientRisk = (p) => {
    if (p.active_alerts?.some(a => a.severity === 'red')) return 'red';
    if (p.active_alerts?.length > 0) return 'amber';
    return 'green';
  };

  const riskOrder = { red: 0, amber: 1, green: 2 };

  const filteredPatients = patients
    .filter(p => p.profile?.full_name?.toLowerCase().includes(patientSearch.toLowerCase()))
    .filter(p => {
      if (riskFilter === 'all') return true;
      if (riskFilter === 'no_meds') return !p.has_medications;
      return getPatientRisk(p) === riskFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'risk') {
        return riskOrder[getPatientRisk(a)] - riskOrder[getPatientRisk(b)];
      }
      if (sortBy === 'last_checkin') {
        const aDate = a.last_checkin_date ? new Date(a.last_checkin_date).getTime() : 0;
        const bDate = b.last_checkin_date ? new Date(b.last_checkin_date).getTime() : 0;
        return bDate - aDate;
      }
      if (sortBy === 'medications') {
        return b.med_count - a.med_count;
      }
      return 0;
    });

  return (
    <div>
      {/* Institution Header */}
      <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-tiva-teal/20 p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-tiva-teal flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#0A0F0D]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading font-bold text-xl text-navy">{institution?.name}</h2>
            <p className="text-sm text-muted-foreground capitalize">{institution?.type?.replace(/_/g, ' ')} · {institution?.billing_cycle} billing</p>
          </div>
          <Button onClick={() => setShowAdminInvite(true)} className="bg-white/10 text-white border border-white/10 hover:bg-white/15">
            <ShieldCheck className="w-4 h-4 mr-1" /> Invite Admin
          </Button>
          {patients.length > 0 && <PatientSearchBar patients={patients} />}
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${institution?.status === 'active' ? 'bg-mint text-mint-deep' : 'bg-peach text-peach-deep'}`}>
            {institution?.status}
          </span>
        </div>
      </div>

      {/* Critical Alerts Panel */}
      <CriticalAlertsPanel institutionId={institution?.id} />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatBox icon={Stethoscope} value={stats?.total_caregivers || 0} label="Active Caregivers" color="mint" />
        <StatBox icon={Users} value={stats?.total_patients || 0} label="Patients" color="lavender" />
        <StatBox icon={AlertCircle} value={stats?.active_alerts || 0} label="Active Alerts" color="peach" />
        <StatBox icon={UserPlus} value={stats?.pending_caregivers || 0} label="Pending Invites" color="navy" />
      </div>

      {/* Pending Admin Invites */}
      {adminInvites.length > 0 && (
        <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-tiva-teal/20 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-tiva-teal" />
            <h3 className="font-heading font-semibold text-navy text-sm">Pending Admin Invitations</h3>
          </div>
          <div className="space-y-2">
            {adminInvites.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                <div className="w-9 h-9 rounded-full bg-lavender flex items-center justify-center text-navy font-semibold text-sm">
                  {inv.admin_name?.charAt(0)?.toUpperCase() || inv.admin_email?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy">{inv.admin_name || inv.admin_email}</p>
                  <p className="text-xs text-muted-foreground">{inv.admin_email} · invited by {inv.invited_by_name}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-peach text-peach-deep">pending</span>
                <Button size="sm" variant="outline" onClick={() => handleRevokeAdminInvite(inv.id)} className="border-destructive/30 text-destructive h-8 px-2">
                  <XCircle className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex gap-2">
          <TabButton active={tab === 'triage'} onClick={() => setTab('triage')} icon={Siren} label="Triage" />
          <TabButton active={tab === 'monitoring'} onClick={() => setTab('monitoring')} icon={Radio} label="Monitoring" />
          <TabButton active={tab === 'caregivers'} onClick={() => setTab('caregivers')} icon={Stethoscope} label="Caregivers" />
          <TabButton active={tab === 'patients'} onClick={() => setTab('patients')} icon={Users} label="Patients" />
          <TabButton active={tab === 'activity'} onClick={() => setTab('activity')} icon={ScrollText} label="Activity Log" />
        </div>
        <div className="flex gap-2">
          {patients.length > 0 && (
            <>
              <Button onClick={() => setShowBroadcast(true)} className="bg-white/10 text-white border border-white/10 hover:bg-white/15">
                <Megaphone className="w-4 h-4 mr-1" /> Broadcast
              </Button>
              <Button onClick={() => setShowBulk(true)} className="bg-tiva-teal text-[#0A0F0D]">
                <Layers className="w-4 h-4 mr-1" /> Bulk Manage
              </Button>
            </>
          )}
          <Button onClick={() => navigate('/institution/reports')} className="bg-white/10 text-white border border-white/10 hover:bg-white/15">
            <BarChart3 className="w-4 h-4 mr-1" /> Reports
          </Button>
        </div>
      </div>

      {/* Priority Triage Tab */}
      {tab === 'triage' && (
        <PriorityTriagePanel patients={patients} />
      )}

      {/* Remote Monitoring Tab */}
      {tab === 'monitoring' && (
        <RemoteMonitoringPanel patients={patients} />
      )}

      {/* Caregivers Tab */}
      {tab === 'caregivers' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-semibold text-navy">Care Team ({caregivers.length})</h3>
            <Button onClick={() => setShowInvite(true)} className="bg-tiva-teal text-[#0A0F0D]">
              <UserPlus className="w-4 h-4 mr-1" /> Invite Caregiver
            </Button>
          </div>

          {caregivers.length === 0 ? (
            <EmptyState icon={Stethoscope} title="No caregivers yet" description="Invite caregivers to join your institution. They'll receive an email invitation." action={<Button onClick={() => setShowInvite(true)} className="bg-tiva-teal text-[#0A0F0D]"><UserPlus className="w-4 h-4 mr-1" /> Invite Caregiver</Button>} />
          ) : (
            <div className="space-y-2">
              {caregivers.map(c => (
                <div key={c.id} className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-mint flex items-center justify-center text-navy font-semibold">
                    {c.caregiver_name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy">{c.caregiver_name}</p>
                    <p className="text-xs text-muted-foreground">{c.caregiver_email} · {c.patient_count} patient(s)</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${c.status === 'active' ? 'bg-mint text-mint-deep' : 'bg-peach text-peach-deep'}`}>
                    {c.status}
                  </span>
                  {c.status === 'active' && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setAssignTarget(c)} className="border-tiva-teal/30 h-8 px-2" title="Assign patient">
                        <Link2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDisconnectTarget(c)} className="border-destructive/30 text-destructive h-8 px-2" title="Disconnect">
                        <UserMinus className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDeleteTarget(c)} className="border-destructive/30 text-destructive h-8 px-2" title="Delete account (super admin)">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Patients Tab */}
      {tab === 'patients' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="relative flex-1 max-w-md">
              <Input value={patientSearch} onChange={e => setPatientSearch(e.target.value)} placeholder="Search patients..." />
            </div>
            <Button variant="outline" onClick={onRefresh} className="border-tiva-teal/40">
              <RefreshCw className="w-4 h-4 mr-1" /> Sync
            </Button>
          </div>

          <PatientSortControls
            sortBy={sortBy}
            onSortChange={setSortBy}
            riskFilter={riskFilter}
            onRiskFilterChange={setRiskFilter}
            resultCount={filteredPatients.length}
          />

          {filteredPatients.length === 0 ? (
            <EmptyState icon={Users} title="No patients" description="Assign patients to caregivers from the Caregivers tab." />
          ) : (
            <div className="space-y-2">
              {filteredPatients.map(p => {
                const risk = getPatientRisk(p);
                return (
                  <div key={p.profile.id} className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-11 h-11 rounded-full bg-lavender flex items-center justify-center text-navy font-semibold">
                        {p.profile.full_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-navy">{p.profile.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                           {p.profile.blood_type || 'Unknown'} blood · {p.med_count} meds · {p.reading_count} readings
                         </p>
                        {p.last_checkin_date && (
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                            Last check-in: {new Date(p.last_checkin_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                      </div>
                      <RiskBadge level={risk} />
                      <Button size="sm" variant="outline" onClick={() => navigate(`/institution/patient/${p.patient_user_id}`)} className="border-tiva-teal/30 h-8 px-3">
                        View <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </Button>
                    </div>

                    {/* Assigned caregivers */}
                    {p.assigned_caregivers?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/5">
                        <p className="text-xs text-muted-foreground mb-1.5">Assigned to:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {p.assigned_caregivers.map(ac => (
                            <div key={ac.id} className="flex items-center gap-1 px-2 py-1 rounded-full bg-mint/40 text-xs">
                              <span className="text-mint-deep font-medium">{ac.caregiver_name}</span>
                              <button onClick={() => setReassignTarget({ id: ac.id, patient_name: p.profile.full_name, caregiver_name: ac.caregiver_name, caregiver_user_id: ac.caregiver_user_id })} className="text-muted-foreground hover:text-navy ml-1" title="Reassign">
                                <RefreshCw className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleRemoveAssignment(ac.id)} className="text-muted-foreground hover:text-destructive" title="Remove">
                                <UserMinus className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active alerts */}
                    {p.active_alerts?.length > 0 && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                        <span className="text-xs text-destructive font-medium">{p.active_alerts.length} active alert(s)</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Activity Log Tab */}
      {tab === 'activity' && (
        <ActivityLogPanel institutionId={institution?.id} />
      )}

      {/* Modals */}
      <BulkManageModal open={showBulk} onClose={() => setShowBulk(false)} patients={patients} caregivers={caregivers} onComplete={onRefresh} />
      <BroadcastMessageModal open={showBroadcast} onClose={() => setShowBroadcast(false)} patients={patients} onComplete={onRefresh} />
      <InviteCaregiverModal open={showInvite} onClose={() => setShowInvite(false)} onInvited={onRefresh} />
      <InviteAdminModal open={showAdminInvite} onClose={() => setShowAdminInvite(false)} onInvited={loadAdminInvites} />
      {assignTarget && <AssignPatientModal open={true} onClose={() => setAssignTarget(null)} caregiver={assignTarget} onAssigned={onRefresh} />}
      {reassignTarget && <ReassignPatientModal open={true} onClose={() => setReassignTarget(null)} assignment={reassignTarget} caregivers={caregivers} onReassigned={onRefresh} />}

      {/* Disconnect confirmation */}
      <Dialog open={!!disconnectTarget} onOpenChange={() => setDisconnectTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Disconnect Caregiver</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will disconnect <span className="font-semibold text-navy">{disconnectTarget?.caregiver_name}</span> from your institution and revoke all their patient assignments. They will no longer have access to any patient data.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectTarget(null)}>Cancel</Button>
            <Button onClick={handleDisconnect} disabled={actionLoading} className="bg-destructive text-white">
              {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserMinus className="w-4 h-4 mr-2" />}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete account confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Delete Caregiver Account</DialogTitle></DialogHeader>
          <p className="text-sm text-destructive py-2">
            ⚠️ This will permanently delete <span className="font-semibold">{deleteTarget?.caregiver_name}</span>'s account and revoke ALL their assignments across the entire platform. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button onClick={handleDeleteAccount} disabled={actionLoading} className="bg-destructive text-white">
              {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active ? 'bg-tiva-teal text-[#0A0F0D]' : 'bg-card/50 text-muted-foreground hover:text-navy border border-white/10'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function StatBox({ icon: Icon, value, label, color }) {
  const colors = {
    lavender: 'bg-lavender text-lavender-deep',
    mint: 'bg-mint text-mint-deep',
    peach: 'bg-peach text-peach-deep',
    navy: 'bg-white/10 text-white',
  };
  return (
    <div className="bg-card/50 backdrop-blur-md rounded-2xl p-4 border border-white/10">
      <div className={`w-9 h-9 rounded-lg ${colors[color]} flex items-center justify-center mb-2`}>
        <Icon className="!w-4 !h-4" />
      </div>
      <p className="font-heading font-bold text-2xl text-navy">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}