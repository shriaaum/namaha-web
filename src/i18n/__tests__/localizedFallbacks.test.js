/**
 * Hindi/Telugu coverage for text that does not come from a single t() call:
 * API error messages, admin-entered package names and the policy pages.
 */
import i18n from '../index';
import { localizeApiError, localizeApiMessage } from '../apiErrors';
import { localizePackageName, translatePackageName } from '../packageNames';
import { policies as en } from '../../components/PolicyPage/policyContent';
import { policies as hi } from '../../components/PolicyPage/policyContent.hi';
import { policies as te } from '../../components/PolicyPage/policyContent.te';

const fs = require('fs');
const path = require('path');

const SCRIPT = { hi: /[ऀ-ॿ]/, te: /[ఀ-౿]/ };
const tFor = (language) => i18n.getFixedT(language);

describe('API error messages', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../apiErrors.js'), 'utf8');
  const keys = [...new Set([...source.matchAll(/'(apiErrors\.\w+)'/g)].map((m) => m[1]))];

  test.each(['en', 'hi', 'te'])('every mapped key exists in %s', (language) => {
    expect(keys.length).toBeGreaterThan(10);
    expect(keys.filter((key) => !i18n.exists(key, { lng: language, fallbackLng: false }))).toEqual([]);
  });

  test('English shows the server message, other languages translate known messages', () => {
    expect(localizeApiMessage('Something custom', 'fallback', tFor('en'), 'en')).toBe('Something custom');
    expect(localizeApiMessage('Invalid OTP', 'fallback', tFor('hi'), 'hi')).toBe('अमान्य OTP');
    expect(localizeApiMessage('This coupon has expired', 'fallback', tFor('te'), 'te')).toMatch(SCRIPT.te);
  });

  test('unknown or missing messages fall back to the translated page error on non-English pages', () => {
    expect(localizeApiMessage('Some new English error', 'हिंदी संदेश', tFor('hi'), 'hi')).toBe('हिंदी संदेश');
    expect(localizeApiError({}, 'fallback', tFor('te'), 'te')).toBe('fallback');
    expect(localizeApiError({ response: { data: { message: 'Booking not found' } } }, 'x', tFor('hi'), 'hi')).toMatch(SCRIPT.hi);
  });
});

describe('Package names', () => {
  test.each([
    'Individual', 'Individual Puja', 'Couple', 'Two person', 'Couple ( 2 Member )',
    'Family', 'Family ( Up to 4 Member )', 'Joint Family', '6+ Family Member',
  ])('"%s" has a Hindi and Telugu label', (name) => {
    expect(translatePackageName(name, tFor('hi'))).toMatch(SCRIPT.hi);
    expect(translatePackageName(name, tFor('te'))).toMatch(SCRIPT.te);
  });

  test('member counts are kept', () => {
    expect(translatePackageName('Family ( Up to 4 Member )', tFor('hi'))).toContain('4');
    expect(translatePackageName('6+ Family Member', tFor('te'))).toContain('6+');
  });

  test('English names and already-translated names are left as they are', () => {
    expect(localizePackageName('Couple ( 2 Member )', tFor('en'), 'en')).toBe('Couple ( 2 Member )');
    expect(localizePackageName('व्यक्तिगत पूजा', tFor('hi'), 'hi')).toBe('व्यक्तिगत पूजा');
    expect(localizePackageName('Premium Seva', tFor('hi'), 'hi')).toBe('Premium Seva');
  });
});

describe('Policy pages', () => {
  const shape = (policySet) => Object.fromEntries(Object.entries(policySet).map(([key, policy]) => [key, {
    intro: policy.intro?.length ?? 0,
    sections: policy.sections.map(([, paragraphs, bullets]) => [paragraphs.length, bullets?.length ?? 0]),
  }]));
  const strings = (policy) => [policy.title, ...(policy.intro || []), ...policy.sections.flatMap(([h, p, b]) => [h, ...p, ...(b || [])])];
  // The postal address is intentionally kept in Latin script in every language.
  const isAddress = (text) => /^F\.No\./.test(text);

  test.each([['hi', hi], ['te', te]])('%s has the same structure as English', (_language, translated) => {
    expect(shape(translated)).toEqual(shape(en));
  });

  test.each([['hi', hi], ['te', te]])('%s policy text is written in its own script', (language, translated) => {
    const untranslated = Object.values(translated).flatMap(strings).filter((text) => !isAddress(text) && !SCRIPT[language].test(text));
    expect(untranslated).toEqual([]);
  });
});
