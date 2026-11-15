import React, { useState } from 'react';
import {
  BookOpen,
  Bot,
  Calendar,
  CloudSun,
  Home,
  Map as MapIcon,
  Menu,
  PhoneCall,
  Satellite,
  Settings2,
  Sprout,
  User as UserIcon,
  WifiOff,
  X,
} from 'lucide-react';
import { I18nProvider, useI18n } from './i18n/I18nContext';
import { MbongoProvider, useMbongo } from './context/MbongoContext';
import { OnboardingAccess } from './components/OnboardingAccess';
import { DashboardView } from './components/DashboardView';
import { AiAdvisorView } from './components/AiAdvisorView';
import { AgriculturalMapView } from './components/AgriculturalMapView';
import { WeatherView } from './components/WeatherView';
import { SatelliteView } from './components/SatelliteView';
import { CalendarAndHarvestsView } from './components/CalendarAndHarvestsView';
import { RecommendationsAndGlossaryView } from './components/RecommendationsAndGlossaryView';
import { AdminAndUssdView } from './components/AdminAndUssdView';
import { ProfileView } from './components/ProfileView';
import { LanguageSelector } from './components/LanguageSelector';
import { PWAInstallButton } from './components/PWAInstallButton';

type TabId =
  | 'dashboard'
  | 'ai'
  | 'map'
  | 'weather'
  | 'satellite'
  | 'calendar'
  | 'harvests'
  | 'recommendations'
  | 'glossary'
  | 'admin'
  | 'profile';

const MbongoShell: React.FC = () => {
  const { t, language, formatDate } = useI18n();
  const { authReady, profile, isOnline, pendingQueue, lastSyncAt, syncNow, updateProfile } =
    useMbongo();

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [ussdJumpSignal, setUssdJumpSignal] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-500">
        {t('common.loading')}
      </div>
    );
  }

  if (!profile || !profile.onboardingCompleted) {
    return <OnboardingAccess />;
  }

  const navItems: { id: TabId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: Home },
    { id: 'ai', label: t('nav.aiAdvisor'), icon: Bot },
    { id: 'map', label: t('nav.map'), icon: MapIcon },
    { id: 'weather', label: t('nav.weather'), icon: CloudSun },
    { id: 'satellite', label: t('nav.satellite'), icon: Satellite },
    { id: 'calendar', label: t('nav.calendar'), icon: Calendar },
    { id: 'harvests', label: t('nav.harvests'), icon: Sprout },
    { id: 'recommendations', label: t('nav.recommendations'), icon: Settings2 },
    { id: 'glossary', label: t('nav.glossary'), icon: BookOpen },
    { id: 'admin', label: t('nav.admin'), icon: Settings2 },
    { id: 'profile', label: t('nav.profile'), icon: UserIcon },
  ];

  const activeNav = navItems.find((n) => n.id === activeTab) || navItems[0];

  const handleSelectTab = (id: string) => {
    setActiveTab(id as TabId);
    setMobileMenuOpen(false);
  };

  const handleOpenUssdSim = () => {
    setUssdJumpSignal((n) => n + 1);
    setActiveTab('admin');
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 bg-slate-50/40">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-6">
          <img src="/icon.svg" alt="MBONGO" className="h-7 w-7 rounded-md" />
          <span className="font-display text-lg font-bold tracking-tight text-slate-900">
            MBONGO
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-lime-50 text-lime-900'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-lime-700' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4 text-xs text-slate-500 space-y-1">
          <div className="font-medium text-slate-800 truncate">{profile.fullName}</div>
          <div className="truncate">
            {profile.role} · {profile.isDemoSession ? 'Demo' : 'Cloud'}
          </div>
          {pendingQueue.length > 0 && (
            <button
              type="button"
              onClick={syncNow}
              className="mt-1 text-left font-medium text-violet-700 hover:underline"
            >
              {pendingQueue.length} {t('common.pendingSync')}
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex flex-1 flex-col lg:pl-64 pb-20 lg:pb-0">
        {/* Top Bar (3 zones: Breadcrumb/Title, Status/Language, Primary Install/Sync Action) */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:h-16">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/icon.svg" alt="MBONGO" className="h-7 w-7 rounded-md lg:hidden" />
            <span className="text-sm font-semibold text-slate-900 truncate">
              {activeNav.label}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="hidden md:inline text-xs text-slate-500">
              {isOnline
                ? t('common.onlineSynced')
                : `Offline (${lastSyncAt ? formatDate(lastSyncAt) : 'Local'})`}
            </span>
            <button
              type="button"
              onClick={handleOpenUssdSim}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors min-h-[38px] ${
                activeTab === 'admin'
                  ? 'border-lime-600 bg-lime-50 text-lime-900'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              <PhoneCall className="h-3.5 w-3.5 text-lime-700 shrink-0" />
              <span className="hidden sm:inline">{t('nav.ussdSim')}</span>
              <span className="sm:hidden">USSD</span>
            </button>
            <LanguageSelector
              compact
              onLanguageChanged={(lang) => updateProfile({ preferredLanguage: lang })}
            />
            <PWAInstallButton />
          </div>
        </header>

        {/* Honest Connectivity & Language Validation Notices */}
        {!isOnline && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 sm:px-6">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>
                {t('common.offlineBanner')} Última sincronização:{' '}
                {lastSyncAt ? formatDate(lastSyncAt) : 'Cache inicial'}.
              </span>
            </div>
            {pendingQueue.length > 0 && (
              <span className="font-mono font-medium">
                {pendingQueue.length} {t('common.pendingSync')}
              </span>
            )}
          </div>
        )}

        {language === 'kg' && (
          <div className="border-b border-violet-200 bg-violet-50/60 px-4 py-2 text-xs text-violet-900 sm:px-6">
            {t('common.kgReviewNotice')}
          </div>
        )}

        {/* Viewport Container */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {activeTab === 'dashboard' && <DashboardView onNavigate={handleSelectTab} />}
          {activeTab === 'ai' && <AiAdvisorView />}
          {activeTab === 'map' && <AgriculturalMapView />}
          {activeTab === 'weather' && <WeatherView />}
          {activeTab === 'satellite' && <SatelliteView />}
          {activeTab === 'calendar' && <CalendarAndHarvestsView initialTab="calendar" />}
          {activeTab === 'harvests' && <CalendarAndHarvestsView initialTab="harvests" />}
          {activeTab === 'recommendations' && (
            <RecommendationsAndGlossaryView initialTab="recs" />
          )}
          {activeTab === 'glossary' && (
            <RecommendationsAndGlossaryView initialTab="glossary" />
          )}
          {activeTab === 'admin' && <AdminAndUssdView requestedTabSignal={ussdJumpSignal} />}
          {activeTab === 'profile' && <ProfileView />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Thumb Zone) */}
      <nav
        aria-label="Navegação móvel"
        className="fixed bottom-0 left-0 right-0 z-40 grid h-16 grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur-sm lg:hidden"
      >
        {[
          { id: 'dashboard', label: t('nav.dashboard'), icon: Home },
          { id: 'ai', label: t('nav.aiAdvisor'), icon: Bot },
          { id: 'map', label: t('nav.map'), icon: MapIcon },
          { id: 'weather', label: t('nav.weather'), icon: CloudSun },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectTab(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                active ? 'text-lime-700' : 'text-slate-500'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate max-w-[64px]">{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMobileMenuOpen((v) => !v)}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-600"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span>{language === 'en' ? 'More' : 'Mais'}</span>
        </button>
      </nav>

      {/* Mobile More Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/40 lg:hidden">
          <div className="rounded-t-2xl border-t border-slate-200 bg-white p-4 pb-8 space-y-2 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-display text-sm font-semibold text-slate-900">MBONGO</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left text-xs font-medium min-h-[44px] ${
                      activeTab === item.id
                        ? 'border-lime-600 bg-lime-50 text-slate-900'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <I18nProvider>
      <MbongoProvider>
        <MbongoShell />
      </MbongoProvider>
    </I18nProvider>
  );
}
