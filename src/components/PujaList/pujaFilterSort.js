/** Pure helpers for the Puja list filter/sort bar. Never mutates input. */

export const SORT_OPTIONS = ["date", "popularity", "topChoice", "name"];

const clean = (v) => String(v || "").trim();

export const getOccasion = (puja) => clean(puja?.occasion) || clean(puja?.category);

const uniqueSorted = (values) =>
  [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

export const getTempleOptions = (pujas) =>
  uniqueSorted(pujas.map((p) => clean(p.templeName)));

export const getOccasionOptions = (pujas) =>
  uniqueSorted(pujas.map(getOccasion));

/**
 * `pujas` is expected to already be in the default (availability + date) order;
 * that order is kept for "date" and used as the tie-breaker for other sorts
 * because Array.prototype.sort is stable.
 */
export function applyPujaFilters(pujas, { temple = "", occasion = "", sort = "date" } = {}) {
  let out = pujas.filter(
    (p) =>
      (!temple || clean(p.templeName) === temple) &&
      (!occasion || getOccasion(p) === occasion)
  );

  const bySort = {
    popularity: (a, b) => (b.bookingCount || 0) - (a.bookingCount || 0),
    topChoice: (a, b) => Number(!!b.topChoice) - Number(!!a.topChoice),
    name: (a, b) => clean(a.title).localeCompare(clean(b.title)),
  }[sort];

  if (bySort) out = [...out].sort(bySort);
  return out;
}
