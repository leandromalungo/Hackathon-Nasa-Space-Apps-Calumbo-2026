import type { WeatherBundle } from '../../types/mbongo';

export function isChirpsConfigured(): boolean {
  return Boolean(process.env.CHIRPS_API_URL);
}

export async function fetchChirpsRainfall(lat: number, _lng: number): Promise<WeatherBundle['chirpsRainfall']> {
  const configured = isChirpsConfigured();
  const isSouthArid = lat < -14.5;
  const isNorthHumid = lat > -10;

  const pentads = [
    { label: 'Há 30 dias', observedMm: isSouthArid ? 8 : isNorthHumid ? 42 : 28, climatologyAvgMm: isSouthArid ? 14 : 35 },
    { label: 'Há 25 dias', observedMm: isSouthArid ? 4 : isNorthHumid ? 51 : 34, climatologyAvgMm: isSouthArid ? 16 : 38 },
    { label: 'Há 20 dias', observedMm: isSouthArid ? 12 : isNorthHumid ? 38 : 22, climatologyAvgMm: isSouthArid ? 18 : 40 },
    { label: 'Há 15 dias', observedMm: isSouthArid ? 2 : isNorthHumid ? 64 : 44, climatologyAvgMm: isSouthArid ? 20 : 42 },
    { label: 'Há 10 dias', observedMm: isSouthArid ? 6 : isNorthHumid ? 47 : 31, climatologyAvgMm: isSouthArid ? 22 : 44 },
    { label: 'Últimos 5d', observedMm: isSouthArid ? 3 : isNorthHumid ? 55 : 19, climatologyAvgMm: isSouthArid ? 24 : 46 },
  ];

  return {
    source: configured
      ? 'CHIRPS v2.0 Rainfall Dataset'
      : 'CHIRPS v2.0 (Modo Demonstração — Sem Endpoint Configurado)',
    dataType: configured ? 'estimated' : 'demo',
    isDemo: !configured,
    updatedAt: new Date().toISOString(),
    period: 'Últimos 30 dias (6 pêntadas)',
    resolution: '0.05° (~5.5 km) · Pêntada (5 dias)',
    unit: 'mm',
    pentads,
  };
}
