/*
 * Reviewed translations for admin-dashboard (CMS) text, keyed by the exact
 * English source string. Text an admin adds or edits later has no entry and
 * simply shows in English until it is translated here or in the CMS
 * (`record.translations[lang]`, which always wins).
 */
import hi from './cms/hi.json';
import te from './cms/te.json';
import { localizeRecord } from './content';

/*
 * English display-only spelling corrections for CMS text (the stored record and
 * booking payloads keep the original spelling).
 */
const en = {
  Sringar: 'Shringar',
  'Sringar at all 3 devi': 'Shringar at all 3 devi',
  'The Divine Sringar Seva includes adorning Maa Kali with sacred ornaments and devotional offerings. It expresses love and reverence while seeking Her blessings for happiness, prosperity, and peace.':
    'The Divine Shringar Seva includes adorning Maa Kali with sacred ornaments and devotional offerings. It expresses love and reverence while seeking Her blessings for happiness, prosperity, and peace.',
};

const dictionaries = { en, hi, te };

export function translateCmsText(text, language) {
  if (typeof text !== 'string') return text;
  const dict = dictionaries[language];
  if (!dict) return text;
  return dict[text] ?? dict[text.trim()] ?? text;
}

const translateFields = (obj, fields, language) => {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  fields.forEach((field) => {
    if (typeof obj[field] === 'string') out[field] = translateCmsText(obj[field], language);
  });
  return out;
};

/**
 * Localize a chadhava record (list or detail shape). English originals are kept
 * as `titleEn` (record) and `titleEn` (each offering) for booking payloads.
 */
export function localizeChadhava(item, language) {
  if (!item || typeof item !== 'object') return item;
  const withEnglish = {
    ...item,
    titleEn: item.title,
    offerings: Array.isArray(item.offerings)
      ? item.offerings.map((o) => ({ ...o, titleEn: o.title }))
      : item.offerings,
  };
  const translated = {
    ...translateFields(
      withEnglish,
      ['title', 'shortTitle', 'subtitle', 'description', 'templeName', 'templeDescription', 'buttonText'],
      language
    ),
    benefits: Array.isArray(item.benefits)
      ? item.benefits.map((b) => translateFields(b, ['title', 'subtitle', 'description'], language))
      : item.benefits,
    offerings: Array.isArray(withEnglish.offerings)
      ? withEnglish.offerings.map((o) => translateFields(o, ['title', 'description', 'subtitle'], language))
      : withEnglish.offerings,
  };
  // CMS-provided translations override the local dictionary.
  return localizeRecord(translated, language);
}
