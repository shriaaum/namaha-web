/**
 * Current admin content (Oct 2026 pujas/chadhavas) is shown in Hindi/Telugu from
 * the reviewed word list, while English sources used by bookings stay intact.
 */
import { localizeChadhava } from '../cmsText';
import { localizePooja } from '../../data/pujaList';

const SCRIPT = { hi: /[ऀ-ॿ]/, te: /[ఀ-౿]/ };

const pooja = {
  _id: 'p1',
  name: 'Diwali Kali Puja Special : Maa Kali Shaktipeeth Nishiratri Raksha Puja',
  templeName: 'Kalighat Kali Temple, Kolkata',
  category: { _id: 'c1', category: 'Poojas' },
  benefits: [{ title: '1. Divine Blessings of Surya Dev' }],
  packageDetails: [{ _id: 'k1', name: 'Individual Puja', price: 601 }],
  addOns: [],
};

const chadhava = {
  _id: 'ch1',
  title: 'Chhath Puja Special : Sandhya Arghya Chadhawa at Ganga Ghat',
  buttonText: 'Book Here',
  offerings: [{ title: 'Milk Abhishek', price: 151 }],
};

describe.each(['hi', 'te'])('%s', (language) => {
  test('puja title, temple, category and benefits are translated', () => {
    const shown = localizePooja(pooja, language);
    ['name', 'templeName'].forEach((field) => expect(shown[field]).toMatch(SCRIPT[language]));
    expect(shown.category.category).toMatch(SCRIPT[language]);
    expect(shown.benefits[0].title).toMatch(/^1\. /);
    expect(shown.benefits[0].title).toMatch(SCRIPT[language]);
    expect(shown.nameEn).toBe(pooja.name);
    expect(shown.packageDetails[0].nameEn).toBe('Individual Puja');
  });

  test('chadhava title, button and offerings are translated; English kept for bookings', () => {
    const shown = localizeChadhava(chadhava, language);
    expect(shown.title).toMatch(SCRIPT[language]);
    expect(shown.buttonText).toMatch(SCRIPT[language]);
    expect(shown.offerings[0].title).toMatch(SCRIPT[language]);
    expect(shown.titleEn).toBe(chadhava.title);
    expect(shown.offerings[0].titleEn).toBe('Milk Abhishek');
    expect(shown.offerings[0].price).toBe(151);
  });
});

test('English is unchanged', () => {
  expect(localizePooja(pooja, 'en').name).toBe(pooja.name);
  expect(localizeChadhava(chadhava, 'en').title).toBe(chadhava.title);
});
