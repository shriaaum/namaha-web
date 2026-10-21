import { findRelatedPuja, getPujaBannerImage, isPujaAvailableForRecommendation } from './relatedPuja';

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

  test('uses the URL and variants from an API banner object', () => {
    const banner = getPujaBannerImage({
      bannerUrls: [{
        url: 'https://cdn.example.com/pooja.jpg',
        variants: { 400: 'https://cdn.example.com/pooja-400.webp' },
      }],
    });

    expect(banner).toEqual({
      url: 'https://cdn.example.com/pooja.jpg',
      variants: { 400: 'https://cdn.example.com/pooja-400.webp' },
    });
  });

  test('supports legacy string banner URLs when no banner object is present', () => {
    expect(getPujaBannerImage({ bannerImage: 'https://cdn.example.com/legacy.jpg' }))
      .toEqual({ url: 'https://cdn.example.com/legacy.jpg', variants: undefined });
  });
});
