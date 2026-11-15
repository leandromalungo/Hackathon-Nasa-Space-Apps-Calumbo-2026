import React, { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertCircle, Cloud, Satellite } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useMbongo } from '../context/MbongoContext';

export const SatelliteView: React.FC = () => {
  const { t, formatDate, formatNumber } = useI18n();
  const { plots, satellite, loadingAgro } = useMbongo();

  const activePlot = plots[0];
  const usableObs = (satellite?.observations || []).filter((o) => o.usable && o.ndviMean !== null);

  const [dateA, setDateA] = useState<string>('');
  const [dateB, setDateB] = useState<string>('');

  const obsA = usableObs.find((o) => o.id === dateA) || usableObs[0];
  const obsB = usableObs.find((o) => o.id === dateB) || usableObs[usableObs.length - 1];

  const delta =
    obsA?.ndviMean !== null &&
    obsA?.ndviMean !== undefined &&
    obsB?.ndviMean !== null &&
    obsB?.ndviMean !== undefined
      ? Number((obsB.ndviMean - obsA.ndviMean).toFixed(2))
      : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">{t('nav.satellite')}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {activePlot
              ? `${activePlot.name} (${activePlot.currentCrop})`
              : 'Monitorização satelital por talhão'}
          </p>
        </div>

        <div className="text-xs font-medium text-slate-600">
          Fazenda Boa Esperança · Tomate
        </div>
      </div>

      {/* Visual Context Pairing: Aerial View + Field Reality */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <img
            src="/images/vista_aerea_parcela.png"
            alt="Vista aérea do talhão agrícola"
            referrerPolicy="no-referrer"
            className="h-44 w-full object-cover"
          />
          <div className="p-4 text-xs text-slate-600">
            <strong className="text-slate-900">O que o satélite observa:</strong> cobertura verde das linhas de tomate vista de cima (resolução 10 metros).
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <img
            src="/images/inspecao_agricultor.png"
            alt="Inspecção manual das folhas de tomate"
            referrerPolicy="no-referrer"
            className="h-44 w-full object-cover"
          />
          <div className="p-4 text-xs text-slate-600">
            <strong className="text-slate-900">O que deve confirmar no campo:</strong> o NDVI mede vigor foliar, mas não identifica pragas nem fungos sem olhar as folhas.
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50/40 p-4 text-sm text-slate-800">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />
        <div>
          <p className="font-medium text-slate-900">{t('satellite.disclaimer')}</p>
          {satellite && (
            <p className="mt-1 text-xs text-slate-600">
              {t('common.source')}: {satellite.source} · {t('common.updated')}:{' '}
              {formatDate(satellite.updatedAt.slice(0, 10))} ·{' '}
              <strong>{satellite.isDemo ? 'Modo Demonstração' : 'Observado Sentinel-2'}</strong>
            </p>
          )}
        </div>
      </div>

      {!satellite ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          {loadingAgro ? t('common.loading') : 'Sem observações satelitais disponíveis.'}
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="pb-3">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Evolução da Vegetação (NDVI)
              </h2>
              <p className="text-xs text-slate-500">
                Unidade: índice de 0 a 1 · Imagens com muitas nuvens (&gt;40%) são omitidas.
              </p>
            </div>

            {usableObs.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                Não existem imagens recentes sem nuvens para calcular o NDVI.
              </div>
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usableObs} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="acquisitionDate" tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: '#475569' }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="ndviMean"
                      name="NDVI Médio"
                      stroke="#7C3AED"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#7C3AED' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {usableObs.length >= 2 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Comparação Entre Datas
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Data inicial</label>
                  <select
                    value={obsA?.id || ''}
                    onChange={(e) => setDateA(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[42px]"
                  >
                    {usableObs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {formatDate(o.acquisitionDate)} (NDVI {o.ndviMean})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Data de comparação</label>
                  <select
                    value={obsB?.id || ''}
                    onChange={(e) => setDateB(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[42px]"
                  >
                    {usableObs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {formatDate(o.acquisitionDate)} (NDVI {o.ndviMean})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col justify-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2">
                  <span className="text-xs text-slate-500">Variação observada</span>
                  <span className="font-mono text-xl font-semibold tabular-nums text-slate-900">
                    {delta !== null ? `${delta >= 0 ? '+' : ''}${formatNumber(delta, 2)}` : '—'}
                  </span>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Histórico de Passagens Satelitais
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 font-medium">Data</th>
                    <th className="py-2 font-medium">Satélite</th>
                    <th className="py-2 font-medium text-right">Nuvens</th>
                    <th className="py-2 font-medium text-right">NDVI</th>
                    <th className="py-2 font-medium">Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {satellite.observations.map((obs) => (
                    <tr key={obs.id}>
                      <td className="py-3 font-medium text-slate-900">
                        {formatDate(obs.acquisitionDate)}
                      </td>
                      <td className="py-3 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Satellite className="h-3.5 w-3.5 text-violet-600" />
                          {obs.sensor} · {obs.resolutionMeters}m
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono tabular-nums text-slate-700">
                        <span className="inline-flex items-center gap-1">
                          <Cloud className="h-3.5 w-3.5 text-slate-400" />
                          {obs.cloudCoverPct}%
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                        {obs.ndviMean !== null ? formatNumber(obs.ndviMean, 2) : 'N/D'}
                      </td>
                      <td className="py-3 text-slate-600">
                        {obs.usable
                          ? 'Imagem limpa utilizável'
                          : obs.reasonIfUnusable || t('satellite.cloudWarning')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
