import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useI18n } from '../i18n/I18nContext';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { t, language } = useI18n();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
      >
        <Download className="h-3.5 w-3.5 text-lime-700" />
        <span>{t('common.installApp')}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
        >
          <Smartphone className="h-3.5 w-3.5 text-lime-700" />
          <span>{language === 'en' ? 'Install iOS' : 'Instalar iOS'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">
                  {language === 'en' ? 'Install MBONGO on iOS' : 'Instalar MBONGO no iPhone / iPad'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
                <li>
                  1.{' '}
                  {language === 'en'
                    ? 'Tap the Share icon in the Safari toolbar.'
                    : 'Toque no ícone Partilhar na barra do Safari.'}
                </li>
                <li>
                  2.{' '}
                  {language === 'en'
                    ? 'Scroll down and tap "Add to Home Screen".'
                    : 'Desça e seleccione "Adicionar ao ecrã principal".'}
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
