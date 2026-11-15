import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { KikongoVariant, LanguageCode, TranslationEntry, TranslationStatus } from '../types/mbongo';
import { INITIAL_TRANSLATIONS } from './translations';

interface I18nContextValue {
  language: LanguageCode;
  kikongoVariant: KikongoVariant;
  setLanguage: (lang: LanguageCode) => void;
  setKikongoVariant: (variant: KikongoVariant) => void;
  t: (key: string, fallback?: string) => string;
  getEntryMeta: (key: string) => { status: TranslationStatus; isFallback: boolean };
  entries: TranslationEntry[];
  updateTranslationEntry: (key: string, patch: Partial<TranslationEntry>) => void;
  formatDate: (isoDate: string) => string;
  formatNumber: (value: number, decimals?: number) => string;
  pluralize: (count: number, singularPt: string, pluralPt: string, singularEn: string, pluralEn: string) => string;
}

const STORAGE_LANG_KEY = 'mbongo_lang_v1';
const STORAGE_KG_VARIANT_KEY = 'mbongo_kg_variant_v1';
const STORAGE_OVERRIDES_KEY = 'mbongo_translation_overrides_v1';

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_LANG_KEY) : null;
    if (saved === 'pt-AO' || saved === 'en' || saved === 'kg') return saved;
    return 'pt-AO';
  });

  const [kikongoVariant, setKikongoVariantState] = useState<KikongoVariant>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KG_VARIANT_KEY) : null;
    if (saved === 'kg_san_salvador' || saved === 'kg_kiwoyo' || saved === 'kg_kisolongo') return saved;
    return 'kg_san_salvador';
  });

  const [entries, setEntries] = useState<TranslationEntry[]>(() => {
    if (typeof window === 'undefined') return INITIAL_TRANSLATIONS;
    try {
      const raw = localStorage.getItem(STORAGE_OVERRIDES_KEY);
      if (!raw) return INITIAL_TRANSLATIONS;
      const overrides = JSON.parse(raw) as Record<string, TranslationEntry>;
      return INITIAL_TRANSLATIONS.map((item) => overrides[item.key] || item);
    } catch {
      return INITIAL_TRANSLATIONS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_LANG_KEY, language);
    document.documentElement.lang = language === 'kg' ? 'kg' : language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KG_VARIANT_KEY, kikongoVariant);
  }, [kikongoVariant]);

  const entryMap = useMemo(() => {
    const map = new Map<string, TranslationEntry>();
    for (const item of entries) {
      map.set(item.key, item);
    }
    return map;
  }, [entries]);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
  };

  const setKikongoVariant = (variant: KikongoVariant) => {
    setKikongoVariantState(variant);
  };

  const updateTranslationEntry = (key: string, patch: Partial<TranslationEntry>) => {
    setEntries((prev) => {
      const next = prev.map((item) =>
        item.key === key
          ? { ...item, ...patch, updatedAt: new Date().toISOString().slice(0, 10) }
          : item
      );
      try {
        const map: Record<string, TranslationEntry> = {};
        next.forEach((e) => {
          map[e.key] = e;
        });
        localStorage.setItem(STORAGE_OVERRIDES_KEY, JSON.stringify(map));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  };

  const getEntryMeta = (key: string): { status: TranslationStatus; isFallback: boolean } => {
    const entry = entryMap.get(key);
    if (!entry) return { status: 'untranslated', isFallback: true };
    if (language === 'kg') {
      const kgText = entry.kgVariants?.[kikongoVariant] || entry.kg;
      const isFallback = !kgText || entry.status === 'untranslated';
      return { status: entry.status, isFallback };
    }
    return { status: 'validated', isFallback: false };
  };

  const t = (key: string, fallback?: string): string => {
    const entry = entryMap.get(key);
    if (!entry) return fallback || key;
    if (language === 'en') return entry.en || entry.ptAO;
    if (language === 'kg') {
      const variantText = entry.kgVariants?.[kikongoVariant];
      const kgText = variantText || entry.kg;
      // Fallback to Portuguese reference if untranslated or empty
      if (!kgText || entry.status === 'untranslated') {
        return entry.ptAO;
      }
      return kgText;
    }
    return entry.ptAO;
  };

  const formatDate = (isoDate: string): string => {
    if (!isoDate) return '—';
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    const locale = language === 'en' ? 'en-GB' : 'pt-AO';
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  };

  const formatNumber = (value: number, decimals = 1): string => {
    const locale = language === 'en' ? 'en-US' : 'pt-AO';
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const pluralize = (
    count: number,
    singularPt: string,
    pluralPt: string,
    singularEn: string,
    pluralEn: string
  ) => {
    if (language === 'en') {
      return `${count} ${count === 1 ? singularEn : pluralEn}`;
    }
    return `${count} ${count === 1 ? singularPt : pluralPt}`;
  };

  return (
    <I18nContext.Provider
      value={{
        language,
        kikongoVariant,
        setLanguage,
        setKikongoVariant,
        t,
        getEntryMeta,
        entries,
        updateTranslationEntry,
        formatDate,
        formatNumber,
        pluralize,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
