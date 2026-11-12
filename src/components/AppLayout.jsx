import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, MessageCircle, Pill, Activity, FileText, Siren,
  TrendingUp, Heart, Brain, Users, CreditCard, Settings, LogOut,
  Stethoscope, Shield, Menu, X, Calendar, Bluetooth, MoreHorizontal
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import CircularNavModal from '@/components/CircularNavModal';
import MedicationReminderManager from '@/components/MedicationReminderManager';
import WakeWordListener from '@/components/WakeWordListener';
import OfflineCheckInSync from '@/components/OfflineCheckInSync';
import CriticalAlertAlarm from '@/components/CriticalAlertAlarm';
import BluetoothSyncWorker from '@/components/BluetoothSyncWorker';
import NotificationCenter from '@/components/NotificationCenter';

const bottomNavItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Health', path: '/health', icon: Activity },
  { label: 'More', path: '__more__', icon: MoreHorizontal },
  { label: 'Messages', path: '/messages', icon: MessageCircle },
  { label: 'Records', path: '/vault', icon: FileText },
];

const circularNavItems = [
  { label: 'Medications', path: '/medications', icon: Pill },
  { label: 'AI Companion', path: '/chat', icon: MessageCircle },
  { label: 'Appointments', path: '/appointments', icon: Calendar },
  { label: 'Predictive Care', path: '/predictions', icon: TrendingUp },
  { label: 'Wellness', path: '/wellness', icon: Heart },
];

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'AI Companion', path: '/chat', icon: MessageCircle },
  { label: 'Medications', path: '/medications', icon: Pill },
  { label: 'Health Tracking', path: '/health', icon: Activity },
  { label: 'Medical Vault', path: '/vault', icon: FileText },
  { label: 'Appointments', path: '/appointments', icon: Calendar },
  { label: 'Emergency', path: '/emergency', icon: Siren },
  { label: 'Predictive Care', path: '/predictions', icon: TrendingUp },
  { label: 'Wellness', path: '/wellness', icon: Heart },
  { label: 'Memory', path: '/memory', icon: Brain },
  { label: 'Family', path: '/family', icon: Users },
  { label: 'Messages', path: '/messages', icon: MessageCircle },
  { label: 'Caregiver Portal', path: '/caregiver', icon: Stethoscope },
  { label: 'B2B Portal', path: '/institution', icon: Shield },
  { label: 'Subscription', path: '/subscription', icon: CreditCard },
  { label: 'Bluetooth Devices', path: '/settings/bluetooth', icon: Bluetooth },
  { label: 'Settings', path: '/settings', icon: Settings },
];

export default function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [isCaregiver, setIsCaregiver] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [showCircularNav, setShowCircularNav] = useState(false);

  useEffect(() => {
    base44.auth.me().then(user => {
      setUserName(user?.full_name || 'there');
      setUserRole(user?.role || 'user');
    }).catch(() => {});

    base44.functions.invoke('caregiverPortal', { action: 'check_caregiver' })
      .then(res => setIsCaregiver(!!res.data?.is_caregiver))
      .catch(() => setIsCaregiver(false));
  }, []);

  useEffect(() => {
    base44.entities.Alert.filter({ status: 'active' }, '-created_date', 5)
      .then(setAlerts).catch(() => {});
  }, [location.pathname]);

  const visibleNavItems = navItems.filter(item => {
    if (item.path === '/caregiver') return isCaregiver;
    if (item.path === '/institution') return userRole === 'admin';
    return true;
  });

  const primaryPaths = [...bottomNavItems, ...circularNavItems].map(i => i.path).filter(p => p !== '__more__');
  const hamburgerItems = visibleNavItems.filter(item => !primaryPaths.includes(item.path));

  const handleLogout = async () => {
    await base44.auth.logout();
    window.location.href = '/login';
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-transparent">
      <MedicationReminderManager />
      <WakeWordListener />
      <OfflineCheckInSync />
      <CriticalAlertAlarm />
      <BluetoothSyncWorker />
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-4 top-4 bottom-4 w-64 flex-col bg-card/60 backdrop-blur-xl rounded-3xl border border-white/10 z-40">
        <div className="p-6 pb-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-tiva-teal flex items-center justify-center">
              <span className="text-[#0A0F0D] font-heading font-bold text-lg">T</span>
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl text-navy leading-none">Tiva</h1>
              <p className="text-[10px] text-muted-foreground mt-1 tracking-wide uppercase">Health Companion</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-lavender text-navy'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-navy'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] ${active ? 'text-navy' : ''}`} strokeWidth={2} />
                {item.label}
                {item.label === 'Emergency' && alerts.length > 0 && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-destructive animate-pulse-soft" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-9 h-9 rounded-full bg-mint flex items-center justify-center text-navy font-semibold text-sm">
              {userName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-navy truncate">{userName}</p>
              <p className="text-[10px] text-muted-foreground">Patient Account</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={2} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-card/60 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-tiva-teal flex items-center justify-center">
            <span className="text-[#0A0F0D] font-heading font-bold text-base">T</span>
          </div>
          <h1 className="font-heading font-bold text-lg text-navy">Tiva</h1>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center"
          >
            {mobileOpen ? <X className="w-5 h-5 text-navy" /> : <Menu className="w-5 h-5 text-navy" />}
          </button>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 animate-fade-in" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="absolute right-0 top-0 bottom-0 w-72 bg-card p-5 overflow-y-auto scrollbar-thin animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <span className="font-heading font-bold text-lg text-navy">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                <X className="w-5 h-5 text-navy" />
              </button>
            </div>
            <nav className="space-y-1">
              {hamburgerItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                      active ? 'bg-lavender text-navy' : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={2} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <button
              onClick={handleLogout}
              className="w-full mt-4 flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen">
        <div className="p-4 pb-24 lg:p-8 lg:pb-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-2">
        <div
          className="flex items-center justify-around rounded-3xl px-2 py-2.5"
          style={{
            background: 'linear-gradient(135deg, rgba(64,201,162,0.15) 0%, rgba(15,22,20,0.82) 35%, rgba(10,15,13,0.88) 100%)',
            backdropFilter: 'blur(32px) saturate(200%)',
            WebkitBackdropFilter: 'blur(32px) saturate(200%)',
            border: '1px solid rgba(64,201,162,0.18)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 60px rgba(64,201,162,0.12), inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(64,201,162,0.08)',
          }}
        >
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = item.path !== '__more__' && isActive(item.path);
            if (item.path === '__more__') {
              return (
                <button
                  key="more"
                  onClick={() => setShowCircularNav(true)}
                  className="flex flex-col items-center gap-1 px-2 py-1.5 transition-all text-tiva-teal"
                >
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(64,201,162,0.22) 0%, rgba(64,201,162,0.08) 100%)',
                      border: '1px solid rgba(64,201,162,0.4)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.25), 0 0 20px rgba(64,201,162,0.25), inset 0 1px 1px rgba(255,255,255,0.12), inset 0 -1px 1px rgba(64,201,162,0.1)',
                    }}
                  >
                    <Icon className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <span className="text-[9px] font-semibold tracking-wide">More</span>
                </button>
              );
            }
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-1 px-2 py-1.5 transition-all"
              >
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300"
                  style={active ? {
                    background: 'linear-gradient(135deg, rgba(64,201,162,0.2) 0%, rgba(64,201,162,0.05) 100%)',
                    border: '1px solid rgba(64,201,162,0.35)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.2), 0 0 16px rgba(64,201,162,0.18), inset 0 1px 1px rgba(255,255,255,0.1), inset 0 -1px 1px rgba(64,201,162,0.08)',
                  } : {
                    border: '1px solid transparent',
                  }}
                >
                  <Icon
                    className="w-5 h-5 transition-all"
                    strokeWidth={active ? 2.5 : 2}
                    style={active ? { color: '#40C9A2', filter: 'drop-shadow(0 0 6px rgba(64,201,162,0.3))' } : { color: 'rgba(255,255,255,0.4)' }}
                  />
                </div>
                <span
                  className="text-[9px] font-semibold tracking-wide transition-colors"
                  style={active ? { color: '#40C9A2' } : { color: 'rgba(255,255,255,0.4)' }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Circular More Menu */}
      <CircularNavModal open={showCircularNav} onClose={() => setShowCircularNav(false)} />
    </div>
  );
}