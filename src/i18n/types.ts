import type { KikongoVariant, LanguageCode, TranslationStatus } from '../types/mbongo';

export interface LanguageMetadata {
  code: LanguageCode | 'kmb' | 'umb' | 'cjk';
  label: string;
  nativeName: string;
  available: boolean;
  validationNote: string;
  variants?: { code: KikongoVariant; label: string }[];
}

export const PLATFORM_LANGUAGES: LanguageMetadata[] = [
  {
    code: 'pt-AO',
    label: 'Português (Angola)',
    nativeName: 'Português (pt-AO)',
    available: true,
    validationNote: 'Idioma predefinido e validado.',
  },
  {
    code: 'en',
    label: 'English',
    nativeName: 'English (en)',
    available: true,
    validationNote: 'Complete validated translation.',
  },
  {
    code: 'kg',
    label: 'Kikongo',
    nativeName: 'Kikongo (kg)',
    available: true,
    validationNote: 'Primeira língua nacional activa. Termos marcados "em revisão" usam revisão comunitária ou fallback pt-AO.',
    variants: [
      { code: 'kg_san_salvador', label: 'Kikongo (Mbanza Kongo / San Salvador)' },
      { code: 'kg_kiwoyo', label: 'Kikongo (Kiwoyo / Litoral)' },
      { code: 'kg_kisolongo', label: 'Kikongo (Kisolongo)' },
    ],
  },
  {
    code: 'kmb',
    label: 'Kimbundu',
    nativeName: 'Kimbundu (Em preparação)',
    available: false,
    validationNote: 'Arquitectura preparada — aguarda tradução e validação por falantes competentes.',
  },
  {
    code: 'umb',
    label: 'Umbundu',
    nativeName: 'Umbundu (Em preparação)',
    available: false,
    validationNote: 'Arquitectura preparada — aguarda tradução e validação por falantes competentes.',
  },
  {
    code: 'cjk',
    label: 'Cokwe',
    nativeName: 'Cokwe (Em preparação)',
    available: false,
    validationNote: 'Arquitectura preparada — aguarda tradução e validação por falantes competentes.',
  },
];

export interface LocalizedValue {
  ptAO: string;
  en: string;
  kg?: string;
  kgStatus?: TranslationStatus;
  module: string;
}
