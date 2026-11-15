import React from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { PLATFORM_LANGUAGES } from '../i18n/types';
import type { KikongoVariant, LanguageCode } from '../types/mbongo';

interface LanguageSelectorProps {
  compact?: boolean;
  onLanguageChanged?: (lang: LanguageCode) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  compact = false,
  onLanguageChanged,
}) => {
  const { language, setLanguage, kikongoVariant, setKikongoVariant } = useI18n();
  const activeLanguages = PLATFORM_LANGUAGES.filter((l) => l.available);
  const kgMeta = PLATFORM_LANGUAGES.find((l) => l.code === 'kg');

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    onLanguageChanged?.(code);
  };

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <Globe className="h-4 w-4 text-slate-500 shrink-0" />
        <select
          aria-label="Idioma / Language"
          value={language}
          onChange={(e) => handleSelect(e.target.value as LanguageCode)}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-800 focus:border-violet-600 focus:outline-none min-h-[40px]"
        >
          {activeLanguages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.code === 'pt-AO' ? 'PT (AO)' : lang.code === 'en' ? 'EN' : 'KG (Em revisão)'}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {activeLanguages.map((lang) => {
          const active = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code as LanguageCode)}
              className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left transition-colors min-h-[48px] ${
                active
                  ? 'border-lime-600 bg-lime-50/60 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="text-sm font-semibold">{lang.nativeName}</span>
              <span className="mt-0.5 text-xs text-slate-500">{lang.validationNote}</span>
            </button>
          );
        })}
      </div>

      {language === 'kg' && kgMeta?.variants && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-3">
          <label className="block text-xs font-medium text-slate-700">
            Variante linguística Kikongo
          </label>
          <select
            value={kikongoVariant}
            onChange={(e) => setKikongoVariant(e.target.value as KikongoVariant)}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none min-h-[42px]"
          >
            {kgMeta.variants.map((v) => (
              <option key={v.code} value={v.code}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="text-xs text-slate-500">
        Outras línguas nacionais em preparação arquitectural (não activas até validação):{' '}
        {PLATFORM_LANGUAGES.filter((l) => !l.available)
          .map((l) => l.label)
          .join(' · ')}
      </div>
    </div>
  );
};
