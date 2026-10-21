import { getEventDateTimeRawInIST, normalizeApiSoldTag } from '../../data/pujaList';

const RECOMMENDATION_STOP_WORDS = new Set([
  'chadhava', 'puja', 'pooja', 'temple', 'special', 'sacred', 'offering', 'festival', 'india', 'shri', 'shree', 'for', 'with', 'from', 'and', 'the', 'this', 'that',
]);

const normalizeRecommendationText = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const getRecommendationTokens = (...values) => new Set(
  values
    .flatMap((value) => normalizeRecommendationText(value).split(' '))
    .filter((token) => token.length > 3 && !RECOMMENDATION_STOP_WORDS.has(token))
);

const sharedTokenCount = (left, right) => [...left].filter((token) => right.has(token)).length;

export const getPujaPackagePrice = (puja) => {
  const packages = Array.isArray(puja?.packageDetails) ? puja.packageDetails : [];
  const prices = packages
    .map((item) => Number(item?.price))
    .filter((price) => Number.isFinite(price) && price > 0);
  return prices.length ? Math.min(...prices) : null;
};

/**
 * API banner entries are objects (`{ url, variants }`), while some legacy
 * records still return a bare URL. Keep that API detail out of the component.
 */
export const getPujaBannerImage = (puja) => {
  const candidates = [
    ...(Array.isArray(puja?.bannerUrls) ? puja.bannerUrls : []),
    puja?.bannerImage,
    puja?.image,
  ];

  for (const entry of candidates) {
    if (typeof entry === 'string' && entry.trim()) return { url: entry, variants: undefined };
    if (entry && typeof entry === 'object') {
      const url = entry.url || entry.secure_url || entry.imageUrl || entry.src;
      if (typeof url === 'string' && url.trim()) {
        return { url, variants: entry.variants || entry.imageVariants || undefined };
      }
    }
  }
  return null;
};

export const isPujaAvailableForRecommendation = (puja) => {
  if (!puja || puja.isActive === false || puja.isHidden === true || puja.isAvailable === false) return false;
  if (normalizeApiSoldTag(puja.soldTag ?? puja.soldTagPolicy) === true) return false;
  const eventDateRaw = getEventDateTimeRawInIST(puja.eventDate, puja.eventTime);
  return !(eventDateRaw > 0 && eventDateRaw <= Date.now());
};

export const findRelatedPuja = (chadhava, pujas) => {
  if (!chadhava || !Array.isArray(pujas)) return null;
  const chadhavaTemple = normalizeRecommendationText(chadhava.templeName || chadhava.temple?.name);
  const chadhavaTokens = getRecommendationTokens(
    chadhava.deity, chadhava.deityName, chadhava.deityNames,
    chadhava.festival, chadhava.occasion, chadhava.eventOccasion,
    chadhava.title, chadhava.name, chadhava.subtitle, chadhava.category
  );

  return pujas
    .filter((puja) => isPujaAvailableForRecommendation(puja) && getPujaPackagePrice(puja) != null)
    .map((puja) => {
      const temple = normalizeRecommendationText(puja.templeName || puja.temple?.name || puja.customSection);
      const pujaTokens = getRecommendationTokens(
        puja.deity, puja.deityName, puja.deityNames,
        puja.festival, puja.occasion, puja.eventOccasion, puja.specialTag,
        puja.name, puja.title, puja.category?.category, puja.section
      );
      const sharedTokens = sharedTokenCount(chadhavaTokens, pujaTokens);
      const sameTemple = Boolean(chadhavaTemple && temple && chadhavaTemple === temple);
      return { puja, score: (sameTemple ? 100 : 0) + sharedTokens, sameTemple, sharedTokens };
    })
    .filter(({ sameTemple, sharedTokens }) => sameTemple || sharedTokens > 0)
    .sort((a, b) => b.score - a.score || Number(a.puja.rank ?? 9999) - Number(b.puja.rank ?? 9999))[0]?.puja || null;
};
