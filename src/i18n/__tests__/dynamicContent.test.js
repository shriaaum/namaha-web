/**
 * Regression tests: newly created Pooja / Chadhava records (not in any local
 * dictionary) are shown in English, Hindi and Telugu from the translations the
 * API stores on the record, switch language without a refresh or re-fetch,
 * and report — never hide — any text that is still untranslated.
 */
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import axiosInstance from '../../lib/instance';
import i18n from '../index';
import { buildTextTranslations, clearMissingTranslations, getMissingTranslations } from '../content';
import { localizeChadhava, translateBookedText } from '../cmsText';
import { clearPujaResponseCache, fetchPujaList, getPujaById } from '../../data/pujaList';
import Chadhava from '../../components/Chadhava/Chadhava';
import { getLocalizedReviewText, REVIEWS_AND_FEEDBACK } from '../../data/reviewsAndFeedback';

// react-router-dom v7 is ESM-only for this Jest; the list page only needs navigate() and <Link>.
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  Link: ({ to, children, ...rest }) => require('react').createElement('a', { href: String(to), ...rest }, children),
}), { virtual: true });
jest.mock('../../lib/instance', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

const FUTURE = '2099-11-20T00:00:00.000Z';

// Shape written by namaha-api src/translation/ (Pooja arrays keyed by _id).
const newPooja = {
  _id: '7b00000000000000000000a1',
  name: 'Kartik Purnima Special: Ganga Deepdaan Puja',
  description: 'Offer lamps on the holy Ganga.',
  templeName: 'Dashashwamedh Ghat, Varanasi',
  templeDescription: 'An ancient ghat.',
  aboutPuja: 'Join the evening deepdaan.',
  eventDate: FUTURE,
  eventTime: '18:00',
  isActive: true,
  section: 'occasion',
  category: { _id: 'c1', category: 'Festival Pujas' },
  benefits: [{ _id: 'b1', title: 'Peace of mind', subtitle: 'For the whole family' }],
  packageDetails: [{ _id: 'p1', name: 'Single Devotee', persons: 1, price: 551 }],
  addOns: [{ _id: 'a1', name: 'Extra Diya', price: 51 }],
  translations: {
    hi: {
      name: 'कार्तिक पूर्णिमा विशेष: गंगा दीपदान पूजा',
      description: 'पवित्र गंगा पर दीप अर्पित करें।',
      templeName: 'दशाश्वमेध घाट, वाराणसी',
      templeDescription: 'एक प्राचीन घाट।',
      aboutPuja: 'संध्या दीपदान में शामिल हों।',
      categoryName: 'पर्व पूजाएँ',
      benefits: { b1: { title: 'मन की शांति', subtitle: 'पूरे परिवार के लिए' } },
      packageDetails: { p1: { name: 'एक भक्त' } },
      addOns: { a1: { name: 'अतिरिक्त दीया' } },
    },
    te: {
      name: 'కార్తీక పౌర్ణమి ప్రత్యేకం: గంగా దీపదాన పూజ',
      description: 'పవిత్ర గంగలో దీపాలు సమర్పించండి.',
      templeName: 'దశాశ్వమేధ ఘాట్, వారణాసి',
      templeDescription: 'ఒక ప్రాచీన ఘాట్.',
      aboutPuja: 'సాయంత్రం దీపదానంలో పాల్గొనండి.',
      categoryName: 'పండుగ పూజలు',
      benefits: { b1: { title: 'మనశ్శాంతి', subtitle: 'కుటుంబమంతటికీ' } },
      packageDetails: { p1: { name: 'ఒక భక్తుడు' } },
      addOns: { a1: { name: 'అదనపు దీపం' } },
    },
  },
};

// Chadhava benefits/offerings have no _id: translations are keyed by index.
const newChadhava = {
  id: '7c00000000000000000000b2',
  _id: '7c00000000000000000000b2',
  title: 'Kartik Purnima Special: Ganga Deepdaan Puja',
  shortTitle: '',
  description: 'Offer a diya at the ghat.',
  templeName: 'Dashashwamedh Ghat, Varanasi',
  eventdate: '2099-11-20',
  isActive: true,
  benefits: [{ title: 'Blessings of Maa Ganga', subtitle: '' }],
  offerings: [
    { title: 'Deep Daan', description: '11 lamps', price: 101 },
    { title: 'Ganga Aarti Seva', description: '', price: 251 },
  ],
  translations: {
    hi: {
      title: 'कार्तिक पूर्णिमा विशेष: गंगा दीपदान पूजा',
      description: 'घाट पर दीया अर्पित करें।',
      templeName: 'दशाश्वमेध घाट, वाराणसी',
      benefits: { 0: { title: 'माँ गंगा का आशीर्वाद' } },
      offerings: { 0: { title: 'दीपदान', description: '11 दीप' }, 1: { title: 'गंगा आरती सेवा' } },
    },
    te: {
      title: 'కార్తీక పౌర్ణమి ప్రత్యేకం: గంగా దీపదాన పూజ',
      description: 'ఘాట్ వద్ద దీపం సమర్పించండి.',
      templeName: 'దశాశ్వమేధ ఘాట్, వారణాసి',
      benefits: { 0: { title: 'గంగమ్మ ఆశీర్వాదం' } },
      offerings: { 0: { title: 'దీపదానం', description: '11 దీపాలు' }, 1: { title: 'గంగా హారతి సేవ' } },
    },
  },
};

const respond = (routes) => (url) => {
  const body = routes[url];
  return body ? Promise.resolve({ data: body }) : Promise.reject(Object.assign(new Error('404'), { response: { status: 404 } }));
};

beforeEach(async () => {
  jest.clearAllMocks();
  clearPujaResponseCache();
  clearMissingTranslations();
  await act(async () => { await i18n.changeLanguage('en'); });
});

afterAll(async () => {
  await i18n.changeLanguage('en');
});

describe('new Pooja from the API', () => {
  beforeEach(() => {
    axiosInstance.get.mockImplementation((url) => {
      if (url === '/pooja') return Promise.resolve({ data: { poojas: [newPooja] } });
      return respond({
        [`/pooja/${newPooja._id}`]: { pooja: newPooja },
        '/chadhava': { items: [{ ...newChadhava, offerings: undefined }] },
        [`/chadhava/${newChadhava.id}`]: { item: newChadhava },
      })(url);
    });
  });

  test.each([
    ['en', 'Kartik Purnima Special: Ganga Deepdaan Puja', 'Peace of mind', 'Single Devotee', 'Extra Diya', 'FESTIVAL PUJAS'],
    ['hi', 'कार्तिक पूर्णिमा विशेष: गंगा दीपदान पूजा', 'मन की शांति', 'एक भक्त', 'अतिरिक्त दीया', 'पर्व पूजाएँ'],
    ['te', 'కార్తీక పౌర్ణమి ప్రత్యేకం: గంగా దీపదాన పూజ', 'మనశ్శాంతి', 'ఒక భక్తుడు', 'అదనపు దీపం', 'పండుగ పూజలు'],
  ])('%s: title, temple, benefits, packages, add-ons and category', async (lang, title, benefit, pkg, addon, category) => {
    await i18n.changeLanguage(lang);
    const [puja] = await fetchPujaList();
    expect(puja.title).toBe(title);
    expect(puja.benefits[0].title).toBe(benefit);
    // Package labels are display-only; the package itself keeps its English name (booking payload).
    expect(puja.packageDisplayNames[String(puja.packageDetails[0].id)]).toBe(pkg);
    expect(puja.packageDetails[0].name).toBe('Single Devotee');
    expect(puja.addOns[0].name).toBe(addon);
    expect(puja.category).toBe(category);
    // English source, prices and filter keys are preserved for booking and URLs.
    expect(puja.titleEn).toBe(newPooja.name);
    expect(puja.addOns[0].nameEn).toBe('Extra Diya');
    expect(puja.packageDetails[0].price).toBe('₹551');
    expect(puja.templeNameEn).toBe('Dashashwamedh Ghat, Varanasi');
    expect(puja.categoryEn).toBe('FESTIVAL PUJAS');
    expect(getMissingTranslations()).toEqual([]);
  });

  test('detail page switches language without re-fetching', async () => {
    await i18n.changeLanguage('hi');
    const hindi = await getPujaById(newPooja._id);
    expect(hindi.title).toBe('कार्तिक पूर्णिमा विशेष: गंगा दीपदान पूजा');
    const callsAfterFirstLoad = axiosInstance.get.mock.calls.length;

    await i18n.changeLanguage('te');
    const telugu = await getPujaById(newPooja._id);
    await i18n.changeLanguage('en');
    const english = await getPujaById(newPooja._id);

    expect(telugu.title).toBe('కార్తీక పౌర్ణమి ప్రత్యేకం: గంగా దీపదాన పూజ');
    expect(english.title).toBe('Kartik Purnima Special: Ganga Deepdaan Puja');
    expect(axiosInstance.get.mock.calls.length).toBe(callsAfterFirstLoad);
  });

  test('matching Chadhava offerings are added in Hindi too, translated, with English kept for booking', async () => {
    await i18n.changeLanguage('hi');
    const puja = await getPujaById(newPooja._id);
    const merged = puja.addOns.filter((a) => a.nameEn === 'Deep Daan' || a.nameEn === 'Ganga Aarti Seva');
    expect(merged.map((a) => a.name)).toEqual(['दीपदान', 'गंगा आरती सेवा']);
    expect(puja.textTranslations.te['Ganga Aarti Seva']).toBe('గంగా హారతి సేవ');
  });

  test('billing lookup covers the title and every add-on in both languages', async () => {
    const [puja] = await fetchPujaList();
    expect(puja.textTranslations.hi[newPooja.name]).toBe('कार्तिक पूर्णिमा विशेष: गंगा दीपदान पूजा');
    expect(puja.textTranslations.te['Extra Diya']).toBe('అదనపు దీపం');
    expect(puja.textTranslations.te['Single Devotee']).toBe('ఒక భక్తుడు');
  });
});

describe('new Chadhava from the API', () => {
  test.each([
    ['hi', 'दीपदान', 'माँ गंगा का आशीर्वाद'],
    ['te', 'దీపదానం', 'గంగమ్మ ఆశీర్వాదం'],
  ])('%s: index-keyed offerings and benefits are translated', (lang, offering, benefit) => {
    const view = localizeChadhava(newChadhava, lang);
    expect(view.offerings[0].title).toBe(offering);
    expect(view.offerings[0].price).toBe(101);
    expect(view.offerings[0].titleEn).toBe('Deep Daan');
    expect(view.benefits[0].title).toBe(benefit);
    expect(view.titleEn).toBe(newChadhava.title);
  });

  test('billing receives translated names for the Chadhava and its offerings', () => {
    const texts = buildTextTranslations(newChadhava, [newChadhava.title, 'Deep Daan', 'Ganga Aarti Seva'], localizeChadhava);
    expect(texts.hi['Deep Daan']).toBe('दीपदान');
    expect(texts.te[newChadhava.title]).toBe('కార్తీక పౌర్ణమి ప్రత్యేకం: గంగా దీపదాన పూజ');
  });

  test('Chadhava list page switches language live without a new request', async () => {
    axiosInstance.get.mockImplementation(respond({ '/chadhava': { items: [newChadhava] } }));
    render(<Chadhava />);
    expect(await screen.findByText(newChadhava.title)).toBeInTheDocument();
    const calls = axiosInstance.get.mock.calls.length;

    await act(async () => { await i18n.changeLanguage('hi'); });
    expect(await screen.findByText('कार्तिक पूर्णिमा विशेष: गंगा दीपदान पूजा')).toBeInTheDocument();
    await act(async () => { await i18n.changeLanguage('te'); });
    expect(await screen.findByText('కార్తీక పౌర్ణమి ప్రత్యేకం: గంగా దీపదాన పూజ')).toBeInTheDocument();
    expect(axiosInstance.get.mock.calls.length).toBe(calls);
  });
});

describe('fallback for untranslated new content', () => {
  test('shows English (never blank) and reports exactly what is missing', () => {
    const untranslated = { ...newChadhava, _id: 'brand-new', id: 'brand-new', translations: undefined, title: 'Brand New Seva Chadhawa' };
    const view = localizeChadhava(untranslated, 'te');
    expect(view.title).toBe('Brand New Seva Chadhawa');
    expect(getMissingTranslations()).toEqual([
      expect.objectContaining({ language: 'te', kind: 'chadhava', id: 'brand-new', fields: expect.arrayContaining(['title', 'description']) }),
    ]);
  });

  test('partially translated records report only the missing fields', () => {
    const partial = { ...newChadhava, translations: { hi: { title: 'केवल शीर्षक' } } };
    const view = localizeChadhava(partial, 'hi');
    expect(view.title).toBe('केवल शीर्षक');
    expect(getMissingTranslations()[0].fields).toEqual(['description', 'templeName']);
  });

  test('English is never reported as missing', () => {
    localizeChadhava({ ...newChadhava, translations: undefined }, 'en');
    expect(getMissingTranslations()).toEqual([]);
  });
});

describe('booked items (My Bookings)', () => {
  test('use the linked record translation while its English still matches', () => {
    expect(translateBookedText(newPooja.name, newPooja, 'name', 'hi')).toBe('कार्तिक पूर्णिमा विशेष: गंगा दीपदान पूजा');
    expect(translateBookedText(newPooja.templeName, newPooja, 'templeName', 'te')).toBe('దశాశ్వమేధ ఘాట్, వారణాసి');
    // A booking made under an older English name is not given the new record's text.
    expect(translateBookedText('Old Puja Name', newPooja, 'name', 'hi')).toBe('Old Puja Name');
    expect(translateBookedText(newPooja.name, newPooja, 'name', 'en')).toBe(newPooja.name);
  });
});

describe('predefined reflection translations', () => {
  test.each(['hi', 'te'])('%s review text is localized while sample identity stays external to the text', (language) => {
    const review = { id: 'puja-1', review: 'I felt very peaceful while praying for my family.' };
    const localized = getLocalizedReviewText(review, language);
    expect(localized).toBeTruthy();
    expect(localized).not.toBe(review.review);
  });

  test.each(['hi', 'te'])('%s has localized copy for every predefined reflection', (language) => {
    const allReflections = [
      ...REVIEWS_AND_FEEDBACK.puja,
      ...REVIEWS_AND_FEEDBACK.chadhava,
    ];
    allReflections.forEach((review) => {
      expect(getLocalizedReviewText(review, language)).toBeTruthy();
      expect(getLocalizedReviewText(review, language)).not.toBe(review.review);
    });
  });
});
