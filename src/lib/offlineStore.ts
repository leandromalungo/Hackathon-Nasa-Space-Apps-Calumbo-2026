import type {
  CalendarEvent,
  Farm,
  HarvestRecord,
  Plot,
  SatelliteBundle,
  SyncQueueItem,
  UserProfile,
  WeatherBundle,
} from '../types/mbongo';

const KEYS = {
  PROFILE: 'mbongo_profile_v3',
  FARMS: 'mbongo_farms_v3',
  PLOTS: 'mbongo_plots_v3',
  CALENDAR: 'mbongo_calendar_v3',
  HARVESTS: 'mbongo_harvests_v3',
  QUEUE: 'mbongo_sync_queue_v3',
  LAST_SYNC: 'mbongo_last_sync_v3',
  WEATHER_CACHE: 'mbongo_weather_cache_v3',
  SAT_CACHE: 'mbongo_sat_cache_v3',
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota overflow
  }
}

export const offlineStore = {
  getProfile: (): UserProfile | null => readJson<UserProfile | null>(KEYS.PROFILE, null),
  setProfile: (profile: UserProfile | null) => {
    if (!profile) localStorage.removeItem(KEYS.PROFILE);
    else writeJson(KEYS.PROFILE, profile);
  },

  getFarms: (): Farm[] => readJson<Farm[]>(KEYS.FARMS, []),
  setFarms: (farms: Farm[]) => writeJson(KEYS.FARMS, farms),

  getPlots: (): Plot[] => readJson<Plot[]>(KEYS.PLOTS, []),
  setPlots: (plots: Plot[]) => writeJson(KEYS.PLOTS, plots),

  getCalendar: (): CalendarEvent[] => readJson<CalendarEvent[]>(KEYS.CALENDAR, []),
  setCalendar: (events: CalendarEvent[]) => writeJson(KEYS.CALENDAR, events),

  getHarvests: (): HarvestRecord[] => readJson<HarvestRecord[]>(KEYS.HARVESTS, []),
  setHarvests: (records: HarvestRecord[]) => writeJson(KEYS.HARVESTS, records),

  getQueue: (): SyncQueueItem[] => readJson<SyncQueueItem[]>(KEYS.QUEUE, []),
  enqueue: (item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'attempts'>): SyncQueueItem[] => {
    const current = readJson<SyncQueueItem[]>(KEYS.QUEUE, []);
    const next: SyncQueueItem[] = [
      ...current,
      {
        ...item,
        id: `sq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        attempts: 0,
      },
    ];
    writeJson(KEYS.QUEUE, next);
    return next;
  },
  setQueue: (queue: SyncQueueItem[]) => writeJson(KEYS.QUEUE, queue),

  getLastSync: (): string | null => localStorage.getItem(KEYS.LAST_SYNC),
  setLastSync: (iso: string) => localStorage.setItem(KEYS.LAST_SYNC, iso),

  getCachedWeather: (plotId: string): WeatherBundle | null => {
    const map = readJson<Record<string, WeatherBundle>>(KEYS.WEATHER_CACHE, {});
    return map[plotId] || null;
  },
  setCachedWeather: (plotId: string, bundle: WeatherBundle) => {
    const map = readJson<Record<string, WeatherBundle>>(KEYS.WEATHER_CACHE, {});
    map[plotId] = bundle;
    writeJson(KEYS.WEATHER_CACHE, map);
  },

  getCachedSatellite: (plotId: string): SatelliteBundle | null => {
    const map = readJson<Record<string, SatelliteBundle>>(KEYS.SAT_CACHE, {});
    return map[plotId] || null;
  },
  setCachedSatellite: (plotId: string, bundle: SatelliteBundle) => {
    const map = readJson<Record<string, SatelliteBundle>>(KEYS.SAT_CACHE, {});
    map[plotId] = bundle;
    writeJson(KEYS.SAT_CACHE, map);
  },
};

export function createDemoSeedData(ownerId: string): {
  farms: Farm[];
  plots: Plot[];
  calendar: CalendarEvent[];
  harvests: HarvestRecord[];
} {
  const now = new Date().toISOString();
  const plantingDate = new Date(Date.now() - 42 * 86400000).toISOString().slice(0, 10);
  const in2Days = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const in5Days = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);

  const farmId = 'farm_boa_esperanca';

  const farms: Farm[] = [
    {
      id: farmId,
      ownerId,
      name: 'Fazenda Boa Esperança',
      province: 'Huambo',
      municipality: 'Caála',
      locality: 'Calenga',
      lat: -12.845,
      lng: 15.548,
      responsibleName: 'Mateus Katchiungo',
      approxAreaHa: 2.5,
      notes: 'Produção dedicada de tomate tutorado com rega gota-a-gota.',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const polyTomato = {
    type: 'Feature',
    properties: { name: 'Talhão Principal — Tomate' },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [15.5468, -12.8438],
        [15.5492, -12.8438],
        [15.5492, -12.8462],
        [15.5468, -12.8462],
        [15.5468, -12.8438],
      ]],
    },
  };

  const plots: Plot[] = [
    {
      id: 'plot_tomate_principal',
      farmId,
      ownerId,
      name: 'Talhão Principal — Tomate',
      code: 'T-01',
      geometryGeoJson: JSON.stringify(polyTomato),
      centerLat: -12.845,
      centerLng: 15.548,
      areaHa: 2.5,
      currentCrop: 'Tomate',
      variety: 'Rio Grande',
      plantingDate,
      irrigationType: 'drip',
      soilType: 'Franco-argiloso bem drenado',
      status: 'active',
      cropHistory: [{ crop: 'Tomate', season: '2025/2026 (Época seca)', harvestedAt: '2026-08-18' }],
      createdAt: now,
      updatedAt: now,
    },
  ];

  const calendar: CalendarEvent[] = [
    {
      id: 'cal_tomate_1',
      farmId,
      plotId: 'plot_tomate_principal',
      ownerId,
      date: in2Days,
      type: 'inspection',
      description: 'Inspecção das folhas inferiores e verificação da amarração das estacas de tomate.',
      status: 'pending',
      notify: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'cal_tomate_2',
      farmId,
      plotId: 'plot_tomate_principal',
      ownerId,
      date: in5Days,
      type: 'irrigation',
      description: 'Ajustar rega gota-a-gota na base das plantas conforme chuva prevista.',
      status: 'pending',
      notify: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const harvests: HarvestRecord[] = [
    {
      id: 'harv_tomate_1',
      farmId,
      plotId: 'plot_tomate_principal',
      ownerId,
      crop: 'Tomate',
      harvestDate: '2026-08-18',
      quantity: 14200,
      unit: 'kg',
      harvestedAreaHa: 2.0,
      lossesQuantity: 680,
      notes: 'Colheita manual em caixas ventiladas durante as primeiras horas da manhã.',
      createdAt: now,
    },
  ];

  return { farms, plots, calendar, harvests };
}
