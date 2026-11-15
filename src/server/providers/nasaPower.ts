import type { WeatherDailyPoint } from '../../types/mbongo';
import { addIntegrationLog, getCached, setCached } from './cache';

export interface NasaPowerResult {
  source: string;
  dataType: 'observed' | 'demo';
  isDemo: boolean;
  cached: boolean;
  updatedAt: string;
  period: string;
  units: Record<string, string>;
  days: WeatherDailyPoint[];
  limitations?: string;
}

function formatYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function formatIso(ymd: string): string {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

function generateDemoNasaFallback(lat: number, lng: number, reason: string): NasaPowerResult {
  const days: WeatherDailyPoint[] = [];
  const today = new Date();
  const latFactor = Math.abs(lat + 12) * 0.25;
  for (let i = 10; i >= 3; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    const seed = Math.abs(Math.sin(i * 1.7 + lat + lng));
    const tMean = Number((21.5 + latFactor + seed * 3.2).toFixed(1));
    days.push({
      date: iso,
      tempMinC: Number((tMean - 5.2).toFixed(1)),
      tempMaxC: Number((tMean + 5.8).toFixed(1)),
      tempMeanC: tMean,
      precipMm: seed > 0.55 ? Number((seed * 14.5).toFixed(1)) : Number((seed * 1.8).toFixed(1)),
      humidityPct: Math.round(58 + seed * 24),
      solarRadiationMjM2: Number((17.5 + seed * 4.5).toFixed(1)),
      windSpeedMs: Number((1.8 + seed * 2.1).toFixed(1)),
    });
  }
  return {
    source: 'NASA POWER (Fallback Demonstração)',
    dataType: 'demo',
    isDemo: true,
    cached: false,
    updatedAt: new Date().toISOString(),
    period: `${days[0].date} — ${days[days.length - 1].date}`,
    units: {
      temp: '°C',
      precip: 'mm/dia',
      humidity: '%',
      solar: 'MJ/m²/dia',
      wind: 'm/s',
    },
    days,
    limitations: `Serviço NASA POWER indisponível temporariamente (${reason}). A apresentar dados de demonstração.`,
  };
}

export async function fetchNasaPowerHistory(lat: number, lng: number): Promise<NasaPowerResult> {
  const roundedLat = Number(lat.toFixed(2));
  const roundedLng = Number(lng.toFixed(2));
  const cacheKey = `nasa_power:${roundedLat}:${roundedLng}`;
  const cached = getCached<NasaPowerResult>(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  // NASA POWER daily data typically lags by 2-3 days
  const endDate = new Date(Date.now() - 3 * 86400000);
  const startDate = new Date(Date.now() - 12 * 86400000);
  const baseUrl = process.env.NASA_POWER_BASE_URL || 'https://power.larc.nasa.gov/api/temporal/daily/point';

  const url = `${baseUrl}?parameters=T2M,T2M_MIN,T2M_MAX,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN,WS2M&community=AG&longitude=${roundedLng}&latitude=${roundedLat}&start=${formatYmd(startDate)}&end=${formatYmd(endDate)}&format=JSON`;

  const startedAt = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5500);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = (await response.json()) as {
      properties?: {
        parameter?: Record<string, Record<string, number>>;
      };
    };

    const params = json?.properties?.parameter;
    if (!params || !params.T2M) {
      throw new Error('Malformed NASA POWER response');
    }

    const dates = Object.keys(params.T2M).sort();
    const days: WeatherDailyPoint[] = [];

    for (const ymd of dates) {
      const tMean = params.T2M[ymd];
      const tMin = params.T2M_MIN?.[ymd];
      const tMax = params.T2M_MAX?.[ymd];
      const precip = params.PRECTOTCORR?.[ymd];
      const rh = params.RH2M?.[ymd];
      const solar = params.ALLSKY_SFC_SW_DWN?.[ymd];
      const wind = params.WS2M?.[ymd];

      if (tMean === undefined || tMean <= -900) continue;

      days.push({
        date: formatIso(ymd),
        tempMeanC: Number(tMean.toFixed(1)),
        tempMinC: tMin !== undefined && tMin > -900 ? Number(tMin.toFixed(1)) : Number((tMean - 4.5).toFixed(1)),
        tempMaxC: tMax !== undefined && tMax > -900 ? Number(tMax.toFixed(1)) : Number((tMean + 4.5).toFixed(1)),
        precipMm: precip !== undefined && precip >= 0 ? Number(precip.toFixed(1)) : 0,
        humidityPct: rh !== undefined && rh > -900 ? Math.round(rh) : 65,
        solarRadiationMjM2: solar !== undefined && solar > -900 ? Number(solar.toFixed(1)) : undefined,
        windSpeedMs: wind !== undefined && wind > -900 ? Number(wind.toFixed(1)) : 2.1,
      });
    }

    if (days.length === 0) {
      throw new Error('No valid recent NASA POWER observations');
    }

    const result: NasaPowerResult = {
      source: 'NASA POWER Agroclimatology API (Dados Reais)',
      dataType: 'observed',
      isDemo: false,
      cached: false,
      updatedAt: new Date().toISOString(),
      period: `${days[0].date} — ${days[days.length - 1].date}`,
      units: {
        temp: '°C',
        precip: 'mm/dia',
        humidity: '%',
        solar: 'MJ/m²/dia',
        wind: 'm/s',
      },
      days,
      limitations: 'Resolução espacial ~0.5° (~55 km) com latência habitual de 2 a 3 dias.',
    };

    setCached(cacheKey, result, 30 * 60 * 1000);
    addIntegrationLog({
      source: 'nasa_power',
      status: 'ok',
      isDemo: false,
      message: `NASA POWER (${roundedLat}, ${roundedLng}): ${days.length} dias obtidos`,
      latencyMs: Date.now() - startedAt,
    });
    return result;
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Network timeout';
    const fallback = generateDemoNasaFallback(roundedLat, roundedLng, reason);
    addIntegrationLog({
      source: 'nasa_power',
      status: 'fallback_demo',
      isDemo: true,
      message: `Fallback activado para NASA POWER: ${reason}`,
      latencyMs: Date.now() - startedAt,
    });
    return fallback;
  }
}
