import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CloudRain, Thermometer, Wind } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useMbongo } from '../context/MbongoContext';

export const WeatherView: React.FC = () => {
  const { t, formatDate, formatNumber, language } = useI18n();
  const { plots, weather, loadingAgro } = useMbongo();

  const activePlot = plots[0];

  if (!weather) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        {loadingAgro ? t('common.loading') : 'Seleccione uma parcela para consultar os dados meteorológicos.'}
      </div>
    );
  }

  const comparisonData = [
    ...weather.observedHistory.days.slice(-7).map((d) => ({
      date: d.date.slice(5),
      observedMm: d.precipMm,
      forecastMm: null as number | null,
    })),
    ...weather.forecast.daily.map((d) => ({
      date: d.date.slice(5),
      observedMm: null as number | null,
      forecastMm: d.precipMm,
    })),
  ];

  const latestObserved = weather.observedHistory.days[weather.observedHistory.days.length - 1];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">{t('nav.weather')}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {activePlot
              ? `${activePlot.name} · ${activePlot.centerLat.toFixed(3)}, ${activePlot.centerLng.toFixed(3)}`
              : 'Coordenadas da localização'}
          </p>
        </div>
        <div className="text-xs font-medium text-slate-600">
          Fazenda Boa Esperança · Tomate
        </div>
      </div>

      {/* Latest Observed Conditions (NASA POWER) */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              {language === 'en' ? 'Recent Observed Agroclimatic Conditions' : 'Observação Agroclimática Recente'}
            </h2>
            <p className="text-xs text-slate-500">
              {t('common.source')}: {weather.observedHistory.source} · {t('common.period')}:{' '}
              {weather.observedHistory.period} ·{' '}
              <strong>{weather.observedHistory.isDemo ? 'Demonstração' : 'Observado Real'}</strong>
            </p>
          </div>
          <span className="text-xs text-slate-500">
            {t('common.updated')}: {formatDate(weather.observedHistory.updatedAt)}
          </span>
        </div>

        {latestObserved && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Thermometer className="h-3.5 w-3.5" />
                <span>Temp. Média / Máx</span>
              </div>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900">
                {formatNumber(latestObserved.tempMeanC, 1)} °C{' '}
                <span className="text-xs font-normal text-slate-500">
                  ({latestObserved.tempMinC}–{latestObserved.tempMaxC}°C)
                </span>
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <CloudRain className="h-3.5 w-3.5" />
                <span>Precipitação ({latestObserved.date})</span>
              </div>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900">
                {formatNumber(latestObserved.precipMm, 1)} mm
              </p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Humidade Relativa</span>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900">
                {latestObserved.humidityPct} %
              </p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Wind className="h-3.5 w-3.5" />
                <span>Vento / Radiação</span>
              </div>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900">
                {formatNumber(latestObserved.windSpeedMs, 1)} m/s
                {latestObserved.solarRadiationMjM2 !== undefined && (
                  <span className="ml-1.5 text-xs font-normal text-slate-500">
                    · {latestObserved.solarRadiationMjM2} MJ/m²
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
        {weather.observedHistory.limitations && (
          <p className="mt-3 text-xs text-slate-500">{weather.observedHistory.limitations}</p>
        )}
      </section>

      {/* Observed vs Forecast Rainfall Chart */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              {t('weather.observedVsForecast')}
            </h2>
            <p className="text-xs text-slate-500">
              {t('common.unit')}: mm/dia · {t('common.source')}: {weather.observedHistory.source} &amp;{' '}
              {weather.forecast.source}
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit=" mm" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="observedMm" name="Observado (mm)" fill="#65A30D" radius={[4, 4, 0, 0]} />
              <Bar dataKey="forecastMm" name="Previsto (mm)" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 7-Day Daily + 24h Hourly Forecast */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Previsão Diária (7 dias)
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {weather.forecast.source} · {weather.forecast.isDemo ? 'Modo Demonstração' : 'Previsão'}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 font-medium">Data</th>
                  <th className="py-2 font-medium text-right">Tmin / Tmáx (°C)</th>
                  <th className="py-2 font-medium text-right">Chuva (mm)</th>
                  <th className="py-2 font-medium text-right">Humidade (%)</th>
                  <th className="py-2 font-medium text-right">Vento (m/s)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {weather.forecast.daily.map((d) => (
                  <tr key={d.date}>
                    <td className="py-2.5 font-sans font-medium text-slate-800">{formatDate(d.date)}</td>
                    <td className="py-2.5 text-right text-slate-700">
                      {d.tempMinC}° / {d.tempMaxC}°
                    </td>
                    <td className="py-2.5 text-right font-semibold text-lime-700">
                      {formatNumber(d.precipMm, 1)}
                    </td>
                    <td className="py-2.5 text-right text-slate-600">{d.humidityPct}%</td>
                    <td className="py-2.5 text-right text-slate-600">{d.windSpeedMs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CHIRPS Pentad Series */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Série de Precipitação CHIRPS
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {weather.chirpsRainfall.source} · {weather.chirpsRainfall.resolution} · Unidade: mm
          </p>
          <div className="mt-3 h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weather.chirpsRainfall.pentads} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="observedMm" name="Período actual (mm)" fill="#65A30D" radius={[3, 3, 0, 0]} />
                <Bar dataKey="climatologyAvgMm" name="Média histórica (mm)" fill="#CBD5E1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Hourly Forecast Strip */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-display text-base font-semibold text-slate-900">
          Previsão Horária (Próximas 24h)
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Intervalos de 3 horas · Unidades: °C, mm, %, m/s · {weather.forecast.isDemo ? 'Demonstração' : 'Previsão'}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {weather.forecast.hourly.map((h) => (
            <div key={h.time} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-center">
              <div className="font-mono text-xs font-medium text-slate-500">{h.time}</div>
              <div className="mt-1 font-mono text-base font-semibold text-slate-900">{h.tempC}°C</div>
              <div className="mt-0.5 font-mono text-xs text-lime-700">{h.precipMm} mm</div>
              <div className="mt-0.5 font-mono text-[11px] text-slate-500">{h.humidityPct}%</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
