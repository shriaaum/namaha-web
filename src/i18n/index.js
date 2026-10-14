import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import hi from './hi.json';
import te from './te.json';

export const LANGUAGE_STORAGE_KEY = 'shriaaum.language';
export const supportedLanguages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'te', label: 'తెలుగు' },
];

const storedLanguage = typeof window !== 'undefined' && localStorage.getItem(LANGUAGE_STORAGE_KEY);
const initialLanguage = supportedLanguages.some(({ code }) => code === storedLanguage) ? storedLanguage : 'en';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi }, te: { translation: te } },
  lng: initialLanguage,
  fallbackLng: 'en',
  supportedLngs: supportedLanguages.map(({ code }) => code),
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  returnNull: false,
});

i18n.on('missingKey', (_lngs, _namespace, key) => {
  if (process.env.NODE_ENV === 'development') console.warn(`Missing translation: ${key}`);
});
i18n.on('languageChanged', (language) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  document.documentElement.lang = language;
  document.documentElement.setAttribute('translate', 'no');
  document.title = language === 'hi' ? 'श्री आऊम' : language === 'te' ? 'శ్రీ ఆఉమ్' : 'Shri Aaum';
});
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLanguage;
  document.documentElement.setAttribute('translate', 'no');
}
export default i18n;
