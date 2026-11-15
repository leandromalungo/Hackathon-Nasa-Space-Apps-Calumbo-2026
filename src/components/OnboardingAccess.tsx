import React, { useState } from 'react';
import { ArrowRight, Check, MapPin, PhoneCall, ShieldCheck, Smartphone, X } from 'lucide-react';
import { ANGOLA_PROVINCES, findProvince } from '../data/angola';
import { useI18n } from '../i18n/I18nContext';
import { useMbongo } from '../context/MbongoContext';
import { LanguageSelector } from './LanguageSelector';
import { UssdSimulatorBox } from './UssdSimulatorBox';
import type { UserRole } from '../types/mbongo';

export const OnboardingAccess: React.FC = () => {
  const { t, language } = useI18n();
  const { profile, signInGoogle, registerDemoProfile, updateProfile, createFarm, createPlot, farms } =
    useMbongo();

  const [mode, setMode] = useState<'access' | 'demo_register' | 'farm_setup'>(
    profile && !profile.onboardingCompleted ? 'farm_setup' : 'access'
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showUssdModal, setShowUssdModal] = useState(false);

  // Registration fields
  const [fullName, setFullName] = useState('Mateus Katchiungo');
  const [phone, setPhone] = useState('+244923456789');
  const [role, setRole] = useState<UserRole>('farmer');
  const [province, setProvince] = useState('Huambo');
  const [municipality, setMunicipality] = useState('Caála');
  const [locality, setLocality] = useState('Calenga');
  const [consentData, setConsentData] = useState(true);
  const [consentNotif, setConsentNotif] = useState(true);

  // Demo OTP flow
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpMsg, setOtpMsg] = useState<string | null>(null);

  // Quick Farm + Plot Onboarding (Focused on Single Farm + Tomato)
  const [farmName, setFarmName] = useState('Fazenda Boa Esperança');
  const [plotName, setPlotName] = useState('Talhão Principal — Tomate');
  const [areaHa, setAreaHa] = useState('2.5');
  const [crop, setCrop] = useState('Tomate');
  const [plantingDate, setPlantingDate] = useState(
    new Date(Date.now() - 42 * 86400000).toISOString().slice(0, 10)
  );

  const selectedProv = findProvince(province);

  const handleProvinceChange = (nextProv: string) => {
    setProvince(nextProv);
    const provObj = findProvince(nextProv);
    setMunicipality(provObj.municipalities[0] || provObj.capital);
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setSubmitting(true);
    try {
      await signInGoogle();
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Não foi possível iniciar sessão com Google neste momento.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestOtp = async () => {
    setOtpMsg(null);
    try {
      const res = await fetch('/api/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setOtpMsg(data.error || 'Erro ao pedir código OTP.');
        return;
      }
      setOtpRequested(true);
      setOtpMsg(data.message || 'Código OTP enviado.');
    } catch {
      setOtpRequested(true);
      setOtpMsg('Modo demonstração: utilize o código de teste 123456.');
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, code: otpCode }),
      });
      const data = (await res.json()) as { verified?: boolean; error?: string };
      if (res.ok && data.verified) {
        setOtpVerified(true);
        setOtpMsg('Número verificado (Modo Demonstração).');
      } else {
        setOtpMsg(data.error || 'Código inválido.');
      }
    } catch {
      if (otpCode.trim() === '123456') {
        setOtpVerified(true);
        setOtpMsg('Número verificado localmente.');
      }
    }
  };

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentData) {
      setAuthError('É necessário aceitar o consentimento de tratamento dos dados agrícolas.');
      return;
    }
    registerDemoProfile({
      fullName: fullName.trim() || 'Agricultor MBONGO',
      phoneNumber: phone.trim(),
      phoneVerified: otpVerified,
      role,
      province,
      municipality,
      locality,
      preferredLanguage: language,
      consentNotifications: consentNotif,
      consentDataProcessing: consentData,
      onboardingCompleted: true,
    });
  };

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const provObj = findProvince(profile?.province || province);
      let targetFarmId = farms[0]?.id;
      if (!targetFarmId) {
        const createdFarm = await createFarm({
          name: farmName.trim() || 'Fazenda Boa Esperança',
          province: profile?.province || province,
          municipality: profile?.municipality || municipality,
          locality: profile?.locality || locality,
          lat: provObj.lat,
          lng: provObj.lng,
          responsibleName: profile?.fullName || fullName,
          approxAreaHa: Number(areaHa) || 2.5,
        });
        targetFarmId = createdFarm.id;
      }

      const ha = Math.max(0.2, Number(areaHa) || 2.5);
      const d = 0.0015;
      const poly = {
        type: 'Feature',
        properties: { name: plotName },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [provObj.lng - d, provObj.lat - d],
              [provObj.lng + d, provObj.lat - d],
              [provObj.lng + d, provObj.lat + d],
              [provObj.lng - d, provObj.lat + d],
              [provObj.lng - d, provObj.lat - d],
            ],
          ],
        },
      };

      await createPlot({
        farmId: targetFarmId,
        name: plotName.trim() || 'Talhão Principal — Tomate',
        code: 'T-01',
        geometryGeoJson: JSON.stringify(poly),
        centerLat: provObj.lat,
        centerLng: provObj.lng,
        areaHa: ha,
        currentCrop: crop,
        plantingDate,
        irrigationType: 'drip',
        status: 'active',
      });

      await updateProfile({ onboardingCompleted: true });
    } finally {
      setSubmitting(false);
    }
  };

  if (profile && !profile.onboardingCompleted && mode === 'farm_setup') {
    return (
      <div className="min-h-screen bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <p className="text-xs font-medium text-violet-700">MBONGO · Configuração Inicial</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                {language === 'en'
                  ? 'Set up your Tomato farm'
                  : 'Configure a sua fazenda de Tomate'}
              </h1>
            </div>
            <LanguageSelector compact />
          </div>

          <form onSubmit={handleCompleteOnboarding} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-800">
                  {language === 'en' ? 'Farm name' : 'Nome da fazenda'}
                </label>
                <input
                  type="text"
                  required
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-lime-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-800">
                  {language === 'en' ? 'Plot name' : 'Nome do talhão'}
                </label>
                <input
                  type="text"
                  required
                  value={plotName}
                  onChange={(e) => setPlotName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-lime-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-800">
                  {language === 'en' ? 'Crop' : 'Cultura única'}
                </label>
                <input
                  type="text"
                  readOnly
                  value={crop}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-800">
                  {language === 'en' ? 'Planting date' : 'Data de plantação'}
                </label>
                <input
                  type="date"
                  value={plantingDate}
                  onChange={(e) => setPlantingDate(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-lime-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-800">
                  {language === 'en' ? 'Area (ha)' : 'Área aproximada (ha)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={areaHa}
                  onChange={(e) => setAreaHa(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono focus:border-lime-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-lime-600 px-5 py-3 text-sm font-semibold text-white hover:bg-lime-700 disabled:opacity-50 min-h-[44px]"
              >
                <span>
                  {language === 'en' ? 'Open farm summary' : 'Abrir painel da fazenda'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => updateProfile({ onboardingCompleted: true })}
                className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[44px]"
              >
                {language === 'en' ? 'Use example Tomato farm' : 'Usar fazenda de exemplo (Tomate)'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="MBONGO" className="h-9 w-9 rounded-lg" />
            <span className="font-display text-xl font-bold tracking-tight text-slate-900">
              MBONGO
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowUssdModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 min-h-[38px]"
            >
              <PhoneCall className="h-3.5 w-3.5 text-lime-700" />
              <span>{t('nav.ussdSim')}</span>
            </button>
            <LanguageSelector compact />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          {/* Left Hero Context + Replaceable PNG Image */}
          <div className="flex flex-col justify-between space-y-6 lg:col-span-6">
            <div className="space-y-4">
              <p className="text-xs font-medium text-violet-700">
                Caso de Uso · Fazenda Boa Esperança (Tomate)
              </p>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                {t('auth.welcomeTitle')}
              </h1>
              <p className="text-base leading-relaxed text-slate-600">
                {t('auth.welcomeSubtitle')}
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <img
                src="/images/fazenda_tomate_capa.png"
                alt="Plantação de tomate na Fazenda Boa Esperança em Angola"
                referrerPolicy="no-referrer"
                className="h-64 w-full object-cover sm:h-72"
              />
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                Acompanhamento prático do cultivo de tomate: chuva real, rega na base, alertas e USSD sem Internet.
              </div>
            </div>
          </div>

          {/* Right Onboarding & Auth Panel */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 lg:col-span-6">
            {mode === 'access' ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {t('auth.chooseLanguage')}
                  </h2>
                  <div className="mt-3">
                    <LanguageSelector />
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-5 space-y-3">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {language === 'en' ? '2. Sign in or open case study' : '2. Entrar na plataforma'}
                  </h2>

                  {authError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800">
                      {authError}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleGoogleSignIn}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors min-h-[48px]"
                  >
                    <ShieldCheck className="h-4 w-4 text-lime-400" />
                    <span>{t('auth.signInGoogle')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('demo_register')}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors min-h-[48px]"
                  >
                    <Smartphone className="h-4 w-4 text-violet-600" />
                    <span>{t('auth.registerDemo')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {t('auth.registerDemo')}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Acesso directo ao caso de uso da Fazenda Boa Esperança (Tomate).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('access')}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    {t('common.cancel')}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700">
                      {t('auth.fullName')}
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-lime-600 focus:outline-none min-h-[42px]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700">
                      {t('auth.phone')}
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono focus:border-lime-600 focus:outline-none min-h-[42px]"
                      />
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 whitespace-nowrap shrink-0 min-h-[42px]"
                      >
                        {otpRequested ? 'Reenviar OTP' : 'Validar OTP'}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">{t('auth.phonePrivacy')}</p>
                  </div>

                  {otpRequested && (
                    <div className="sm:col-span-2 rounded-lg border border-violet-200 bg-violet-50/50 p-3 space-y-2">
                      <p className="text-xs font-medium text-violet-900">{t('auth.otpDemoTitle')}</p>
                      {otpMsg && <p className="text-xs text-slate-600">{otpMsg}</p>}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="123456"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="w-36 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Confirmar</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      {t('auth.role')}
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[42px]"
                    >
                      <option value="farmer">{t('auth.roleFarmer')}</option>
                      <option value="technician">{t('auth.roleTechnician')}</option>
                      <option value="admin">{t('auth.roleAdmin')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      {t('auth.province')}
                    </label>
                    <select
                      value={province}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[42px]"
                    >
                      {ANGOLA_PROVINCES.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      {t('auth.municipality')}
                    </label>
                    <select
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[42px]"
                    >
                      {selectedProv.municipalities.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      {t('auth.locality')}
                    </label>
                    <input
                      type="text"
                      value={locality}
                      onChange={(e) => setLocality(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[42px]"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-1 text-xs text-slate-600">
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={consentData}
                      onChange={(e) => setConsentData(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-lime-600"
                    />
                    <span>
                      Aceito o tratamento dos dados da exploração para recomendações agrícolas.
                    </span>
                  </label>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={consentNotif}
                      onChange={(e) => setConsentNotif(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-lime-600"
                    />
                    <span>Autorizo alertas na aplicação e no simulador USSD.</span>
                  </label>
                </div>

                {authError && <p className="text-xs text-red-700">{authError}</p>}

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-600 px-4 py-3 text-sm font-semibold text-white hover:bg-lime-700 min-h-[48px]"
                >
                  <MapPin className="h-4 w-4" />
                  <span>{t('auth.continueOnboarding')}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {showUssdModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.ussdSim')}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowUssdModal(false)}
                aria-label={t('common.close')}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <UssdSimulatorBox defaultPhone={phone} />
          </div>
        </div>
      )}
    </div>
  );
};
