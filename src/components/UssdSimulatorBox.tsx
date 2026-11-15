import React, { useState } from 'react';
import { RotateCcw, Send } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import type { UssdSimResponse } from '../types/mbongo';

interface UssdSimulatorBoxProps {
  defaultPhone?: string;
  gatewayConnected?: boolean;
  onSessionStep?: () => void;
}

export const UssdSimulatorBox: React.FC<UssdSimulatorBoxProps> = ({
  defaultPhone = '+244923456789',
  gatewayConnected = false,
  onSessionStep,
}) => {
  const { language } = useI18n();
  const [simPhone, setSimPhone] = useState(defaultPhone);
  const [simSessionId, setSimSessionId] = useState(`ussd_${Date.now()}`);
  const [simInput, setSimInput] = useState('');
  const [simResp, setSimResp] = useState<UssdSimResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const sendUssdStep = async (inputOverride?: string) => {
    const stepText = inputOverride !== undefined ? inputOverride : simInput;
    setLoading(true);
    try {
      const res = await fetch('/api/ussd/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: simSessionId,
          phoneNumber: simPhone,
          text: stepText,
          preferredLanguage: language,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as UssdSimResponse;
        setSimResp(data);
        setSimInput('');
        onSessionStep?.();
      }
    } catch {
      // ignore offline
    } finally {
      setLoading(false);
    }
  };

  const resetUssdSession = () => {
    setSimSessionId(`ussd_${Date.now()}`);
    setSimResp(null);
    setSimInput('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Simulador USSD (*384*12#)
          </h2>
          <p className="text-xs text-slate-500">
            {gatewayConnected
              ? 'Ligado a gateway de operadora.'
              : 'Simulação local para telemóveis básicos sem Internet.'}
          </p>
        </div>
        <button
          type="button"
          onClick={resetUssdSession}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reiniciar</span>
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700">
          Telemóvel do agricultor
        </label>
        <input
          type="text"
          value={simPhone}
          onChange={(e) => setSimPhone(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono min-h-[40px]"
        />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-700 pb-2 font-mono text-[11px] text-slate-400">
          <span>USSD · {simResp ? simResp.mode : 'PRONTO'}</span>
          <span>
            {simResp ? `${simResp.charCount}/160 caracteres` : '*384*12#'}
          </span>
        </div>

        <pre className="mt-3 min-h-[170px] whitespace-pre-wrap font-mono text-xs leading-relaxed text-lime-300">
          {simResp
            ? simResp.message
            : 'Prima "Marcar *384*12#" para testar o menu como num telemóvel básico.'}
        </pre>

        {(!simResp || simResp.mode === 'CON') && (
          <div className="mt-3 flex gap-2 border-t border-slate-800 pt-3">
            {!simResp ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => sendUssdStep('')}
                className="w-full rounded-lg bg-lime-600 py-2.5 text-xs font-semibold text-white hover:bg-lime-700 disabled:opacity-50 min-h-[42px]"
              >
                Marcar *384*12#
              </button>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Opção (ex: 1)"
                  value={simInput}
                  onChange={(e) => setSimInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sendUssdStep();
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-xs text-white focus:border-lime-500 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => sendUssdStep()}
                  className="inline-flex items-center gap-1 rounded-lg bg-lime-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-lime-700 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Enviar</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {simResp && simResp.mode === 'CON' && (
        <div className="grid grid-cols-4 gap-1.5">
          {['1', '2', '3', '4', '5', '6', '0'].map((num) => (
            <button
              key={num}
              type="button"
              disabled={loading}
              onClick={() => sendUssdStep(num)}
              className="rounded-lg border border-slate-300 bg-white py-2 font-mono text-xs font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50 min-h-[38px]"
            >
              {num}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
