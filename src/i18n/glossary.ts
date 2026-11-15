import type { TranslationStatus } from '../types/mbongo';

export interface GlossaryTerm {
  id: string;
  category: 'climate' | 'satellite' | 'agronomy' | 'digital';
  termPt: string;
  termEn: string;
  termKg: string;
  kgStatus: TranslationStatus;
  definitionPt: string;
  definitionEn: string;
  definitionKg: string;
}

export const INITIAL_GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: 'ndvi',
    category: 'satellite',
    termPt: 'NDVI (Índice de Vegetação)',
    termEn: 'NDVI (Vegetation Index)',
    termKg: 'NDVI (Ziku kia Nti ye Matiti)',
    kgStatus: 'in_review',
    definitionPt: 'Valor entre -1 e +1 calculado por satélite que mostra o vigor e densidade das folhas verdes. Não identifica sozinho pragas, doenças ou falta de nutrientes.',
    definitionEn: 'Satellite value between -1 and +1 indicating green foliage density and vigor. Alone, it cannot diagnose specific pests, diseases, or nutrient deficiencies.',
    definitionKg: 'Lutangu lwa satelite (tuka -1 ti +1) lusonganga ngolo ya matiti ma mbizi. Ke lusonganga mbevo ko yo mosi kaka.',
  },
  {
    id: 'precipitacao_acumulada',
    category: 'climate',
    termPt: 'Precipitação Acumulada (mm)',
    termEn: 'Accumulated Rainfall (mm)',
    termKg: 'Mvula Yibundilu (mm)',
    kgStatus: 'validated',
    definitionPt: 'Quantidade total de chuva caída num período (1 mm equivale a 1 litro de água por metro quadrado de terreno).',
    definitionEn: 'Total rainfall over a period (1 mm equals 1 liter of water per square meter of land).',
    definitionKg: 'Ntalu ya mvula yanoka mu ntangu mosi (1 mm i litulu mosi ya maza mu metelo ya lupangu).',
  },
  {
    id: 'cobertura_nuvens',
    category: 'satellite',
    termPt: 'Cobertura de Nuvens (%)',
    termEn: 'Cloud Cover (%)',
    termKg: 'Matuti mu Zulu (%)',
    kgStatus: 'validated',
    definitionPt: 'Percentagem da parcela tapada por nuvens quando o satélite passa. Acima de 40%, a imagem de satélite não é fiável para medir a vegetação.',
    definitionEn: 'Percentage of the plot covered by clouds during satellite overpass. Above 40%, satellite imagery is not reliable for measuring vegetation.',
    definitionKg: 'Nkama ya matuti mafikanga lupangu ntangu satelite yiviokanga. Kana yiviokele 40%, fwanisa ke ya sikila ko.',
  },
  {
    id: 'risco_seca',
    category: 'climate',
    termPt: 'Déficit Hídrico / Risco de Seca',
    termEn: 'Water Deficit / Dry Spell Risk',
    termKg: 'Kukondwa kwa Maza / Kianga',
    kgStatus: 'in_review',
    definitionPt: 'Ocorre quando passam vários dias seguidos sem chuva relevante e a previsão aponta tempo seco, aumentando o risco de stress para a cultura.',
    definitionEn: 'Occurs after consecutive days without meaningful rain combined with a dry forecast, increasing crop water stress.',
    definitionKg: 'Yibwanga ntangu lumbu yayingi ke yanoka mvula ko ye zulu dia yuma, yilenda tatika mbongo.',
  },
  {
    id: 'parcela_geojson',
    category: 'digital',
    termPt: 'Parcela (GeoJSON)',
    termEn: 'Plot Boundary (GeoJSON)',
    termKg: 'Lupangu lwa Kuna (GeoJSON)',
    kgStatus: 'in_review',
    definitionPt: 'Área delimitada da exploração agrícola guardada com coordenadas geográficas exactas para cruzar com dados climáticos e de satélite.',
    definitionEn: 'Mapped area of a farm stored with exact geographic coordinates to match climate and satellite observations.',
    definitionKg: 'Ndambu ya ntoto yakunwa ye nzonzolo za nza mu fwanisa ye mvula ye satelite.',
  },
  {
    id: 'ussd',
    category: 'digital',
    termPt: 'Acesso USSD (*#)',
    termEn: 'USSD Access (*#)',
    termKg: 'Nzila ya USSD (*#)',
    kgStatus: 'validated',
    definitionPt: 'Serviço de menus por código curto no telemóvel básico que funciona sem Internet móvel nem smartphone.',
    definitionEn: 'Short-code text menu service on basic mobile phones that works without mobile Internet or a smartphone.',
    definitionKg: 'Nzila ya kunata nsangu mu telefone ya nkaka kondwa Internet.',
  },
];
