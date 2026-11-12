import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/lib/LanguageContext';
import {
  Home, MessageCircle, Pill, HeartPulse, FileText, Sparkles,
  Users, Siren, Stethoscope, User, CreditCard, Globe
} from 'lucide-react';

const navItems = [
  { path: '/', key: 'nav.home', icon: Home },
  { path: '/chat', key: 'nav.chat', icon: MessageCircle },
  { path: '/medications', key: 'nav.medications', icon: Pill },
  { path: '/health', key: 'nav.health', icon: HeartPulse },
  { path: '/vault', key: 'nav.vault', icon: FileText },
  { path: '/wellness', key: 'nav.wellness', icon: Sparkles },
  { path: '/family', key: 'nav.family', icon: Users },
  { path: '/caregiver', key: 'nav.caregiver', icon: Stethoscope },
  { path: '/emergency', key: 'nav.emergency', icon: Siren },
  { path: '/subscription', key: 'nav.subscription', icon: CreditCard },
  { path: '/profile', key: 'nav.profile', icon: User },
];

export default function Layout({ children }) {
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen bg-transparent">
      {/* Desktop Floating Sidebar */}
      <aside className="hidden lg:flex fixed left-4 top-4 bottom-4 w-64 flex-col z-40">
        <div className="flex-1 flex flex-col rounded-3xl px-4 py-6 backdrop-blur-xl" style={{ backgroundColor: 'rgba(15, 22, 20, 0.6)', boxShadow: 'var(--tiva-shadow)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 px-2 mb-8">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--tiva-teal)' }}>
              <span className="text-[#0A0F0D] font-heading font-bold text-xl">T</span>
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl leading-none" style={{ color: 'var(--tiva-navy)' }}>Tiva</h1>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--tiva-navy)', opacity: 0.5 }}>Predictive Health</p>
            </div>
          </Link>

          {/* Nav */}
          <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 group ${isActive ? '' : 'hover:bg-white/5'}`}
                  style={isActive ? { backgroundColor: 'var(--tiva-lavender)' } : {}}
                >
                  <Icon
                    size={20}
                    style={{ color: isActive ? 'var(--tiva-navy)' : 'var(--tiva-navy)', opacity: isActive ? 1 : 0.55 }}
                  />
                  <span
                    className="font-heading text-sm font-semibold"
                    style={{ color: 'var(--tiva-navy)', opacity: isActive ? 1 : 0.65 }}
                  >
                    {t(item.key)}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
            className="flex items-center gap-2 px-3 py-3 rounded-2xl transition-all duration-200 hover:bg-white/5 mt-2"
          >
            <Globe size={20} style={{ color: 'var(--tiva-navy)', opacity: 0.55 }} />
            <span className="font-heading text-sm font-semibold" style={{ color: 'var(--tiva-navy)', opacity: 0.65 }}>
              {language === 'en' ? 'English' : 'Français'}
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden sticky top-0 z-40 px-4 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--tiva-canvas)' }}>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--tiva-teal)' }}>
            <span className="text-[#0A0F0D] font-heading font-bold text-base">T</span>
          </div>
          <h1 className="font-heading font-bold text-lg" style={{ color: 'var(--tiva-navy)' }}>Tiva</h1>
        </Link>
        <button
          onClick={() => setLanguage(language === 'en' ? 'fr' : 'en')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl backdrop-blur-md"
          style={{ backgroundColor: 'rgba(15, 22, 20, 0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Globe size={16} style={{ color: 'var(--tiva-navy)' }} />
          <span className="font-heading text-xs font-semibold" style={{ color: 'var(--tiva-navy)' }}>
            {language === 'en' ? 'EN' : 'FR'}
          </span>
        </button>
      </header>

      {/* Main Content */}
      <main className="lg:ml-72 pb-24 lg:pb-8 min-h-screen">
        <div className="px-4 lg:px-8 py-4 lg:py-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-3">
        <div className="flex items-center justify-around rounded-3xl px-2 py-2 backdrop-blur-xl" style={{ backgroundColor: 'rgba(15, 22, 20, 0.6)', boxShadow: 'var(--tiva-shadow-lg)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {navItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-1 px-2 py-2 rounded-2xl transition-all duration-200"
                style={isActive ? { backgroundColor: 'var(--tiva-lavender)' } : {}}
              >
                <Icon size={20} style={{ color: 'var(--tiva-navy)', opacity: isActive ? 1 : 0.5 }} />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}