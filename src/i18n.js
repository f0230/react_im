import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import es from './i18n/es.json';
import en from './i18n/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en }
    },
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    },
    interpolation: {
      escapeValue: false
    },
    returnNull: false
  });

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.resolvedLanguage || 'es';
  i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng || 'es';
  });
}

export default i18n;
