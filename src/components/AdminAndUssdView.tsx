import React, { useEffect, useState } from 'react';
import { Activity, Languages, PhoneCall, Server, Shield } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useMbongo } from '../context/MbongoContext';
import { UssdSimulatorBox } from './UssdSimulatorBox';
import type {
  IntegrationLogItem,
  ProviderStatus,
  TranslationStatus,
} from '../types/mbongo';

interface UssdAuditPayload {
  events: Array<{
    id: string;
    sessionId: string;
    phoneNumberMasked: string;
    input: string;
    menu: string;
    output: string;
    language: string;
    timestamp: string;
  }>;
  activities: Array<{
    id: string;
    phoneNumberMasked: string;
    activityType: string;
    note: string;
    timestamp: string;
  }>;
  activeSessionCount: number;
  gatewayConnected: boolean;
}

interface AdminAndUssdViewProps {
  requestedTabSignal?: number;
}

export const AdminAndUssdView: React.FC<AdminAndUssdViewProps> = ({ requestedTabSignal }) => {
  const { entries, updateTranslationEntry } = useI18n();
  const { profile, farms, plots, pendingQueue } = useMbongo();

  const [tab, setTab] = useState<'ussd' | 'translations' | 'integrations'>('ussd');
  const [ussdAudit, setUssdAudit] = useState<UssdAuditPayload | null>(null);

  useEffect(() => {
    if (requestedTabSignal !== undefined && requestedTabSignal > 0) {
      setTab('ussd');
    }
  }, [requestedTabSignal]);

  // Translation workbench filter
  const [statusFilter, setStatusFilter] = useState<'all' | TranslationStatus>('all');
  const [trSearch, setTrSearch] = useState('');

  // Provider status & logs
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [logs, setLogs] = useState<IntegrationLogItem[]>([]);
  const [demoMode, setDemoMode] = useState(true);

  const loadProviders = async () => {
    try {
      const res = await fetch('/api/providers/status');
      if (res.ok) {
        const data = (await res.json()) as {
          demoMode: boolean;
          providers: ProviderStatus[];
          logs: IntegrationLogItem[];
        };
        setDemoMode(data.demoMode);
        setProviders(data.providers);
        setLogs(data.logs);
      }
    } catch {
      // ignore offline
    }
  };

  const loadUssdAudit = async () => {
    try {
      const res = await fetch('/api/ussd/audit');
      if (res.ok) {
        setUssdAudit((await res.json()) as UssdAuditPayload);
      }
    } catch {
      // ignore offline
    }
  };

  useEffect(() => {
    loadProviders();
    loadUssdAudit();
  }, []);

  const toggleDemoMode = async (next: boolean) => {
    setDemoMode(next);
    try {
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoMode: next }),
      });
      loadProviders();
    } catch {
      // ignore
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    const q = trSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      e.key.toLowerCase().includes(q) ||
      e.ptAO.toLowerCase().includes(q) ||
      e.en.toLowerCase().includes(q) ||
      e.kg.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-violet-700">
            <Shield className="h-3.5 w-3.5" />
            <span>Administração e Acesso USSD</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-semibold text-slate-900">
            Simulador USSD, Traduções e Fontes de Dados
          </h1>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab('ussd')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium min-h-[38px] ${
              tab === 'ussd' ? 'bg-white text-slate-900' : 'text-slate-600'
            }`}
          >
            <PhoneCall className="h-3.5 w-3.5" />
            <span>Simulador USSD</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('translations')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium min-h-[38px] ${
              tab === 'translations' ? 'bg-white text-slate-900' : 'text-slate-600'
            }`}
          >
            <Languages className="h-3.5 w-3.5" />
            <span>Traduções &amp; Kikongo</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('integrations')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium min-h-[38px] ${
              tab === 'integrations' ? 'bg-white text-slate-900' : 'text-slate-600'
            }`}
          >
            <Server className="h-3.5 w-3.5" />
            <span>Fontes &amp; Logs</span>
          </button>
        </div>
      </div>

      {/* Quick Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-xs text-slate-500">Fazenda · Cultura</span>
          <p className="mt-1 font-display text-base font-semibold text-slate-900 truncate">
            {farms[0]?.name || 'Fazenda Boa Esperança'} · {plots[0]?.currentCrop || 'Tomate'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-xs text-slate-500">Kikongo validado</span>
          <p className="mt-1 font-mono text-xl font-semibold text-slate-900">
            {entries.filter((e) => e.status === 'validated').length} / {entries.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-xs text-slate-500">Interacções USSD</span>
          <p className="mt-1 font-mono text-xl font-semibold text-slate-900">
            {ussdAudit?.events.length ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <span className="text-xs text-slate-500">Fila Offline</span>
          <p className="mt-1 font-mono text-xl font-semibold text-slate-900">
            {pendingQueue.length}
          </p>
        </div>
      </div>

      {tab === 'ussd' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Interactive USSD Phone Simulator */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 lg:col-span-5">
            <UssdSimulatorBox
              defaultPhone={profile?.phoneNumber || '+244923456789'}
              gatewayConnected={ussdAudit?.gatewayConnected}
              onSessionStep={loadUssdAudit}
            />
          </div>

          {/* Human-readable USSD Case Study & Audit */}
          <div className="space-y-5 lg:col-span-7">
            <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Como funciona o USSD na Fazenda Boa Esperança
              </h3>
              <p className="text-sm text-slate-600">
                Um agricultor no campo sem Internet móvel marca <strong className="font-mono">*384*12#</strong> no telemóvel básico e navega por números para consultar chuva, alertas do tomateiro ou registar uma rega.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 font-medium">Passo</th>
                      <th className="py-2 font-medium">O que o servidor recebe</th>
                      <th className="py-2 font-medium">Resposta ao telemóvel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-2.5 font-medium">1. Marcação</td>
                      <td className="py-2.5">Número do telemóvel + código da sessão</td>
                      <td className="py-2.5">Menu inicial no idioma preferido</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium">2. Navegação</td>
                      <td className="py-2.5">Opção numérica (1 a 6)</td>
                      <td className="py-2.5">Resumo curto (até 160 caracteres)</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium">3. Ligação Operadora</td>
                      <td className="py-2.5 font-mono">POST /api/webhooks/ussd</td>
                      <td className="py-2.5">Texto CON (continuar) ou END (fechar)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Registo de Sessões USSD
              </h3>
              {!ussdAudit || ussdAudit.events.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  Utilize o simulador ao lado para testar uma sessão e ver o histórico aqui.
                </p>
              ) : (
                <div className="mt-3 max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {ussdAudit.events.slice(0, 12).map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between py-2.5">
                      <span className="text-slate-700">
                        Telemóvel {ev.phoneNumberMasked} · opção <strong>{ev.input}</strong> ({ev.language})
                      </span>
                      <span className="font-mono text-slate-500">{ev.timestamp.slice(11, 19)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {tab === 'translations' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <input
              type="search"
              value={trSearch}
              onChange={(e) => setTrSearch(e.target.value)}
              placeholder="Filtrar texto..."
              className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm min-h-[40px]"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | TranslationStatus)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium min-h-[40px]"
            >
              <option value="all">Todos os estados</option>
              <option value="validated">Validado</option>
              <option value="in_review">Em revisão</option>
              <option value="untranslated">Por traduzir</option>
            </select>
          </div>

          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {filteredEntries.map((entry) => (
              <div key={entry.key} className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-800">{entry.module}</span>
                  <span>
                    Revisor: {entry.reviewerName} · {entry.updatedAt}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500">
                      Português (pt-AO)
                    </label>
                    <input
                      type="text"
                      value={entry.ptAO}
                      onChange={(e) => updateTranslationEntry(entry.key, { ptAO: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500">English (en)</label>
                    <input
                      type="text"
                      value={entry.en}
                      onChange={(e) => updateTranslationEntry(entry.key, { en: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500">
                      Kikongo (kg) — {entry.status === 'validated' ? 'Validado' : entry.status === 'in_review' ? 'Em revisão' : 'Por traduzir'}
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="text"
                        value={entry.kg}
                        onChange={(e) => updateTranslationEntry(entry.key, { kg: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs"
                      />
                      <select
                        value={entry.status}
                        onChange={(e) =>
                          updateTranslationEntry(entry.key, {
                            status: e.target.value as TranslationStatus,
                            reviewerName: profile?.fullName || 'Revisor MBONGO',
                          })
                        }
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                      >
                        <option value="untranslated">Por traduzir</option>
                        <option value="in_review">Em revisão</option>
                        <option value="validated">Validado</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'integrations' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Modo da Plataforma: {demoMode ? 'Demonstração' : 'Produção'}
              </h2>
              <p className="text-xs text-slate-500">
                Fontes sem credenciais no servidor mostram dados simulados identificados.
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleDemoMode(!demoMode)}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100"
            >
              Alternar para {demoMode ? 'Produção' : 'Demonstração'}
            </button>
          </div>

          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {providers.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <span className="text-xs font-medium text-slate-500">
                    {p.mode === 'live'
                      ? 'Ligado (Dados Reais)'
                      : p.mode === 'demo'
                      ? 'Modo Demonstração'
                      : 'Adaptador Preparado'}
                  </span>
                  <h3 className="mt-0.5 text-sm font-semibold text-slate-900">{p.name}</h3>
                  <p className="text-xs text-slate-600">{p.notes}</p>
                </div>
              </div>
            ))}
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-violet-600" />
              <h3 className="font-display text-base font-semibold text-slate-900">
                Registos de Ligações Externas
              </h3>
            </div>
            {logs.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">Sem consultas registadas ainda.</p>
            ) : (
              <div className="mt-3 divide-y divide-slate-100 text-xs">
                {logs.map((l) => (
                  <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="text-slate-800">{l.message}</span>
                    <span className="font-mono text-slate-500">
                      {l.latencyMs}ms · {l.timestamp.slice(11, 19)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
