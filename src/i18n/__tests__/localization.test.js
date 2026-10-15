/**
 * Content localisation helpers: CMS text, chadhava/puja records, hero banners,
 * date locales. Booking payloads must keep the English originals.
 */
import { translateCmsText, localizeChadhava } from '../cmsText';
import { localizePujaRecord, localizeRecord, localizeHeroBanner, getDateLocale } from '../content';

const cmsHi = require('../cms/hi.json');
const cmsTe = require('../cms/te.json');
const [SOURCE] = Object.keys(cmsHi);

describe('translateCmsText', () => {
  test('translates a known CMS string into Hindi and Telugu', () => {
    expect(translateCmsText(SOURCE, 'hi')).toBe(cmsHi[SOURCE]);
    expect(translateCmsText(SOURCE, 'te')).toBe(cmsTe[SOURCE]);
  });

  test('matches even with surrounding whitespace', () => {
    expect(translateCmsText(`  ${SOURCE}  `, 'hi')).toBe(cmsHi[SOURCE]);
  });

  test('unknown text is returned unchanged (shown in English, never blank)', () => {
    expect(translateCmsText('A brand new admin text', 'hi')).toBe('A brand new admin text');
    expect(translateCmsText('A brand new admin text', 'te')).toBe('A brand new admin text');
  });

  test('English applies only the display spelling fixes', () => {
    expect(translateCmsText('Sringar', 'en')).toBe('Shringar');
    expect(translateCmsText(SOURCE, 'en')).toBe(SOURCE);
  });

  test('non-string input and unknown languages pass through untouched', () => {
    expect(translateCmsText(null, 'hi')).toBeNull();
    expect(translateCmsText(42, 'te')).toBe(42);
    expect(translateCmsText(SOURCE, 'fr')).toBe(SOURCE);
  });
});

describe('localizeChadhava', () => {
  const item = {
    title: SOURCE,
    description: 'Untranslated description',
    benefits: [{ title: SOURCE }],
    offerings: [{ title: SOURCE, price: 201 }, { title: 'New offering', price: 101 }],
  };

  test.each(['hi', 'te'])('translates title, benefits and offerings in %s', (lang) => {
    const out = localizeChadhava(item, lang);
    const expected = (lang === 'hi' ? cmsHi : cmsTe)[SOURCE];
    expect(out.title).toBe(expected);
    expect(out.benefits[0].title).toBe(expected);
    expect(out.offerings[0].title).toBe(expected);
    expect(out.offerings[1].title).toBe('New offering');
    expect(out.description).toBe('Untranslated description');
  });

  test('keeps English originals for booking payloads (titleEn) and prices', () => {
    const out = localizeChadhava(item, 'te');
    expect(out.titleEn).toBe(SOURCE);
    expect(out.offerings.map((o) => o.titleEn)).toEqual([SOURCE, 'New offering']);
    expect(out.offerings.map((o) => o.price)).toEqual([201, 101]);
  });

  test('does not mutate the original record', () => {
    const copy = JSON.parse(JSON.stringify(item));
    localizeChadhava(item, 'hi');
    expect(item).toEqual(copy);
  });

  test('CMS-provided translations override the local dictionary', () => {
    const out = localizeChadhava({ ...item, translations: { hi: { title: 'CMS शीर्षक' } } }, 'hi');
    expect(out.title).toBe('CMS शीर्षक');
  });

  test('empty input is returned as-is', () => {
    expect(localizeChadhava(null, 'hi')).toBeNull();
  });
});

describe('localizePujaRecord / localizeRecord', () => {
  const puja = {
    _id: '6a30eb847306dfad39bcd94d',
    name: 'Mahalaya Special',
    benefits: [{ _id: 'b1', title: 'Removal of Obstacles' }],
    addOns: [{ _id: 'a1', name: 'Thali', price: 301 }],
    packageDetails: [{ _id: 'p1', name: 'Individual', price: 801 }],
  };

  test('English returns the record unchanged', () => {
    expect(localizePujaRecord(puja, 'en')).toBe(puja);
    expect(localizeRecord(puja, 'en')).toBe(puja);
  });

  test.each([['hi', /[ऀ-ॿ]/], ['te', /[ఀ-౿]/]])('translates a reviewed puja into %s, prices untouched', (lang, script) => {
    const out = localizePujaRecord(puja, lang);
    expect(out.name).toMatch(script);
    expect(out.benefits[0].title).toMatch(script);
    expect(out.addOns[0].price).toBe(301);
    expect(out.packageDetails[0].price).toBe(801);
    expect(out._id).toBe(puja._id);
  });

  test('an unknown puja stays in English', () => {
    const other = { ...puja, _id: 'not-a-reviewed-id' };
    expect(localizePujaRecord(other, 'hi')).toBe(other);
  });

  test('localizeRecord merges CMS translations by _id and keeps other fields', () => {
    const rec = { ...puja, translations: { te: { name: 'పేరు', addOns: { a1: { name: 'తాళి' } } } } };
    const out = localizeRecord(rec, 'te');
    expect(out.name).toBe('పేరు');
    expect(out.addOns[0]).toEqual({ _id: 'a1', name: 'తాళి', price: 301 });
    expect(out.packageDetails[0].name).toBe('Individual');
  });
});

describe('localizeHeroBanner and getDateLocale', () => {
  test('English banner is unchanged; unknown banner stays English', () => {
    const b = { _id: 'x', title: 'Hello' };
    expect(localizeHeroBanner(b, 'en')).toBe(b);
    expect(localizeHeroBanner(b, 'hi').title).toBe('Hello');
  });

  test('CMS banner translations apply and description follows a translated subtitle', () => {
    const b = { _id: 'x', title: 'Hello', subtitle: 'Sub', description: 'Sub', translations: { hi: { title: 'नमस्ते', subtitle: 'उप' } } };
    const out = localizeHeroBanner(b, 'hi');
    expect(out.title).toBe('नमस्ते');
    expect(out.description).toBe('उप');
  });

  test('date locales per language, English for anything else', () => {
    expect(getDateLocale('en')).toBe('en-GB');
    expect(getDateLocale('hi')).toBe('hi-IN');
    expect(getDateLocale('te')).toBe('te-IN');
    expect(getDateLocale('fr')).toBe('en-GB');
  });
});
