import type { ProviderStatus } from '../../types/mbongo';
import { isMeteomaticsConfigured } from './meteomatics';
import { isCopernicusConfigured } from './sentinel2';
import { isChirpsConfigured } from './chirps';

export interface FutureProviderAdapter {
  id: string;
  name: string;
  domain: string;
  status: 'adapter_ready_unconnected';
  expectedVariables: string[];
  notes: string;
}

export const FUTURE_PROVIDER_ADAPTERS: FutureProviderAdapter[] = [
  {
    id: 'smap',
    name: 'NASA SMAP (Soil Moisture Active Passive)',
    domain: 'Humidade do solo superficial e zona radicular',
    status: 'adapter_ready_unconnected',
    expectedVariables: ['surface_soil_moisture_m3_m3', 'rootzone_soil_moisture'],
    notes: 'Adaptador preparado; requer ligação Earthdata / AppEEARS para série operacional.',
  },
  {
    id: 'fao_wapor',
    name: 'FAO WaPOR',
    domain: 'Produtividade da água e evapotranspiração (ETa)',
    status: 'adapter_ready_unconnected',
    expectedVariables: ['actual_evapotranspiration_mm', 'water_productivity_kg_m3'],
    notes: 'Adaptador preparado para integração via FAO WaPOR API v3.',
  },
  {
    id: 'soilgrids_isdasoil',
    name: 'SoilGrids & iSDAsoil',
    domain: 'Propriedades físico-químicas do solo (pH, textura, carbono orgânico)',
    status: 'adapter_ready_unconnected',
    expectedVariables: ['soil_ph', 'clay_pct', 'sand_pct', 'organic_carbon_g_kg'],
    notes: 'Adaptador preparado para consultas pontuais por parcela.',
  },
  {
    id: 'iot_stations',
    name: 'Sensores IoT & Estações Meteorológicas Locais',
    domain: 'Telemetria local em tempo real (pluviometria e humidade)',
    status: 'adapter_ready_unconnected',
    expectedVariables: ['local_rain_mm', 'soil_moisture_sensor', 'air_temp_c'],
    notes: 'Preparado para ingestão via webhook autenticado.',
  },
  {
    id: 'national_official',
    name: 'Serviços Oficiais Nacionais (INAMET / MINAGRIF)',
    domain: 'Boletins agrometeorológicos e avisos oficiais de Angola',
    status: 'adapter_ready_unconnected',
    expectedVariables: ['official_advisory', 'provincial_bulletin'],
    notes: 'Aguarda protocolo institucional e credenciais oficiais.',
  },
];

export function getAllProviderStatuses(): ProviderStatus[] {
  const meteomatics = isMeteomaticsConfigured();
  const copernicus = isCopernicusConfigured();
  const chirps = isChirpsConfigured();
  const ussdConfigured = Boolean(process.env.USSD_WEBHOOK_SECRET && process.env.USSD_GATEWAY_URL);
  const smsConfigured = Boolean(process.env.SMS_PROVIDER_URL && process.env.SMS_API_KEY);

  return [
    {
      id: 'nasa_power',
      name: 'NASA POWER Agroclimatology',
      category: 'weather_history',
      configured: true,
      mode: 'live',
      lastSyncAt: new Date().toISOString(),
      notes: 'API pública activa (sem necessidade de chave); fallback para demonstração em caso de falha de rede.',
    },
    {
      id: 'meteomatics',
      name: 'Meteomatics Weather Forecast',
      category: 'weather_forecast',
      configured: meteomatics,
      mode: meteomatics ? 'live' : 'demo',
      notes: meteomatics
        ? 'Credenciais configuradas no servidor.'
        : 'Modo de demonstração activo (METEOMATICS_USERNAME/PASSWORD não definidos).',
    },
    {
      id: 'sentinel2',
      name: 'Copernicus Sentinel-2 / NDVI',
      category: 'satellite',
      configured: copernicus,
      mode: copernicus ? 'live' : 'demo',
      notes: copernicus
        ? 'Credenciais Copernicus configuradas.'
        : 'Modo de demonstração activo (COPERNICUS_CLIENT_ID/SECRET não definidos).',
    },
    {
      id: 'chirps',
      name: 'CHIRPS Rainfall Series',
      category: 'rainfall',
      configured: chirps,
      mode: chirps ? 'live' : 'demo',
      notes: chirps
        ? 'Endpoint CHIRPS configurado.'
        : 'Modo de demonstração activo (CHIRPS_API_URL não definido).',
    },
    {
      id: 'ussd_gateway',
      name: 'Gateway USSD (Operadoras)',
      category: 'telecom',
      configured: ussdConfigured,
      mode: ussdConfigured ? 'live' : 'demo',
      notes: ussdConfigured
        ? 'Gateway USSD configurado.'
        : 'Simulador USSD interno funcional; ligação a operadora depende de contrato e credenciais.',
    },
    {
      id: 'sms_gateway',
      name: 'Gateway SMS / Notificações',
      category: 'telecom',
      configured: smsConfigured,
      mode: smsConfigured ? 'live' : 'demo',
      notes: smsConfigured
        ? 'Fornecedor SMS configurado.'
        : 'Notificações reais desactivadas em modo de demonstração.',
    },
    ...FUTURE_PROVIDER_ADAPTERS.map((a) => ({
      id: a.id,
      name: a.name,
      category: 'future_adapter' as const,
      configured: false,
      mode: 'adapter_ready' as const,
      notes: a.notes,
    })),
  ];
}
