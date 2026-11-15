import React, { useState } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Clock, Plus, Sprout } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useMbongo } from '../context/MbongoContext';
import type { CalendarActivityType, CalendarStatus, HarvestUnit } from '../types/mbongo';

const ACTIVITY_LABELS: Record<CalendarActivityType, string> = {
  land_prep: 'Preparação do terreno',
  sowing: 'Sementeira / Plantação',
  irrigation: 'Rega',
  fertilization: 'Aplicação de fertilizantes',
  treatment: 'Tratamentos',
  inspection: 'Inspecção de campo',
  harvest: 'Colheita',
  custom: 'Outra tarefa',
};

export const CalendarAndHarvestsView: React.FC<{ initialTab?: 'calendar' | 'harvests' }> = ({
  initialTab = 'calendar',
}) => {
  const { t, formatDate, formatNumber } = useI18n();
  const {
    plots,
    calendarEvents,
    harvestRecords,
    createCalendarEvent,
    updateCalendarStatus,
    createHarvestRecord,
  } = useMbongo();

  const [tab, setTab] = useState<'calendar' | 'harvests'>(initialTab);

  // Calendar form
  const [evtPlotId, setEvtPlotId] = useState(plots[0]?.id || '');
  const [evtDate, setEvtDate] = useState(new Date().toISOString().slice(0, 10));
  const [evtType, setEvtType] = useState<CalendarActivityType>('inspection');
  const [evtDesc, setEvtDesc] = useState('');
  const [evtNotify, setEvtNotify] = useState(true);

  // Harvest form
  const [harvPlotId, setHarvPlotId] = useState(plots[0]?.id || '');
  const [harvDate, setHarvDate] = useState(new Date().toISOString().slice(0, 10));
  const [harvQty, setHarvQty] = useState('');
  const [harvUnit, setHarvUnit] = useState<HarvestUnit>('kg');
  const [harvArea, setHarvArea] = useState('');
  const [harvLosses, setHarvLosses] = useState('');
  const [harvNotes, setHarvNotes] = useState('');

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const plot = plots.find((p) => p.id === (evtPlotId || plots[0]?.id));
    if (!plot) return;
    await createCalendarEvent({
      farmId: plot.farmId,
      plotId: plot.id,
      date: evtDate,
      type: evtType,
      description: evtDesc.trim(),
      status: 'pending',
      notify: evtNotify,
    });
    setEvtDesc('');
  };

  const handleAddHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    const plot = plots.find((p) => p.id === (harvPlotId || plots[0]?.id));
    if (!plot) return;
    await createHarvestRecord({
      farmId: plot.farmId,
      plotId: plot.id,
      crop: plot.currentCrop,
      harvestDate: harvDate,
      quantity: Number(harvQty) || 0,
      unit: harvUnit,
      harvestedAreaHa: Number(harvArea) || 0,
      lossesQuantity: harvLosses ? Number(harvLosses) : undefined,
      notes: harvNotes.trim(),
    });
    setHarvQty('');
    setHarvArea('');
    setHarvLosses('');
    setHarvNotes('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">
            {tab === 'calendar' ? t('nav.calendar') : t('nav.harvests')}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {tab === 'calendar' ? t('calendar.guidanceDisclaimer') : t('harvest.experimentalNotice')}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab('calendar')}
            className={`rounded-md px-3.5 py-2 text-xs font-medium transition-colors min-h-[38px] ${
              tab === 'calendar' ? 'bg-white text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('nav.calendar')}
          </button>
          <button
            type="button"
            onClick={() => setTab('harvests')}
            className={`rounded-md px-3.5 py-2 text-xs font-medium transition-colors min-h-[38px] ${
              tab === 'harvests' ? 'bg-white text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('nav.harvests')}
          </button>
        </div>
      </div>

      {tab === 'calendar' ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <form
            onSubmit={handleAddEvent}
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-4 lg:col-span-5 h-fit"
          >
            <h2 className="font-display text-base font-semibold text-slate-900">
              Nova Actividade Agrícola
            </h2>

            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
              <strong>Fazenda Boa Esperança</strong> · {plots[0]?.name || 'Talhão Principal — Tomate'}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Data</label>
                <input
                  type="date"
                  required
                  value={evtDate}
                  onChange={(e) => setEvtDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[42px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Tipo</label>
                <select
                  value={evtType}
                  onChange={(e) => setEvtType(e.target.value as CalendarActivityType)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[42px]"
                >
                  {Object.entries(ACTIVITY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Descrição</label>
              <textarea
                rows={3}
                required
                value={evtDesc}
                onChange={(e) => setEvtDesc(e.target.value)}
                placeholder="Ex.: Verificar humidade e estado da cultura..."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={evtNotify}
                onChange={(e) => setEvtNotify(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Lembrete na aplicação</span>
            </label>

            <button
              type="submit"
              disabled={plots.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-lime-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-lime-700 disabled:opacity-40 min-h-[44px]"
            >
              <Plus className="h-4 w-4" />
              <span>Registar Actividade</span>
            </button>
          </form>

          <div className="space-y-3 lg:col-span-7">
            {calendarEvents.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                Ainda não existem actividades registadas no calendário.
              </div>
            ) : (
              calendarEvents
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((evt) => {
                  const plot = plots.find((p) => p.id === evt.plotId);
                  return (
                    <div
                      key={evt.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <CalendarIcon className="h-3.5 w-3.5 text-lime-700" />
                          <span className="font-mono font-medium text-slate-800">
                            {formatDate(evt.date)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{plot?.name || 'Parcela'}</span>
                          <span aria-hidden="true">·</span>
                          <span>{ACTIVITY_LABELS[evt.type]}</span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-900">{evt.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          aria-label="Estado da actividade"
                          value={evt.status}
                          onChange={(e) =>
                            updateCalendarStatus(evt.id, e.target.value as CalendarStatus)
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium min-h-[38px]"
                        >
                          <option value="pending">Pendente</option>
                          <option value="completed">Concluída</option>
                          <option value="postponed">Adiada</option>
                        </select>
                        {evt.status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-lime-700" />
                        ) : (
                          <Clock className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <form
            onSubmit={handleAddHarvest}
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-4 lg:col-span-5 h-fit"
          >
            <h2 className="font-display text-base font-semibold text-slate-900">
              Registar Colheita
            </h2>

            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
              <strong>Fazenda Boa Esperança</strong> · {plots[0]?.name || 'Talhão Principal — Tomate'} (Tomate)
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Data da colheita</label>
                <input
                  type="date"
                  required
                  value={harvDate}
                  onChange={(e) => setHarvDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[42px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Área colhida (ha)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={harvArea}
                  onChange={(e) => setHarvArea(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono min-h-[42px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Quantidade colhida</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={harvQty}
                  onChange={(e) => setHarvQty(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono min-h-[42px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Unidade</label>
                <select
                  value={harvUnit}
                  onChange={(e) => setHarvUnit(e.target.value as HarvestUnit)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[42px]"
                >
                  <option value="kg">Quilogramas (kg)</option>
                  <option value="t">Toneladas (t)</option>
                  <option value="sacks">Sacos (50 kg aprox.)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Perdas registadas (opcional, na mesma unidade)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={harvLosses}
                onChange={(e) => setHarvLosses(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono min-h-[42px]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Observações</label>
              <input
                type="text"
                value={harvNotes}
                onChange={(e) => setHarvNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[42px]"
              />
            </div>

            <button
              type="submit"
              disabled={plots.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-lime-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-lime-700 disabled:opacity-40 min-h-[44px]"
            >
              <Sprout className="h-4 w-4" />
              <span>Guardar Registo de Colheita</span>
            </button>
          </form>

          <div className="space-y-3 lg:col-span-7">
            {harvestRecords.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                Sem registos de colheita até ao momento.
              </div>
            ) : (
              harvestRecords.map((rec) => {
                const plot = plots.find((p) => p.id === rec.plotId);
                const canComputeRate = rec.harvestedAreaHa > 0 && rec.quantity > 0;
                const kgEquivalent =
                  rec.unit === 't'
                    ? rec.quantity * 1000
                    : rec.unit === 'sacks'
                    ? rec.quantity * 50
                    : rec.quantity;
                const simpleYieldKgHa = canComputeRate
                  ? kgEquivalent / rec.harvestedAreaHa
                  : null;

                return (
                  <div key={rec.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span>
                        {formatDate(rec.harvestDate)} · {plot?.name || 'Parcela'} ·{' '}
                        <strong className="text-slate-800">{rec.crop}</strong>
                      </span>
                      {simpleYieldKgHa !== null && (
                        <span className="font-mono text-slate-700">
                          Indicador simples: {formatNumber(simpleYieldKgHa, 0)} kg/ha
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 font-mono text-lg font-semibold tabular-nums text-slate-900">
                      {formatNumber(rec.quantity, 1)} {rec.unit} em{' '}
                      {formatNumber(rec.harvestedAreaHa, 2)} ha
                    </p>
                    {rec.lossesQuantity !== undefined && rec.lossesQuantity > 0 && (
                      <p className="mt-0.5 text-xs text-amber-700">
                        Perdas registadas: {formatNumber(rec.lossesQuantity, 1)} {rec.unit}
                      </p>
                    )}
                    {rec.notes && <p className="mt-1 text-xs text-slate-600">{rec.notes}</p>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
