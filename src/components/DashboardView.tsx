import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Calendar,
  CloudRain,
  Compass,
  Info,
  RefreshCw,
  Satellite,
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useMbongo } from '../context/MbongoContext';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { t, formatDate, formatNumber, language } = useI18n();
  const {
    profile,
    farms,
    plots,
    weather,
    satellite,
    recommendations,
    alerts,
    calendarEvents,
    loadingAgro,
    refreshAgroData,
  } = useMbongo();

  const activePlot = plots[0];
  const activeFarm = farms[0];

  const obsRain7d = weather
    ? weather.observedHistory.days.slice(-7).reduce((s, d) => s + d.precipMm, 0)
    : 0;
  const fcRain7d = weather
    ? weather.forecast.daily.reduce((s, d) => s + d.precipMm, 0)
    : 0;

  const latestUsableSat = satellite?.observations
    .filter((o) => o.usable && o.ndviMean !== null)
    .slice(-1)[0];

  const pendingTasks = calendarEvents
    .filter((e) => e.status === 'pending')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const daysSincePlanting = activePlot?.plantingDate
    ? Math.max(
        1,
        Math.round((Date.now() - new Date(activePlot.plantingDate).getTime()) / 86400000)
      )
    : 42;

  const topRec = recommendations[0];

  return (
    <div className="space-y-8">
      {/* Greeting & Farm Context */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {activeFarm
              ? `${activeFarm.name} · ${activeFarm.municipality}, ${activeFarm.province}`
              : profile?.province || 'Angola'}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {t('dashboard.greeting')}, {profile?.fullName?.split(' ')[0] || 'Produtor'}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            {language === 'en'
              ? 'Practical daily summary for your Tomato crop.'
              : 'Acompanhamento simples e diário da sua plantação de Tomate.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('ai')}
            className="inline-flex items-center gap-2 rounded-lg bg-lime-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-lime-700 min-h-[44px]"
          >
            <Bot className="h-4 w-4" />
            <span>{language === 'en' ? 'Ask AI Advisor' : 'Conversar com IA'}</span>
          </button>
          <button
            type="button"
            onClick={refreshAgroData}
            disabled={loadingAgro}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 min-h-[44px]"
          >
            <RefreshCw className={`h-4 w-4 ${loadingAgro ? 'animate-spin' : ''}`} />
            <span>{language === 'en' ? 'Refresh' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* Use Case Presentation Banner: 1 Farm + Tomato Cultivation Story */}
      <section className="grid grid-cols-1 items-stretch gap-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 lg:grid-cols-12">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white lg:col-span-5">
          <img
            src="/images/cultura_tomate_campo.png"
            alt="Plantação de tomate na Fazenda Boa Esperança"
            referrerPolicy="no-referrer"
            className="h-56 w-full object-cover lg:h-full lg:min-h-[240px]"
          />
        </div>

        <div className="flex flex-col justify-between space-y-4 lg:col-span-7">
          <div>
            <p className="text-xs font-semibold text-lime-700">
              Caso de Uso · {activeFarm?.name || 'Fazenda Boa Esperança'}
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-slate-900">
              {activePlot?.name || 'Talhão Principal — Tomate'} · Dia {daysSincePlanting} do ciclo
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {language === 'en'
                ? 'Instead of raw meteorological charts, MBONGO translates recent rainfall, forecast heat, and vegetation vigor into clear daily decisions for tomato growers.'
                : 'Em vez de mostrar apenas gráficos difíceis de ler, o MBONGO junta a chuva real da semana, a previsão do tempo e o estado das folhas para lhe dizer exactamente o que fazer hoje no tomateiro.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-xs font-medium text-slate-500">1. O que choveu</p>
              <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
                {formatNumber(obsRain7d, 1)} mm
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                Nos últimos 7 dias ({weather?.observedHistory.isDemo ? 'Demo' : 'NASA Real'}).
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-xs font-medium text-slate-500">2. O que vem aí</p>
              <p className="mt-1 font-mono text-lg font-semibold text-slate-900">
                {formatNumber(fcRain7d, 1)} mm
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                Previstos nos próximos 7 dias ({weather?.forecast.isDemo ? 'Demo' : 'Previsão'}).
              </p>
            </div>

            <div className="rounded-xl border border-lime-200 bg-lime-50/70 p-3.5">
              <p className="text-xs font-medium text-lime-800">3. Acção para hoje</p>
              <p className="mt-1 text-xs font-semibold leading-snug text-slate-900 line-clamp-3">
                {topRec?.suggestedAction ||
                  'Regar na base ao início da manhã e inspeccionar folhas inferiores.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4-column Clean Summary Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Cultura e Área</span>
            <Compass className="h-4 w-4 text-lime-700" />
          </div>
          <p className="mt-2 font-display text-lg font-semibold text-slate-900">
            {activePlot?.currentCrop || 'Tomate'} · {formatNumber(activePlot?.areaHa || 2.5, 1)} ha
          </p>
          <p className="mt-0.5 text-xs text-slate-500 truncate">
            {activePlot?.variety ? `Variedade ${activePlot.variety}` : 'Rega gota-a-gota'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Chuva 7d (Real)</span>
            <CloudRain className="h-4 w-4 text-slate-700" />
          </div>
          <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-slate-900">
            {formatNumber(obsRain7d, 1)} mm
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Prev. 7d: {formatNumber(fcRain7d, 1)} mm
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Vigor Foliar (NDVI)</span>
            <Satellite className="h-4 w-4 text-violet-600" />
          </div>
          <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-slate-900">
            {latestUsableSat?.ndviMean !== null && latestUsableSat?.ndviMean !== undefined
              ? formatNumber(latestUsableSat.ndviMean, 2)
              : '—'}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {latestUsableSat
              ? `${formatDate(latestUsableSat.acquisitionDate)} · ${latestUsableSat.cloudCoverPct}% nuvens`
              : 'A aguardar céu limpo'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Alertas Activos</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-slate-900">
            {alerts.length}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 truncate">
            {pendingTasks[0]
              ? `Próx.: ${formatDate(pendingTasks[0].date)}`
              : 'Sem tarefas pendentes'}
          </p>
        </div>
      </div>

      {/* Main 2-Column Decision Area */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                {t('dashboard.priorityAlerts')}
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('recommendations')}
                className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-900"
              >
                <span>Ver todas as recomendações</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-4 flex items-start gap-3">
                  {alert.level === 'warning' || alert.level === 'attention' ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  ) : (
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">
                      {formatDate(alert.dataDate)} · {alert.isDemoData ? 'Demonstração' : 'Observado'}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{alert.title}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              {t('dashboard.recentRecommendations')}
            </h2>

            <div className="space-y-3">
              {recommendations.slice(0, 2).map((rec) => (
                <div key={rec.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>{rec.ruleId} · {formatDate(rec.dataDate)}</span>
                    <span className="font-medium text-slate-800">
                      Prioridade {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Média' : 'Normal'}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{rec.title}</h3>
                  <p className="text-sm text-slate-600">{rec.explanation}</p>
                  <div className="rounded-lg bg-lime-50/70 px-3 py-2.5 text-sm text-slate-900">
                    <strong className="text-lime-800">O que fazer: </strong>
                    {rec.suggestedAction}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Field Inspection Visual + Forecast + Calendar */}
        <div className="space-y-6 lg:col-span-5">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <img
              src="/images/inspecao_agricultor.png"
              alt="Inspecção visual das folhas de tomate no campo"
              referrerPolicy="no-referrer"
              className="h-44 w-full object-cover"
            />
            <div className="p-4">
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Verificação no Terreno
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Os dados de satélite e meteorologia orientam o trabalho, mas a confirmação de pragas, fungos ou humidade faz-se olhando directamente para as folhas e o solo.
              </p>
            </div>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-slate-900">
                {t('dashboard.nextDaysForecast')}
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('weather')}
                className="text-xs font-medium text-violet-700 hover:text-violet-900"
              >
                Ver detalhe
              </button>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {(weather?.forecast.daily || []).slice(0, 5).map((d) => (
                <div key={d.date} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium text-slate-700">{formatDate(d.date)}</span>
                  <div className="flex items-center gap-4 font-mono tabular-nums text-xs">
                    <span className="text-slate-600">
                      {d.tempMinC}° / <strong className="text-slate-900">{d.tempMaxC}°C</strong>
                    </span>
                    <span className="w-16 text-right font-medium text-lime-700">
                      {formatNumber(d.precipMm, 1)} mm
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-slate-900">
                {t('dashboard.upcomingTasks')}
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('calendar')}
                className="text-xs font-medium text-violet-700 hover:text-violet-900"
              >
                Abrir calendário
              </button>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {pendingTasks.map((evt) => (
                <div key={evt.id} className="flex items-start gap-3 py-2.5">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-lime-700" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">{formatDate(evt.date)}</p>
                    <p className="text-sm font-medium text-slate-900">{evt.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
