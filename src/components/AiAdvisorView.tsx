import React, { useRef, useState } from 'react';
import { Bot, CloudRain, Compass, RefreshCw, Satellite, Send, Sparkles, User } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useMbongo } from '../context/MbongoContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

function renderCleanChatText(text: string): React.ReactNode {
  return text.split('\n').map((line, lineIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <div key={lineIdx} className={line.trim() === '' ? 'h-2' : 'leading-relaxed'}>
        {parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return (
              <strong key={partIdx} className="font-semibold text-slate-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <React.Fragment key={partIdx}>{part}</React.Fragment>;
        })}
      </div>
    );
  });
}

const STARTER_PROMPTS_PT = [
  'Devo regar o tomateiro hoje com base na chuva da semana?',
  'Há risco de doenças nas folhas com a humidade prevista?',
  'O calor dos próximos dias pode afectar a floração do tomate?',
  'Que inspecção devo fazer hoje no talhão?',
];

const STARTER_PROMPTS_EN = [
  'Should I irrigate the tomato plot today based on recent rainfall?',
  'Is there fungal humidity risk on tomato leaves this week?',
  'Will upcoming temperatures stress tomato flowering?',
  'What field check should I do today?',
];

export const AiAdvisorView: React.FC = () => {
  const { language, formatNumber } = useI18n();
  const { farms, plots, weather, satellite, recommendations } = useMbongo();

  const activeFarm = farms[0];
  const activePlot = plots[0];

  const obsRain7d = weather
    ? Number(weather.observedHistory.days.slice(-7).reduce((s, d) => s + d.precipMm, 0).toFixed(1))
    : 0;
  const fcRain7d = weather
    ? Number(weather.forecast.daily.reduce((s, d) => s + d.precipMm, 0).toFixed(1))
    : 0;
  const maxTemp = weather
    ? Number(Math.max(...weather.forecast.daily.map((d) => d.tempMaxC)).toFixed(1))
    : 26;
  const latestNdvi = satellite?.observations
    .filter((o) => o.usable && o.ndviMean !== null)
    .slice(-1)[0]?.ndviMean ?? null;

  const initialGreeting: ChatMessage = {
    id: 'ai_welcome',
    role: 'model',
    text:
      language === 'en'
        ? `Hello! I am your MBONGO Tomato Advisor for ${activeFarm?.name || 'Fazenda Boa Esperança'}. Ask me about irrigation today, heat protection, leaf inspection, or how to interpret this week's weather and NDVI.`
        : `Olá! Sou o Assistente Agronómico da ${activeFarm?.name || 'Fazenda Boa Esperança'} para a sua plantação de Tomate. Pergunte-me se deve regar hoje, como proteger as flores do calor ou que cuidados ter nas folhas esta semana.`,
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const starters = language === 'en' ? STARTER_PROMPTS_EN : STARTER_PROMPTS_PT;

  const sendMessage = async (textOverride?: string) => {
    const content = (textOverride ?? input).trim();
    if (!content || sending) return;

    setErrorMsg(null);
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: content,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (!textOverride) setInput('');
    setSending(true);

    setTimeout(() => {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      const historyPayload = nextMessages
        .filter((m) => m.id !== 'ai_welcome' && m.id !== userMsg.id)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history: historyPayload,
          language,
          context: {
            farmName: activeFarm?.name || 'Fazenda Boa Esperança',
            plotName: activePlot?.name || 'Talhão Principal — Tomate',
            province: activeFarm?.province || 'Huambo',
            municipality: activeFarm?.municipality || 'Caála',
            areaHa: activePlot?.areaHa ?? 2.5,
            plantingDate: activePlot?.plantingDate || '',
            irrigationType: activePlot?.irrigationType || 'drip',
            rain7dObservedMm: obsRain7d,
            rain7dForecastMm: fcRain7d,
            maxTempForecastC: maxTemp,
            latestNdvi,
            activeRecommendations: recommendations.map((r) => `${r.title}: ${r.suggestedAction}`),
          },
        }),
      });

      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        setErrorMsg(data.error || 'Não foi possível obter resposta do assistente.');
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `m_${Date.now()}`,
          role: 'model',
          text: data.reply as string,
        },
      ]);

      setTimeout(() => {
        listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch {
      setErrorMsg('Sem ligação ao servidor para consultar o assistente.');
    } finally {
      setSending(false);
    }
  };

  const resetChat = () => {
    setMessages([initialGreeting]);
    setErrorMsg(null);
    setInput('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold text-violet-700">
            {activeFarm?.name || 'Fazenda Boa Esperança'} · Tomate ({formatNumber(activePlot?.areaHa || 2.5, 1)} ha)
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-slate-900">
            {language === 'en' ? 'AI Agronomic Advisor — Tomato' : 'Conversa com IA — Recomendações para Tomate'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {language === 'en'
              ? 'Ask questions using live rainfall, forecast, and vegetation vigor from your tomato plot.'
              : 'Tire dúvidas e receba recomendações práticas com base na chuva, temperatura e vigor do seu talhão de tomate.'}
          </p>
        </div>

        <button
          type="button"
          onClick={resetChat}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 min-h-[40px]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{language === 'en' ? 'New conversation' : 'Nova conversa'}</span>
        </button>
      </div>

      {/* Live Farm Context Strip */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-12">
        <div className="flex items-center gap-3 md:col-span-5">
          <img
            src="/images/inspecao_agricultor.png"
            alt="Cultivo de tomate na Fazenda Boa Esperança"
            referrerPolicy="no-referrer"
            className="h-16 w-20 shrink-0 rounded-lg border border-slate-200 object-cover"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {activePlot?.name || 'Talhão Principal — Tomate'}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {activeFarm?.municipality || 'Caála'}, {activeFarm?.province || 'Huambo'} · Rega gota-a-gota
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 md:col-span-7">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <CloudRain className="h-3.5 w-3.5 text-lime-700" />
              <span>Chuva 7d</span>
            </div>
            <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">
              {formatNumber(obsRain7d, 1)} mm
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Compass className="h-3.5 w-3.5 text-slate-600" />
              <span>Prev. 7d</span>
            </div>
            <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">
              {formatNumber(fcRain7d, 1)} mm
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <Satellite className="h-3.5 w-3.5 text-violet-600" />
              <span>NDVI</span>
            </div>
            <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">
              {latestNdvi !== null ? formatNumber(latestNdvi, 2) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Starter Questions */}
      <div className="flex flex-wrap gap-2">
        {starters.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={sending}
            onClick={() => sendMessage(prompt)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 hover:border-lime-600 hover:bg-lime-50/40 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-600" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* Conversation Container */}
      <div className="flex flex-col rounded-2xl border border-slate-200 bg-white">
        <div className="max-h-[430px] min-h-[280px] overflow-y-auto p-5 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'model' && (
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-1 ${
                  m.role === 'user'
                    ? 'bg-slate-900 text-white whitespace-pre-wrap'
                    : 'border border-slate-200 bg-slate-50 text-slate-800'
                }`}
              >
                {m.role === 'user' ? m.text : renderCleanChatText(m.text)}
              </div>

              {m.role === 'user' && (
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-700">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
                <Bot className="h-4 w-4" />
              </div>
              <span>A analisar os dados do talhão de tomate...</span>
            </div>
          )}
          <div ref={listEndRef} />
        </div>

        {errorMsg && (
          <div className="mx-5 mb-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
            {errorMsg}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2 border-t border-slate-200 bg-slate-50/50 p-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              language === 'en'
                ? 'Ask about watering, tomato care, or weather...'
                : 'Escreva a sua pergunta sobre o tomateiro...'
            }
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-lime-600 focus:outline-none min-h-[44px]"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-lime-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-lime-700 disabled:opacity-40 min-h-[44px]"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'en' ? 'Send' : 'Enviar'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
