import React, { useState } from 'react';
import { BookOpen, CheckCircle2, Info } from 'lucide-react';
import { INITIAL_GLOSSARY_TERMS } from '../i18n/glossary';
import { useI18n } from '../i18n/I18nContext';
import { useMbongo } from '../context/MbongoContext';

export const RecommendationsAndGlossaryView: React.FC<{ initialTab?: 'recs' | 'glossary' }> = ({
  initialTab = 'recs',
}) => {
  const { t, language, formatDate } = useI18n();
  const { recommendations, alerts } = useMbongo();
  const [tab, setTab] = useState<'recs' | 'glossary'>(initialTab);
  const [search, setSearch] = useState('');

  const filteredTerms = INITIAL_GLOSSARY_TERMS.filter((term) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      term.termPt.toLowerCase().includes(q) ||
      term.termEn.toLowerCase().includes(q) ||
      term.termKg.toLowerCase().includes(q) ||
      term.definitionPt.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">
            {tab === 'recs' ? t('nav.recommendations') : t('nav.glossary')}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {tab === 'recs'
              ? 'Regras práticas para apoiar decisões no cultivo de tomate.'
              : 'Termos agrícolas e climáticos explicados em linguagem simples.'}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab('recs')}
            className={`rounded-md px-3.5 py-2 text-xs font-medium min-h-[38px] ${
              tab === 'recs' ? 'bg-white text-slate-900' : 'text-slate-600'
            }`}
          >
            {t('nav.recommendations')}
          </button>
          <button
            type="button"
            onClick={() => setTab('glossary')}
            className={`rounded-md px-3.5 py-2 text-xs font-medium min-h-[38px] ${
              tab === 'glossary' ? 'bg-white text-slate-900' : 'text-slate-600'
            }`}
          >
            {t('nav.glossary')}
          </button>
        </div>
      </div>

      {tab === 'recs' ? (
        <div className="space-y-6">

          <div className="grid grid-cols-1 items-stretch gap-5 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 md:grid-cols-12">
            <div className="overflow-hidden rounded-xl border border-slate-200 md:col-span-4">
              <img
                src="/images/inspecao_agricultor.png"
                alt="Inspecção no terreno pelo agricultor"
                referrerPolicy="no-referrer"
                className="h-40 w-full object-cover md:h-full"
              />
            </div>
            <div className="flex flex-col justify-center space-y-2 md:col-span-8">
              <div className="flex items-center gap-2 text-xs font-semibold text-violet-700">
                <Info className="h-4 w-4" />
                <span>Como ler estas recomendações</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-700">
                Cada recomendação explica o motivo com base na chuva e temperatura da sua parcela. Não substituem a visita presencial ao talhão nem dão diagnósticos automáticos de pragas.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div key={rec.id} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    {rec.plotName} · {formatDate(rec.dataDate)}
                  </span>
                  <span className="font-medium text-slate-800">
                    Prioridade {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Média' : 'Normal'}
                  </span>
                </div>
                <h2 className="font-display text-lg font-semibold text-slate-900">{rec.title}</h2>
                <p className="text-sm text-slate-700">{rec.explanation}</p>

                <div className="rounded-lg border border-lime-200 bg-lime-50/60 p-3 text-sm text-slate-900">
                  <div className="flex items-center gap-1.5 font-semibold text-lime-800">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Acção sugerida</span>
                  </div>
                  <p className="mt-1">{rec.suggestedAction}</p>
                </div>

                <p className="border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                  {rec.justificationData} · Fonte: {rec.source} · {rec.confidenceNote}
                </p>
              </div>
            ))}
          </div>

          {alerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Alertas Activos ({alerts.length})
              </h3>
              <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                {alerts.map((a) => (
                  <div key={a.id} className="p-4 text-sm">
                    <div className="text-xs text-slate-500">
                      {a.plotName} · {formatDate(a.dataDate)}
                    </div>
                    <div className="mt-0.5 font-semibold text-slate-900">{a.title}</div>
                    <div className="text-slate-600">{a.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar termo (NDVI, chuva, USSD, nuvens...)"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-violet-600 focus:outline-none min-h-[44px]"
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredTerms.map((term) => {
              const title =
                language === 'en'
                  ? term.termEn
                  : language === 'kg'
                  ? term.termKg
                  : term.termPt;
              const def =
                language === 'en'
                  ? term.definitionEn
                  : language === 'kg'
                  ? term.definitionKg
                  : term.definitionPt;

              return (
                <div key={term.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5 font-medium text-violet-700">
                      <BookOpen className="h-3.5 w-3.5" />
                      {term.category}
                    </span>
                    {language === 'kg' && (
                      <span>
                        Kikongo: {term.kgStatus === 'validated' ? 'Validado' : 'Em revisão'}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-base font-semibold text-slate-900">{title}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{def}</p>
                  <div className="border-t border-slate-100 pt-2 text-xs text-slate-500">
                    PT: {term.termPt} · EN: {term.termEn} · KG: {term.termKg}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
