import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import AppLayout from '@/components/AppLayout';
import { SectionHeader, LoadingState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { RefreshCw, Building2 } from 'lucide-react';
import SuperAdminView from '@/components/institution/SuperAdminView';
import InstitutionAdminView from '@/components/institution/InstitutionAdminView';

export default function InstitutionPortal() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await base44.functions.invoke('institutionPortal', { action: 'get_dashboard' });
      setData(res.data);
    } catch {
      setData(null);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  if (loading) return <AppLayout><LoadingState label="Loading institutional portal..." /></AppLayout>;

  if (!data) {
    return (
      <AppLayout>
        <div className="text-center py-20 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-peach/20 border border-peach/30 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-peach-deep" />
          </div>
          <h2 className="font-heading font-bold text-xl text-white mb-2">Institution Data Unavailable</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Could not retrieve facility records. Please verify your connection or refresh the dashboard.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={handleRefresh} disabled={refreshing} className="bg-tiva-teal text-[#0A0F0D]">
              <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} /> Try Again
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'} className="border-white/10">
              Return Home
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isSuperAdmin = data?.role === 'super_admin';

  return (
    <AppLayout>
      <SectionHeader
        title={isSuperAdmin ? 'Platform Administration' : `${data?.institution?.name || 'Institution'} Portal`}
        subtitle={isSuperAdmin ? 'Manage all institutions, approvals, and platform oversight' : 'Healthcare organization management & patient oversight'}
        action={
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="border-tiva-teal/40">
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        }
      />

      {isSuperAdmin ? (
        <SuperAdminView data={data} onRefresh={loadDashboard} />
      ) : (
        <InstitutionAdminView data={data} onRefresh={loadDashboard} />
      )}
    </AppLayout>
  );
}