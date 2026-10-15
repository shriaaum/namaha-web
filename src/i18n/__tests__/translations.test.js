/**
 * Translation file integrity: every language has every key, nothing is empty or
 * left in English, placeholders and plurals line up, and every key the code
 * uses exists. Read-only checks of src/i18n.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../..');
const LANGS = ['en', 'hi', 'te'];
const SCRIPT = { hi: /[ऀ-ॿ]/, te: /[ఀ-౿]/ };
// Values that are correctly identical in every language.
const SAME_IN_ALL_LANGUAGES = new Set(['contact.emailPlaceholder']);

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]
  );
const load = (lang) => Object.fromEntries(flatten(require(`../${lang}.json`)));
const dict = Object.fromEntries(LANGS.map((l) => [l, load(l)]));
const enKeys = Object.keys(dict.en).sort();
const placeholders = (s) => (String(s).match(/{{\s*\w+\s*}}/g) || []).map((p) => p.replace(/\s/g, '')).sort();

describe('UI translation files (en.json / hi.json / te.json)', () => {
  test('English has translation keys', () => {
    expect(enKeys.length).toBeGreaterThan(100);
  });

  test.each(['hi', 'te'])('%s has exactly the same keys as English', (lang) => {
    expect(Object.keys(dict[lang]).sort()).toEqual(enKeys);
  });

  test.each(LANGS)('%s has no empty or non-string values', (lang) => {
    const bad = Object.entries(dict[lang]).filter(([, v]) => typeof v !== 'string' || !v.trim());
    expect(bad).toEqual([]);
  });

  test.each(['hi', 'te'])('%s values are written in their own script (not left in English)', (lang) => {
    const untranslated = enKeys.filter(
      (k) => !SAME_IN_ALL_LANGUAGES.has(k) && !SCRIPT[lang].test(dict[lang][k])
    );
    expect(untranslated).toEqual([]);
  });

  test.each(['hi', 'te'])('%s never just repeats the English text', (lang) => {
    const copied = enKeys.filter((k) => !SAME_IN_ALL_LANGUAGES.has(k) && dict[lang][k] === dict.en[k]);
    expect(copied).toEqual([]);
  });

  test.each(['hi', 'te'])('%s keeps every {{placeholder}} used in English', (lang) => {
    const mismatched = enKeys.filter((k) => placeholders(dict.en[k]).join() !== placeholders(dict[lang][k]).join());
    expect(mismatched).toEqual([]);
  });

  test('plural forms (_one) exist in every language with a matching base key', () => {
    const pluralKeys = enKeys.filter((k) => /_one$/.test(k));
    expect(pluralKeys.length).toBeGreaterThan(0);
    for (const k of pluralKeys) {
      const base = k.replace(/_one$/, '');
      for (const lang of LANGS) {
        expect(dict[lang][k]).toContain('{{count}}');
        expect(dict[lang][base]).toContain('{{count}}');
      }
    }
  });
});

describe('Keys used in the source code', () => {
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== '__tests__') walk(p); }
      else if (/\.jsx?$/.test(e.name) && !/\.test\.jsx?$/.test(e.name)) files.push(p);
    }
  };
  walk(SRC);
  const staticKeys = new Map(); // key -> first file using it
  const dynamicCalls = [];
  for (const f of files) {
    const code = fs.readFileSync(f, 'utf8');
    for (const m of code.matchAll(/\bt\(\s*['"]([A-Za-z0-9_]+\.[A-Za-z0-9_.]+)['"]/g)) {
      if (!staticKeys.has(m[1])) staticKeys.set(m[1], path.relative(SRC, f));
    }
    for (const m of code.matchAll(/\bt\(\s*`([^`]+)`/g)) dynamicCalls.push({ key: m[1], file: path.relative(SRC, f) });
  }

  test('the code uses translation keys', () => {
    expect(staticKeys.size).toBeGreaterThan(100);
  });

  test.each(LANGS)('every static t("…") key exists in %s', (lang) => {
    const missing = [...staticKeys].filter(([k]) => !(k in dict[lang]) && !(`${k}_one` in dict[lang])).map(([k, f]) => `${k} (${f})`);
    expect(missing).toEqual([]);
  });

  // Template keys like t(`faqs.${item.key}Title`): expand each against the dictionary
  // and require at least one match, and that every match exists in all languages.
  test('every dynamic t(`…${x}…`) key family resolves in all languages', () => {
    const problems = [];
    for (const { key, file } of dynamicCalls) {
      const pattern = new RegExp('^' + key.replace(/[.*+?^()|[\]\\]/g, '\\$&').replace(/\\?\$\{[^}]+\}/g, '[A-Za-z0-9_]+') + '$');
      const matches = enKeys.filter((k) => pattern.test(k));
      if (!matches.length) problems.push(`${key} (${file}): no matching keys`);
      for (const lang of ['hi', 'te']) for (const k of matches) if (!(k in dict[lang])) problems.push(`${k} missing in ${lang}`);
    }
    expect(problems).toEqual([]);
  });
});

describe('CMS content dictionaries (cms/hi.json / cms/te.json)', () => {
  const cms = { hi: require('../cms/hi.json'), te: require('../cms/te.json') };

  test('Hindi and Telugu translate the same English source strings', () => {
    expect(Object.keys(cms.hi).sort()).toEqual(Object.keys(cms.te).sort());
    expect(Object.keys(cms.hi).length).toBeGreaterThan(0);
  });

  test.each(['hi', 'te'])('%s CMS translations are non-empty and in their own script', (lang) => {
    const bad = Object.entries(cms[lang]).filter(([, v]) => typeof v !== 'string' || !v.trim() || !SCRIPT[lang].test(v));
    expect(bad.map(([k]) => k.slice(0, 60))).toEqual([]);
  });
});
