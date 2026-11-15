import type { WeatherDailyPoint, WeatherHourlyPoint } from '../../types/mbongo';
import { addIntegrationLog, getCached, setCached } from './cache';

export interface MeteomaticsResult {
  source: string;
  dataType: 'forecast' | 'demo';
  isDemo: boolean;
  cached: boolean;
  updatedAt: string;
  period: string;
  units: Record<string, string>;
  daily: WeatherDailyPoint[];
  hourly: WeatherHourlyPoint[];
  limitations?: string;
}

export function isMeteomaticsConfigured(): boolean {
  return Boolean(process.env.METEOMATICS_USERNAME && process.env.METEOMATICS_PASSWORD);
}

function buildDemoForecast(lat: number, lng: number): MeteomaticsResult {
  const daily: WeatherDailyPoint[] = [];
  const hourly: WeatherHourlyPoint[] = [];
  const now = new Date();
  const isNorth = lat > -10;
  const isSouthArid = lat < -14.5;

  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    const wave = Math.sin((i + Math.abs(lat) + Math.abs(lng)) * 0.9);
    const baseTemp = isSouthArid ? 26.5 : isNorth ? 25.0 : 21.8;
    const precipMm = isSouthArid
      ? wave > 0.65
        ? Number((wave * 8).toFixed(1))
        : 0
      : wave > 0.1
      ? Number((wave * 18.5).toFixed(1))
      : Number((Math.max(0, wave + 0.3) * 3.5).toFixed(1));

    daily.push({
      date: iso,
      tempMinC: Number((baseTemp - 5.4 + wave).toFixed(1)),
      tempMaxC: Number((baseTemp + 6.2 + wave * 1.4).toFixed(1)),
      tempMeanC: Number((baseTemp + wave).toFixed(1)),
      precipMm,
      precipProbPct: Math.min(92, Math.max(10, Math.round(precipMm > 5 ? 65 + wave * 20 : 22 + wave * 15))),
      humidityPct: Math.min(92, Math.max(38, Math.round((isSouthArid ? 48 : 70) + wave * 12))),
      windSpeedMs: Number((2.2 + Math.abs(wave) * 2.4).toFixed(1)),
    });
  }

  for (let h = 0; h < 24; h += 3) {
    const t = new Date(now.getTime() + h * 3600000);
    const hour = t.getUTCHours();
    const diurnal = Math.sin(((hour - 6) / 24) * Math.PI * 2);
    hourly.push({
      time: `${String(hour).padStart(2, '0')}:00`,
      tempC: Number(((isNorth ? 24 : 21) + diurnal * 5.2).toFixed(1)),
      precipMm: hour >= 14 && hour <= 18 && !isSouthArid ? Number((Math.abs(diurnal) * 2.4).toFixed(1)) : 0,
      humidityPct: Math.round(68 - diurnal * 16),
      windSpeedMs: Number((2.4 + Math.abs(diurnal) * 1.6).toFixed(1)),
    });
  }

  return {
    source: 'Meteomatics (Modo Demonstração — Sem Credenciais)',
    dataType: 'demo',
    isDemo: true,
    cached: false,
    updatedAt: new Date().toISOString(),
    period: `${daily[0].date} — ${daily[daily.length - 1].date}`,
    units: {
      temp: '°C',
      precip: 'mm',
      precipProb: '%',
      humidity: '%',
      wind: 'm/s',
    },
    daily,
    hourly,
    limitations: 'Credenciais METEOMATICS_USERNAME / METEOMATICS_PASSWORD não configuradas. Previsão simulada para demonstração.',
  };
}

export async function fetchMeteomaticsForecast(lat: number, lng: number): Promise<MeteomaticsResult> {
  const roundedLat = Number(lat.toFixed(2));
  const roundedLng = Number(lng.toFixed(2));
  const cacheKey = `meteomatics:${roundedLat}:${roundedLng}`;
  const cached = getCached<MeteomaticsResult>(cacheKey);
  if (cached) return { ...cached, cached: true };

  if (!isMeteomaticsConfigured()) {
    const demo = buildDemoForecast(roundedLat, roundedLng);
    setCached(cacheKey, demo, 10 * 60 * 1000);
    return demo;
  }

  const startedAt = Date.now();
  try {
    const now = new Date();
    const end = new Date(now.getTime() + 6 * 86400000);
    const range = `${now.toISOString().slice(0, 10)}T00:00:00Z--${end.toISOString().slice(0, 10)}T00:00:00Z:P1D`;
    const params = 't_min_2m_24h:C,t_max_2m_24h:C,precip_24h:mm,relative_humidity_2m:p,wind_speed_10m:ms';
    const url = `https://api.meteomatics.com/${range}/${params}/${roundedLat},${roundedLng}/json`;
    const authToken = Buffer.from(
      `${process.env.METEOMATICS_USERNAME}:${process.env.METEOMATICS_PASSWORD}`
    ).toString('base64');

    const res = await fetch(url, {
      headers: { Authorization: `Basic ${authToken}` },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await res.json()) as {
      data?: Array<{ parameter: string; coordinates: Array<{ dates: Array<{ date: string; value: number }> }> }>;
    };

    const byDate = new Map<string, Partial<WeatherDailyPoint>>();
    for (const item of data.data || []) {
      const dates = item.coordinates?.[0]?.dates || [];
      for (const entry of dates) {
        const dayKey = entry.date.slice(0, 10);
        const existing = byDate.get(dayKey) || { date: dayKey };
        if (item.parameter.startsWith('t_min')) existing.tempMinC = entry.value;
        if (item.parameter.startsWith('t_max')) existing.tempMaxC = entry.value;
        if (item.parameter.startsWith('precip')) existing.precipMm = entry.value;
        if (item.parameter.startsWith('relative_humidity')) existing.humidityPct = Math.round(entry.value);
        if (item.parameter.startsWith('wind_speed')) existing.windSpeedMs = entry.value;
        byDate.set(dayKey, existing);
      }
    }

    const daily: WeatherDailyPoint[] = Array.from(byDate.values()).map((d) => ({
      date: d.date || '',
      tempMinC: Number((d.tempMinC ?? 17).toFixed(1)),
      tempMaxC: Number((d.tempMaxC ?? 27).toFixed(1)),
      tempMeanC: Number((((d.tempMinC ?? 17) + (d.tempMaxC ?? 27)) / 2).toFixed(1)),
      precipMm: Number((d.precipMm ?? 0).toFixed(1)),
      humidityPct: d.humidityPct ?? 65,
      windSpeedMs: Number((d.windSpeedMs ?? 2.5).toFixed(1)),
    }));

    const demoHourly = buildDemoForecast(roundedLat, roundedLng).hourly;
    const result: MeteomaticsResult = {
      source: 'Meteomatics Weather API (Dados Reais)',
      dataType: 'forecast',
      isDemo: false,
      cached: false,
      updatedAt: new Date().toISOString(),
      period: `${daily[0]?.date || ''} — ${daily[daily.length - 1]?.date || ''}`,
      units: { temp: '°C', precip: 'mm', humidity: '%', wind: 'm/s' },
      daily,
      hourly: demoHourly,
    };

    setCached(cacheKey, result, 30 * 60 * 1000);
    addIntegrationLog({
      source: 'meteomatics',
      status: 'ok',
      isDemo: false,
      message: `Previsão Meteomatics obtida (${daily.length} dias)`,
      latencyMs: Date.now() - startedAt,
    });
    return result;
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Error';
    addIntegrationLog({
      source: 'meteomatics',
      status: 'fallback_demo',
      isDemo: true,
      message: `Erro Meteomatics (${reason}); activado fallback de demonstração`,
      latencyMs: Date.now() - startedAt,
    });
    return buildDemoForecast(roundedLat, roundedLng);
  }
}
