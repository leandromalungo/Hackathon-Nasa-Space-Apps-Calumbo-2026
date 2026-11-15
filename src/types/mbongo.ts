export type LanguageCode = 'pt-AO' | 'en' | 'kg';
export type KikongoVariant = 'kg_san_salvador' | 'kg_kiwoyo' | 'kg_kisolongo';
export type TranslationStatus = 'validated' | 'in_review' | 'untranslated';
export type UserRole = 'farmer' | 'technician' | 'admin';
export type DataProvenanceType = 'observed' | 'estimated' | 'forecast' | 'demo';

export interface UserProfile {
  uid: string;
  fullName: string;
  phoneNumber: string;
  phoneVerified: boolean;
  role: UserRole;
  province: string;
  municipality: string;
  locality: string;
  preferredLanguage: LanguageCode;
  kikongoVariant?: KikongoVariant;
  consentNotifications: boolean;
  consentDataProcessing: boolean;
  onboardingCompleted: boolean;
  isDemoSession?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Farm {
  id: string;
  ownerId: string;
  name: string;
  province: string;
  municipality: string;
  locality: string;
  lat: number;
  lng: number;
  responsibleName: string;
  approxAreaHa: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type IrrigationType = 'rainfed' | 'drip' | 'furrow' | 'sprinkler' | 'manual';
export type PlotStatus = 'active' | 'fallow' | 'harvested' | 'preparation';

export interface CropHistoryItem {
  crop: string;
  season: string;
  harvestedAt?: string;
}

export interface Plot {
  id: string;
  farmId: string;
  ownerId: string;
  name: string;
  code: string;
  geometryGeoJson: string;
  centerLat: number;
  centerLng: number;
  areaHa: number;
  currentCrop: string;
  variety?: string;
  plantingDate: string;
  irrigationType: IrrigationType;
  soilType?: string;
  status: PlotStatus;
  cropHistory?: CropHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export type CalendarActivityType =
  | 'land_prep'
  | 'sowing'
  | 'irrigation'
  | 'fertilization'
  | 'treatment'
  | 'inspection'
  | 'harvest'
  | 'custom';

export type CalendarStatus = 'pending' | 'completed' | 'postponed';

export interface CalendarEvent {
  id: string;
  farmId: string;
  plotId: string;
  ownerId: string;
  date: string;
  type: CalendarActivityType;
  description: string;
  status: CalendarStatus;
  notify: boolean;
  createdAt: string;
  updatedAt: string;
}

export type HarvestUnit = 'kg' | 't' | 'sacks';

export interface HarvestRecord {
  id: string;
  farmId: string;
  plotId: string;
  ownerId: string;
  crop: string;
  harvestDate: string;
  quantity: number;
  unit: HarvestUnit;
  harvestedAreaHa: number;
  lossesQuantity?: number;
  notes?: string;
  createdAt: string;
}

export interface WeatherDailyPoint {
  date: string;
  tempMinC: number;
  tempMaxC: number;
  tempMeanC: number;
  precipMm: number;
  precipProbPct?: number;
  humidityPct: number;
  solarRadiationMjM2?: number;
  windSpeedMs: number;
}

export interface WeatherHourlyPoint {
  time: string;
  tempC: number;
  precipMm: number;
  humidityPct: number;
  windSpeedMs: number;
}

export interface WeatherBundle {
  location: { lat: number; lng: number; name?: string };
  observedHistory: {
    source: string;
    dataType: DataProvenanceType;
    isDemo: boolean;
    cached: boolean;
    updatedAt: string;
    period: string;
    units: Record<string, string>;
    days: WeatherDailyPoint[];
    limitations?: string;
  };
  forecast: {
    source: string;
    dataType: DataProvenanceType;
    isDemo: boolean;
    cached: boolean;
    updatedAt: string;
    period: string;
    units: Record<string, string>;
    daily: WeatherDailyPoint[];
    hourly: WeatherHourlyPoint[];
    limitations?: string;
  };
  chirpsRainfall: {
    source: string;
    dataType: DataProvenanceType;
    isDemo: boolean;
    updatedAt: string;
    period: string;
    resolution: string;
    unit: string;
    pentads: { label: string; observedMm: number; climatologyAvgMm: number }[];
  };
}

export interface SatelliteObservation {
  id: string;
  acquisitionDate: string;
  sensor: string;
  resolutionMeters: number;
  cloudCoverPct: number;
  ndviMean: number | null;
  ndviMin: number | null;
  ndviMax: number | null;
  usable: boolean;
  reasonIfUnusable?: string;
  source: string;
  dataType: DataProvenanceType;
  isDemo: boolean;
}

export interface SatelliteBundle {
  plotId: string;
  source: string;
  dataType: DataProvenanceType;
  isDemo: boolean;
  updatedAt: string;
  disclaimer: string;
  observations: SatelliteObservation[];
}

export interface Recommendation {
  id: string;
  ruleId: string;
  plotId: string;
  plotName: string;
  title: string;
  explanation: string;
  priority: 'high' | 'medium' | 'low';
  justificationData: string;
  source: string;
  dataDate: string;
  suggestedAction: string;
  confidenceNote: string;
  isDemoData: boolean;
}

export interface AlertItem {
  id: string;
  plotId: string;
  plotName: string;
  level: 'warning' | 'attention' | 'info';
  category: 'rain_deficit' | 'heavy_rain' | 'heat_stress' | 'ndvi_change' | 'weather_update';
  title: string;
  message: string;
  source: string;
  dataDate: string;
  isDemoData: boolean;
}

export interface ProviderStatus {
  id: string;
  name: string;
  category: 'weather_history' | 'weather_forecast' | 'satellite' | 'rainfall' | 'future_adapter' | 'telecom';
  configured: boolean;
  mode: 'live' | 'demo' | 'adapter_ready';
  lastSyncAt?: string;
  notes: string;
}

export interface IntegrationLogItem {
  id: string;
  source: string;
  status: 'ok' | 'fallback_demo' | 'error';
  isDemo: boolean;
  message: string;
  latencyMs: number;
  timestamp: string;
}

export interface TranslationEntry {
  key: string;
  module: string;
  ptAO: string;
  en: string;
  kg: string;
  kgVariants?: Partial<Record<KikongoVariant, string>>;
  status: TranslationStatus;
  reviewerName: string;
  updatedAt: string;
}

export interface UssdSimResponse {
  sessionId: string;
  mode: 'CON' | 'END';
  message: string;
  charCount: number;
  language: LanguageCode;
  menu: string;
  isSimulated: boolean;
  loggedEvent?: {
    timestamp: string;
    input: string;
    menu: string;
  };
}

export interface SyncQueueItem {
  id: string;
  entity: 'farm' | 'plot' | 'calendar' | 'harvest';
  action: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
}
