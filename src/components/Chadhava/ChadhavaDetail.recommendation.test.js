import { findRelatedPuja, isPujaAvailableForRecommendation } from './relatedPuja';

const matchingChadhava = {
  templeName: 'Kashi Vishwanath Temple',
  title: 'Maha Shivratri Chadhava',
};

const matchingPuja = {
  _id: 'puja-1',
  isActive: true,
  templeName: 'Kashi Vishwanath Temple',
  name: 'Maha Shivratri Puja',
  packageDetails: [{ price: 251 }],
};

describe('Chadhava related Pooja recommendations', () => {
  test('prefers an active, priced Puja at the same temple', () => {
    const otherPuja = {
      _id: 'puja-2',
      isActive: true,
      templeName: 'Different Temple',
      name: 'Lakshmi Puja',
      packageDetails: [{ price: 101 }],
    };

    expect(findRelatedPuja(matchingChadhava, [otherPuja, matchingPuja])).toBe(matchingPuja);
  });

  test('excludes inactive, sold-out, past, and unpriced Poojas', () => {
    const unavailable = [
      { ...matchingPuja, _id: 'inactive', isActive: false },
      { ...matchingPuja, _id: 'sold', soldTag: true },
      { ...matchingPuja, _id: 'past', eventDate: '2020-01-01', eventTime: '10:00' },
      { ...matchingPuja, _id: 'unpriced', packageDetails: [] },
    ];

    expect(unavailable.every((puja) => !isPujaAvailableForRecommendation(puja) || !puja.packageDetails.length)).toBe(true);
    expect(findRelatedPuja(matchingChadhava, unavailable)).toBeNull();
  });

  test('does not recommend a Puja without a deity, temple, or festival match', () => {
    expect(findRelatedPuja(matchingChadhava, [{
      ...matchingPuja,
      templeName: 'Different Temple',
      name: 'Lakshmi Puja',
    }])).toBeNull();
  });
});
