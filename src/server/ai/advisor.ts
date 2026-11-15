import { GoogleGenAI, type GenerateContentResponse } from '@google/genai';
import type { LanguageCode } from '../../types/mbongo';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface AiChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface AiFarmContext {
  farmName?: string;
  plotName?: string;
  province?: string;
  municipality?: string;
  areaHa?: number;
  plantingDate?: string;
  irrigationType?: string;
  rain7dObservedMm?: number;
  rain7dForecastMm?: number;
  maxTempForecastC?: number;
  latestNdvi?: number | null;
  activeRecommendations?: string[];
}

export async function runAgronomicAiChat(params: {
  message: string;
  history?: AiChatTurn[];
  language: LanguageCode;
  context?: AiFarmContext;
}): Promise<{ reply: string; model: string }> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      'Chave da API Gemini não configurada no servidor. Configure GEMINI_API_KEY nas definições de segredos.'
    );
  }

  const { message, history = [], language, context } = params;

  const langDirective =
    language === 'en'
      ? 'Respond in clear, practical English.'
      : language === 'kg'
      ? 'Respond in simple Portuguese (pt-AO) with clear Kikongo agricultural terms in parentheses when helpful, noting that Kikongo agronomic guidance is under review.'
      : 'Responde sempre em Português claro e prático de Angola (pt-AO), acessível para agricultores.';

  const systemInstruction = `
És o Assistente Agronómico MBONGO, focado exclusivamente numa única exploração agrícola e numa única cultura:
- Fazenda: ${context?.farmName || 'Fazenda Boa Esperança'} (${context?.municipality || 'Caála'}, ${context?.province || 'Huambo'})
- Cultura única: Tomate (variedade tutorada, ${context?.areaHa ?? 2.5} ha, rega: ${context?.irrigationType || 'gota-a-gota'})
- Talhão: ${context?.plotName || 'Talhão Principal — Tomate'}
- Data de plantação: ${context?.plantingDate || 'Ciclo em curso'}

Dados agroclimáticos actuais desta parcela:
- Chuva observada últimos 7 dias (NASA POWER): ${context?.rain7dObservedMm ?? 0} mm
- Chuva prevista próximos 7 dias: ${context?.rain7dForecastMm ?? 0} mm
- Temperatura máxima prevista: ${context?.maxTempForecastC ?? 26} °C
- Último índice foliar NDVI (satélite): ${context?.latestNdvi !== null && context?.latestNdvi !== undefined ? context.latestNdvi : 'Indisponível'}
- Recomendações activas do motor de regras: ${(context?.activeRecommendations || []).join(' | ') || 'Nenhuma prioritária no momento'}

Regras obrigatórias de resposta:
1. ${langDirective}
2. Dá recomendações práticas, accionáveis e explicáveis para o cultivo de TOMATE (rega na base sem molhar folhas, drenagem, cobertura morta, tutoramento, protecção contra calor intenso, inspecção das folhas inferiores).
3. Nunca menciones outras fazendas nem outras culturas além de Tomate na Fazenda Boa Esperança.
4. Distingue sempre o que é observação medida, o que é previsão (modo demonstração se aplicável) e o que é recomendação prática.
5. Nunca faças diagnósticos definitivos de pragas/doenças apenas a partir do NDVI; recomenda sempre confirmar visualmente no campo.
6. Sê conciso, bem estruturado em pontos curtos e directo à acção para hoje ou esta semana (máximo ~180 palavras, salvo pedido de detalhe).
`.trim();

  const chatHistory = history
    .slice(-12)
    .filter((h) => h.text && h.text.trim().length > 0)
    .map((h) => ({
      role: h.role,
      parts: [{ text: h.text.slice(0, 1500) }],
    }));

  const chat = ai.chats.create({
    model: 'gemini-4-hydrogen',
    config: {
      systemInstruction,
    },
    history: chatHistory,
  });

  const response: GenerateContentResponse = await chat.sendMessage({
    message: message.trim().slice(0, 1500),
  });

  const reply = (response.text || '').trim();
  if (!reply) {
    throw new Error('O assistente não devolveu resposta. Tente novamente.');
  }

  return {
    reply,
    model: 'gemini-4-hydrogen',
  };
}
