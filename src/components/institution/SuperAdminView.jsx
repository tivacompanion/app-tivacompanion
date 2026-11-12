import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Building2, CheckCircle, XCircle, Plus, Search, Shield, Users, Activity, DollarSign, Loader2, Mail } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { EmptyState } from '@/components/ui/primitives';

export default function SuperAdminView({ data, onRefresh }) {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [createForm, setCreateForm] = useState({ name: '', type: 'hospital', address: '', contact_email: '', contact_phone: '', billing_cycle: 'monthly', admin_email: '', admin_name: '' });
  const [approveForm, setApproveForm] = useState({ admin_email: '', admin_name: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApprove = async () => {
    setError('');
    setLoading(true);
    try {
      await base44.functions.invoke('institutionPortal', {
        action: 'approve_institution',
        institution_id: approveTarget.id,
        admin_email: approveForm.admin_email,
        admin_name: approveForm.admin_name,
      });
      setApproveTarget(null);
      setApproveForm({ admin_email: '', admin_name: '' });
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
    setLoading(false);
  };

  const handleReject = async (institution) => {
    if (!confirm(`Reject ${institution.name}? This will notify them via email.`)) return;
    try {
      await base44.functions.invoke('institutionPortal', { action: 'reject_institution', institution_id: institution.id });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleCreate = async () => {
    setError('');
    setLoading(true);
    try {
      await base44.functions.invoke('institutionPortal', { action: 'create_institution', ...createForm });
      setCreateForm({ name: '', type: 'hospital', address: '', contact_email: '', contact_phone: '', billing_cycle: 'monthly', admin_email: '', admin_name: '' });
      setShowCreate(false);
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
    setLoading(false);
  };

  const stats = data?.stats || {};
  const institutions = data?.institutions || [];
  const pending = data?.pending_institutions || [];

  const filtered = institutions.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()));

  const typeIcons = { hospital: Building2, clinic: Building2, care_home: Shield, insurance: DollarSign, home_care: Users };

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatBox icon={Building2} value={stats?.total_institutions || 0} label="Institutions" color="lavender" />
        <StatBox icon={Users} value={stats?.total_patients || 0} label="Total Patients" color="mint" />
        <StatBox icon={Activity} value={stats?.active || 0} label="Active" color="peach" />
        <StatBox icon={Shield} value={stats?.pending || 0} label="Pending" color="navy" />
      </div>

      {/* Pending Approvals */}
      {pending.length > 0 && (
        <div className="bg-peach/10 rounded-2xl border border-peach/20 p-5 mb-6">
          <h3 className="font-heading font-semibold text-navy mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-peach-deep" /> Pending Access Requests ({pending.length})
          </h3>
          <div className="space-y-2">
            {pending.map(inst => (
              <div key={inst.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <div className="w-9 h-9 rounded-lg bg-peach flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-peach-deep" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy">{inst.name}</p>
                  <p className="text-xs text-muted-foreground">{inst.type.replace(/_/g, ' ')} · {inst.contact_email}</p>
                </div>
                <Button size="sm" onClick={() => { setApproveTarget(inst); setApproveForm({ admin_email: inst.contact_email, admin_name: inst.admin_name || '' }); }} className="bg-tiva-teal text-[#0A0F0D] h-8">
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleReject(inst)} className="border-destructive/30 text-destructive h-8">
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-card/50 backdrop-blur-md rounded-2xl p-5 border border-white/10 mb-6">
        <h3 className="font-heading font-semibold text-navy mb-4">Patient Distribution by Type</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={
            Object.entries(institutions.reduce((acc, i) => { acc[i.type] = (acc[i.type] || 0) + (i.patient_count || 0); return acc; }, {}))
              .map(([type, count]) => ({ type: type.replace(/_/g, ' '), patients: count || 1 }))
          }>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="type" tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.5)" />
            <YAxis tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.5)" />
            <Tooltip contentStyle={{ background: 'rgba(15,22,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
            <Bar dataKey="patients" fill="#40C9A2" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Search + Create */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search institutions..." className="pl-9" />
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-tiva-teal text-[#0A0F0D]">
          <Plus className="w-4 h-4 mr-1" /> Create Institution
        </Button>
      </div>

      {/* Institutions Table */}
      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="No institutions" description="Create or approve institutions to get started." />
      ) : (
        <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Institution</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Admin</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Patients</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inst => {
                  const Icon = typeIcons[inst.type] || Building2;
                  return (
                    <tr key={inst.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-lavender flex items-center justify-center">
                            <Icon className="w-4 h-4 text-lavender-deep" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-navy">{inst.name}</p>
                            <p className="text-xs text-muted-foreground">{inst.address || 'No address'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-navy">{inst.admin_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{inst.contact_email}</p>
                      </td>
                      <td className="p-4"><span className="text-sm font-semibold text-navy">{inst.patient_count || 0}</span></td>
                      <td className="p-4">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          inst.status === 'active' ? 'bg-mint text-mint-deep' :
                          inst.status === 'pending' ? 'bg-peach text-peach-deep' : 'bg-muted text-muted-foreground'
                        }`}>{inst.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Approve: {approveTarget?.name}</DialogTitle></DialogHeader>
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Assign an admin who will manage this institution. If they have a Tiva account, they'll be promoted to admin.</p>
            <div>
              <Label>Admin Name</Label>
              <Input value={approveForm.admin_name} onChange={e => setApproveForm({ ...approveForm, admin_name: e.target.value })} placeholder="Dr. John Smith" />
            </div>
            <div>
              <Label>Admin Email</Label>
              <Input type="email" value={approveForm.admin_email} onChange={e => setApproveForm({ ...approveForm, admin_email: e.target.value })} placeholder="admin@hospital.cm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={loading || !approveForm.admin_email} className="bg-tiva-teal text-[#0A0F0D]">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Approve & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Institution</DialogTitle></DialogHeader>
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div className="space-y-3 py-2">
            <div>
              <Label>Name</Label>
              <Input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Central Hospital" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={createForm.type} onValueChange={v => setCreateForm({ ...createForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hospital">Hospital</SelectItem>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="care_home">Care Home</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="home_care">Home Care</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Address</Label><Input value={createForm.address} onChange={e => setCreateForm({ ...createForm, address: e.target.value })} placeholder="Yaoundé" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contact Email</Label><Input type="email" value={createForm.contact_email} onChange={e => setCreateForm({ ...createForm, contact_email: e.target.value })} placeholder="admin@hospital.cm" /></div>
              <div><Label>Phone</Label><Input value={createForm.contact_phone} onChange={e => setCreateForm({ ...createForm, contact_phone: e.target.value })} placeholder="+237..." /></div>
            </div>
            <div><Label>Admin Name (optional)</Label><Input value={createForm.admin_name} onChange={e => setCreateForm({ ...createForm, admin_name: e.target.value })} placeholder="Dr. John Smith" /></div>
            <div><Label>Admin Email (optional)</Label><Input type="email" value={createForm.admin_email} onChange={e => setCreateForm({ ...createForm, admin_email: e.target.value })} placeholder="admin@hospital.cm" /></div>
            <div>
              <Label>Billing Cycle</Label>
              <Select value={createForm.billing_cycle} onValueChange={v => setCreateForm({ ...createForm, billing_cycle: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="annual">Annual</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading || !createForm.name} className="bg-tiva-teal text-[#0A0F0D]">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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