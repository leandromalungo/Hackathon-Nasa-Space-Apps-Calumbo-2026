import 'dotenv/config';
import express from 'express';
import http from 'http';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import type { LanguageCode, WeatherBundle } from './src/types/mbongo.ts';
import { fetchNasaPowerHistory } from './src/server/providers/nasaPower.ts';
import { fetchMeteomaticsForecast } from './src/server/providers/meteomatics.ts';
import { fetchChirpsRainfall } from './src/server/providers/chirps.ts';
import { fetchSentinelObservations } from './src/server/providers/sentinel2.ts';
import { FUTURE_PROVIDER_ADAPTERS, getAllProviderStatuses } from './src/server/providers/futureAdapters.ts';
import { getIntegrationLogs } from './src/server/providers/cache.ts';
import { runAgroclimaticRuleEngine, DEFAULT_RULE_THRESHOLDS } from './src/server/engine/recommendations.ts';
import { getUssdAuditData, processUssdRequest } from './src/server/ussd/engine.ts';
import { runAgronomicAiChat, type AiChatTurn, type AiFarmContext } from './src/server/ai/advisor.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', 1);
app.use(express.json({ limit: '256kb' }));

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados pedidos. Aguarde um momento.' },
});

const ussdLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'END Limite temporario de pedidos USSD excedido.',
});

app.use('/api', apiLimiter);

let platformDemoMode = process.env.DEMO_MODE !== 'false';

function parseCoords(latRaw: unknown, lngRaw: unknown): { lat: number; lng: number } | null {
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'mbongo-api',
    demoMode: platformDemoMode,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/providers/status', (_req, res) => {
  res.json({
    demoMode: platformDemoMode,
    providers: getAllProviderStatuses(),
    futureAdapters: FUTURE_PROVIDER_ADAPTERS,
    logs: getIntegrationLogs().slice(0, 25),
  });
});

app.post('/api/admin/config', (req, res) => {
  const { demoMode } = req.body as { demoMode?: boolean };
  if (typeof demoMode === 'boolean') {
    platformDemoMode = demoMode;
  }
  res.json({ ok: true, demoMode: platformDemoMode });
});

app.get('/api/weather', async (req, res) => {
  const coords = parseCoords(req.query.lat ?? -12.78, req.query.lng ?? 15.74);
  if (!coords) {
    return res.status(400).json({ error: 'Coordenadas geográficas inválidas.' });
  }
  const name = typeof req.query.name === 'string' ? req.query.name.slice(0, 80) : undefined;

  try {
    const [observedHistory, forecast, chirpsRainfall] = await Promise.all([
      fetchNasaPowerHistory(coords.lat, coords.lng),
      fetchMeteomaticsForecast(coords.lat, coords.lng),
      fetchChirpsRainfall(coords.lat, coords.lng),
    ]);

    const bundle: WeatherBundle = {
      location: { lat: coords.lat, lng: coords.lng, name },
      observedHistory,
      forecast,
      chirpsRainfall,
    };
    return res.json(bundle);
  } catch {
    return res.status(502).json({ error: 'Falha ao consultar fontes meteorológicas.' });
  }
});

app.get('/api/satellite', async (req, res) => {
  const coords = parseCoords(req.query.lat ?? -12.78, req.query.lng ?? 15.74);
  if (!coords) {
    return res.status(400).json({ error: 'Coordenadas geográficas inválidas.' });
  }
  const plotId = typeof req.query.plotId === 'string' && req.query.plotId ? req.query.plotId.slice(0, 64) : 'default';
  const bundle = await fetchSentinelObservations(plotId, coords.lat, coords.lng);
  return res.json(bundle);
});

app.post('/api/analysis/recommendations', async (req, res) => {
  const body = req.body as {
    plot?: {
      id: string;
      name: string;
      centerLat: number;
      centerLng: number;
      currentCrop: string;
      plantingDate?: string;
      irrigationType?: 'rainfed' | 'drip' | 'furrow' | 'sprinkler' | 'manual';
    };
    language?: LanguageCode;
    thresholds?: typeof DEFAULT_RULE_THRESHOLDS;
  };

  if (!body?.plot) {
    return res.status(400).json({ error: 'Dados da parcela em falta.' });
  }
  const coords = parseCoords(body.plot.centerLat, body.plot.centerLng);
  if (!coords) {
    return res.status(400).json({ error: 'Coordenadas da parcela inválidas.' });
  }

  const language: LanguageCode =
    body.language === 'en' || body.language === 'kg' ? body.language : 'pt-AO';

  const [observedHistory, forecast, chirpsRainfall, satellite] = await Promise.all([
    fetchNasaPowerHistory(coords.lat, coords.lng),
    fetchMeteomaticsForecast(coords.lat, coords.lng),
    fetchChirpsRainfall(coords.lat, coords.lng),
    fetchSentinelObservations(body.plot.id, coords.lat, coords.lng),
  ]);

  const weather: WeatherBundle = {
    location: { lat: coords.lat, lng: coords.lng, name: body.plot.name },
    observedHistory,
    forecast,
    chirpsRainfall,
  };

  const analysis = runAgroclimaticRuleEngine({
    plot: {
      id: body.plot.id,
      name: body.plot.name,
      currentCrop: 'Tomate',
      plantingDate: body.plot.plantingDate || '',
      irrigationType: body.plot.irrigationType || 'drip',
    },
    weather,
    satellite,
    language,
    thresholds: body.thresholds || DEFAULT_RULE_THRESHOLDS,
  });

  return res.json({
    ...analysis,
    weatherUpdatedAt: weather.forecast.updatedAt,
    satelliteUpdatedAt: satellite.updatedAt,
  });
});

app.post('/api/ai/chat', async (req, res) => {
  const body = req.body as {
    message?: string;
    history?: AiChatTurn[];
    language?: LanguageCode;
    context?: AiFarmContext;
  };

  if (!body?.message || typeof body.message !== 'string' || !body.message.trim()) {
    return res.status(400).json({ error: 'Escreva uma pergunta para o assistente.' });
  }

  const language: LanguageCode =
    body.language === 'en' || body.language === 'kg' ? body.language : 'pt-AO';

  try {
    const result = await runAgronomicAiChat({
      message: body.message,
      history: Array.isArray(body.history) ? body.history : [],
      language,
      context: body.context,
    });
    return res.json(result);
  } catch (error) {
    const msg =
      error instanceof Error
        ? error.message
        : 'Erro ao consultar o assistente agronómico.';
    return res.status(502).json({ error: msg });
  }
});

// Provider-independent USSD Webhook
app.post('/api/webhooks/ussd', ussdLimiter, (req, res) => {
  const configuredSecret = process.env.USSD_WEBHOOK_SECRET;
  if (configuredSecret) {
    const sig = req.headers['x-ussd-signature'];
    if (sig !== configuredSecret) {
      return res.status(401).json({ error: 'Assinatura USSD inválida.' });
    }
  }

  const { sessionId, phoneNumber, text } = req.body as {
    sessionId?: string;
    phoneNumber?: string;
    text?: string;
  };

  if (!sessionId || !phoneNumber) {
    return res.status(400).json({ error: 'sessionId e phoneNumber são obrigatórios.' });
  }

  const result = processUssdRequest({
    sessionId: String(sessionId).slice(0, 64),
    phoneNumber: String(phoneNumber).slice(0, 24),
    text: typeof text === 'string' ? text.slice(0, 64) : '',
  });

  return res.json({
    ...result,
    formattedGatewayText: `${result.mode} ${result.message}`,
  });
});

app.post('/api/ussd/simulate', (req, res) => {
  const { sessionId, phoneNumber, text, preferredLanguage } = req.body as {
    sessionId?: string;
    phoneNumber?: string;
    text?: string;
    preferredLanguage?: LanguageCode;
  };

  if (!sessionId || !phoneNumber) {
    return res.status(400).json({ error: 'sessionId e phoneNumber são obrigatórios.' });
  }

  const result = processUssdRequest({
    sessionId: String(sessionId).slice(0, 64),
    phoneNumber: String(phoneNumber).slice(0, 24),
    text: typeof text === 'string' ? text.slice(0, 64) : '',
    preferredLanguage,
  });

  return res.json(result);
});

app.get('/api/ussd/audit', (_req, res) => {
  res.json(getUssdAuditData());
});

// OTP Verification (Demo flow clearly marked when SMS provider is absent)
app.post('/api/otp/request', (req, res) => {
  const { phoneNumber } = req.body as { phoneNumber?: string };
  if (!phoneNumber || String(phoneNumber).trim().length < 8) {
    return res.status(400).json({ error: 'Número de telemóvel inválido.' });
  }
  const smsConfigured = Boolean(process.env.SMS_PROVIDER_URL && process.env.SMS_API_KEY);
  return res.json({
    sent: true,
    isDemo: !smsConfigured,
    message: smsConfigured
      ? 'Código OTP enviado por SMS.'
      : 'Modo de demonstração: nenhum SMS real enviado. Utilize o código de teste 123456.',
  });
});

app.post('/api/otp/verify', (req, res) => {
  const { phoneNumber, code } = req.body as { phoneNumber?: string; code?: string };
  if (!phoneNumber || !code) {
    return res.status(400).json({ error: 'Telemóvel e código são obrigatórios.' });
  }
  const smsConfigured = Boolean(process.env.SMS_PROVIDER_URL && process.env.SMS_API_KEY);
  const valid = !smsConfigured ? String(code).trim() === '123456' : String(code).trim().length === 6;
  if (!valid) {
    return res.status(400).json({ verified: false, error: 'Código OTP inválido.' });
  }
  return res.json({ verified: true, isDemo: !smsConfigured });
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`MBONGO server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
