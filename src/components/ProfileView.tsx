import React from 'react';
import { LogOut, RefreshCw, ShieldCheck, WifiOff } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useMbongo } from '../context/MbongoContext';
import { LanguageSelector } from './LanguageSelector';
import type { UserRole } from '../types/mbongo';

export const ProfileView: React.FC = () => {
  const { t, formatDate } = useI18n();
  const {
    profile,
    updateProfile,
    logout,
    isOnline,
    simulatedOffline,
    setSimulatedOffline,
    pendingQueue,
    lastSyncAt,
    syncNow,
  } = useMbongo();

  if (!profile) return null;

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">{t('nav.profile')}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {profile.fullName} · {profile.province}, {profile.municipality}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 min-h-[40px]"
        >
          <LogOut className="h-4 w-4" />
          <span>Terminar sessão</span>
        </button>
      </div>

      {/* Language Preferences */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="font-display text-base font-semibold text-slate-900">
          Preferência de Idioma (Aplicação, Alertas e USSD)
        </h2>
        <LanguageSelector
          onLanguageChanged={(lang) => {
            updateProfile({ preferredLanguage: lang });
          }}
        />
      </section>

      {/* Role & Privacy */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-lime-700" />
          <h2 className="font-display text-base font-semibold text-slate-900">
            Conta, Privacidade e Notificações
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <span className="text-xs text-slate-500">Telemóvel (Privado · USSD)</span>
            <p className="mt-0.5 font-mono font-medium text-slate-900">
              {profile.phoneNumber}{' '}
              <span className="text-xs text-slate-500">
                ({profile.phoneVerified ? 'Verificado' : 'Não verificado'})
              </span>
            </p>
          </div>
          <div>
            <label className="block text-xs text-slate-500">Perfil activo</label>
            <select
              value={profile.role}
              onChange={(e) => updateProfile({ role: e.target.value as UserRole })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[40px]"
            >
              <option value="farmer">{t('auth.roleFarmer')}</option>
              <option value="technician">{t('auth.roleTechnician')}</option>
              <option value="admin">{t('auth.roleAdmin')}</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 space-y-2 text-xs text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={profile.consentNotifications}
              onChange={(e) => updateProfile({ consentNotifications: e.target.checked })}
              className="rounded border-slate-300"
            />
            <span>Receber alertas prioritários na aplicação e preparar alertas SMS quando disponíveis</span>
          </label>
          <p className="text-slate-500">
            Modo de sessão: {profile.isDemoSession ? 'Demonstração local' : 'Autenticação Google + Firestore'} ·
            Política de retenção: pode exportar GeoJSON e eliminar parcelas a qualquer momento.
          </p>
        </div>
      </section>

      {/* Offline & Sync Controls */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Conectividade Offline e Sincronização PWA
            </h2>
            <p className="text-xs text-slate-500">
              Estado actual: <strong>{isOnline ? t('common.onlineSynced') : 'Offline'}</strong> ·
              Última sincronização: {lastSyncAt ? formatDate(lastSyncAt) : 'Local'} · Fila:{' '}
              {pendingQueue.length}
            </p>
          </div>
          <button
            type="button"
            onClick={syncNow}
            disabled={!isOnline}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-40"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{t('common.syncNow')}</span>
          </button>
        </div>

        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={simulatedOffline}
            onChange={(e) => setSimulatedOffline(e.target.checked)}
            className="rounded border-slate-300"
          />
          <WifiOff className="h-3.5 w-3.5 text-slate-500" />
          <span>Simular falta de Internet (para testar consulta em cache e fila offline)</span>
        </label>
      </section>
    </div>
  );
};
