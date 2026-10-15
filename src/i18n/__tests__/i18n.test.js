/**
 * Runtime behaviour of src/i18n/index.js: startup language, switching,
 * persistence, <html lang>, fallback, interpolation and plurals.
 * Each test loads a fresh copy of the module (it initialises at import time).
 */
const STORAGE_KEY = 'shriaaum.language';

const loadI18n = () => {
  let mod;
  jest.isolateModules(() => { mod = require('../index'); });
  return { i18n: mod.default, ...mod };
};

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('lang');
  document.documentElement.removeAttribute('translate');
  document.title = 'shriaaum.com';
});

describe('startup language', () => {
  test('defaults to English when nothing is saved', () => {
    const { i18n } = loadI18n();
    expect(i18n.language).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.getAttribute('translate')).toBe('no');
  });

  test.each(['hi', 'te', 'en'])('restores the saved language "%s" on page load/refresh', (lang) => {
    localStorage.setItem(STORAGE_KEY, lang);
    const { i18n } = loadI18n();
    expect(i18n.language).toBe(lang);
    expect(document.documentElement.lang).toBe(lang);
  });

  test.each(['fr', 'HI', '', 'null'])('ignores an unsupported saved value (%p) and uses English', (bad) => {
    localStorage.setItem(STORAGE_KEY, bad);
    const { i18n } = loadI18n();
    expect(i18n.language).toBe('en');
  });

  test('exposes exactly English, Hindi and Telugu with native labels', () => {
    const { supportedLanguages, LANGUAGE_STORAGE_KEY } = loadI18n();
    expect(supportedLanguages).toEqual([
      { code: 'en', label: 'English' },
      { code: 'hi', label: 'हिन्दी' },
      { code: 'te', label: 'తెలుగు' },
    ]);
    expect(LANGUAGE_STORAGE_KEY).toBe(STORAGE_KEY);
  });
});

describe('switching language', () => {
  test.each([['en', 'hi'], ['hi', 'te'], ['te', 'en'], ['en', 'te'], ['te', 'hi'], ['hi', 'en']])(
    '%s → %s: translates, saves the choice and updates <html lang>',
    async (from, to) => {
      localStorage.setItem(STORAGE_KEY, from);
      const { i18n } = loadI18n();
      await i18n.changeLanguage(to);
      expect(i18n.language).toBe(to);
      expect(localStorage.getItem(STORAGE_KEY)).toBe(to);
      expect(document.documentElement.lang).toBe(to);
      expect(document.documentElement.getAttribute('translate')).toBe('no');
      expect(i18n.t('nav.home')).toBe(require(`../${to}.json`).nav.home);
    }
  );

  test('switching is synchronous for bundled languages (no loading delay)', () => {
    const { i18n } = loadI18n();
    i18n.changeLanguage('te');
    expect(i18n.t('nav.home')).toBe(require('../te.json').nav.home);
  });

  test('the browser tab title is never changed by a language switch', async () => {
    const { i18n } = loadI18n();
    for (const lang of ['hi', 'te', 'en']) {
      await i18n.changeLanguage(lang);
      expect(document.title).toBe('shriaaum.com');
    }
  });

  test('a saved choice survives a reload (fresh module instance)', async () => {
    const first = loadI18n();
    await first.i18n.changeLanguage('te');
    const second = loadI18n();
    expect(second.i18n.language).toBe('te');
    expect(second.i18n.t('auth.welcome')).toBe(require('../te.json').auth.welcome);
  });
});

describe('key resolution and fallback', () => {
  test.each(['en', 'hi', 'te'])('resolves nested keys in %s', async (lang) => {
    const { i18n } = loadI18n();
    await i18n.changeLanguage(lang);
    const json = require(`../${lang}.json`);
    expect(i18n.t('auth.sendOtp')).toBe(json.auth.sendOtp);
    expect(i18n.t('chadhavaDetail.offerChadhava')).toBe(json.chadhavaDetail.offerChadhava);
  });

  test('a key missing in Hindi/Telugu falls back to English', async () => {
    const { i18n } = loadI18n();
    i18n.addResource('en', 'translation', 'test.onlyInEnglish', 'English only');
    for (const lang of ['hi', 'te']) {
      await i18n.changeLanguage(lang);
      expect(i18n.t('test.onlyInEnglish')).toBe('English only');
    }
  });

  test('a key missing everywhere returns the key itself (never null/blank)', async () => {
    const { i18n } = loadI18n();
    await i18n.changeLanguage('hi');
    expect(i18n.t('does.not.exist')).toBe('does.not.exist');
  });

  test.each(['en', 'hi', 'te'])('interpolates values in %s', async (lang) => {
    const { i18n } = loadI18n();
    await i18n.changeLanguage(lang);
    const out = i18n.t('auth.otpSent', { mobile: '9876543210' });
    expect(out).toContain('9876543210');
    expect(out).not.toContain('{{');
  });

  test('interpolation is not HTML-escaped (React escapes on render)', async () => {
    const { i18n } = loadI18n();
    expect(i18n.t('auth.otpSent', { mobile: '<b>' })).toContain('<b>');
  });

  test.each([
    ['en', '1 item', '3 items'],
    ['hi', '1 वस्तु', '3 वस्तुएं'],
    ['te', '1 అంశం', '3 అంశాలు'],
  ])('pluralises item counts in %s', async (lang, one, many) => {
    const { i18n } = loadI18n();
    await i18n.changeLanguage(lang);
    expect(i18n.t('chadhava.items', { count: 1 })).toBe(one);
    expect(i18n.t('chadhava.items', { count: 3 })).toBe(many);
  });
});
