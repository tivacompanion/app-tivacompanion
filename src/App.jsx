import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import PWAManager from '@/components/PWAManager';
import ProtectedRoute from '@/components/ProtectedRoute';
import PostLoginRedirect from '@/components/PostLoginRedirect';
// Add page imports here
import Home from './pages/Home';
import Chat from './pages/Chat';
import Medications from './pages/Medications';
import HealthTracking from './pages/HealthTracking';
import MedicalVault from './pages/MedicalVault';
import Appointments from './pages/Appointments';
import Emergency from './pages/Emergency';
import PredictiveCare from './pages/PredictiveCare';
import Wellness from './pages/Wellness';
import Memory from './pages/Memory';
import Family from './pages/Family';
import MessagingHub from './pages/MessagingHub';
import CaregiverDashboard from './pages/CaregiverDashboard';
import InstitutionPortal from './pages/InstitutionPortal';
import Subscription from './pages/Subscription';
import Settings from './pages/Settings';
import BluetoothSettings from './pages/BluetoothSettings';
import MonthlyCheckInPage from './pages/MonthlyCheckInPage';
import AcceptInvite from './pages/AcceptInvite';
import Onboarding from './pages/Onboarding';
import OnboardingGuard from './components/OnboardingGuard';
import RoleGuard from './components/RoleGuard';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import EmergencySnapshot from './pages/EmergencySnapshot';
import WallpaperGenerator from './pages/WallpaperGenerator';
import InstitutionLogin from './pages/InstitutionLogin';
import RequestInstitution from './pages/RequestInstitution';
import AcceptInstitutionInvite from './pages/AcceptInstitutionInvite';
import AcceptAdminInvite from './pages/AcceptAdminInvite';
import InstitutionPatientDetail from './pages/InstitutionPatientDetail';
import InstitutionReports from './pages/InstitutionReports';
import Profile from './pages/Profile';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-tiva-teal flex items-center justify-center animate-pulse-soft">
            <span className="text-[#0A0F0D] font-heading font-bold text-xl">T</span>
          </div>
          <div className="w-8 h-8 rounded-full animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: 'rgba(64,201,162,0.2)', borderTopColor: '#40C9A2' }} />
          <p className="text-sm text-muted-foreground">Loading Tiva...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/institution-login" element={<InstitutionLogin />} />
      <Route path="/request-institution" element={<RequestInstitution />} />
      <Route path="/emergency-snapshot/:qrCodeId" element={<EmergencySnapshot />} />
      <Route path="/accept-institution-invite" element={<AcceptInstitutionInvite />} />
      <Route path="/accept-admin-invite" element={<AcceptAdminInvite />} />
      <Route path="/auth-redirect" element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/auth-redirect" element={<PostLoginRedirect />} />
      </Route>
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<OnboardingGuard />}>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/medications" element={<Medications />} />
          <Route path="/health" element={<HealthTracking />} />
          <Route path="/vault" element={<MedicalVault />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route path="/predictions" element={<PredictiveCare />} />
          <Route path="/wellness" element={<Wellness />} />
          <Route path="/memory" element={<Memory />} />
          <Route path="/family" element={<Family />} />
          <Route path="/messages" element={<MessagingHub />} />
          <Route element={<RoleGuard role="caregiver" />}>
            <Route path="/caregiver" element={<CaregiverDashboard />} />
          </Route>
          <Route element={<RoleGuard role="admin" />}>
            <Route path="/institution" element={<InstitutionPortal />} />
            <Route path="/institution/reports" element={<InstitutionReports />} />
            <Route path="/institution/patient/:patientId" element={<InstitutionPatientDetail />} />
          </Route>
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/bluetooth" element={<BluetoothSettings />} />
          <Route path="/monthly-checkin" element={<MonthlyCheckInPage />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="/wallpaper" element={<WallpaperGenerator />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <PWAManager />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App