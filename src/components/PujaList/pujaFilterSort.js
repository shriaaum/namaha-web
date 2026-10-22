/** Pure helpers for the Puja list filter/sort bar. Never mutates input. */

export const SORT_OPTIONS = ["date", "popularity", "topChoice", "name"];

const clean = (v) => String(v || "").trim();

// Filter values are the English text (stable across languages and in shared
// URLs); option labels are the text shown in the current language.
export const getOccasion = (puja) => clean(puja?.occasion) || clean(puja?.categoryEn || puja?.category);
const getOccasionLabel = (puja) => clean(puja?.occasion) || clean(puja?.category);
const getTemple = (puja) => clean(puja?.templeNameEn || puja?.templeName);

const uniqueOptions = (pujas, getValue, getLabel) => {
  const labels = new Map();
  pujas.forEach((p) => {
    const value = getValue(p);
    if (value && !labels.has(value)) labels.set(value, getLabel(p) || value);
  });
  return [...labels].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
};

export const getTempleOptions = (pujas) =>
  uniqueOptions(pujas, getTemple, (p) => clean(p.templeName));

export const getOccasionOptions = (pujas) =>
  uniqueOptions(pujas, getOccasion, getOccasionLabel);

/**
 * `pujas` is expected to already be in the default (availability + date) order;
 * that order is kept for "date" and used as the tie-breaker for other sorts
 * because Array.prototype.sort is stable.
 */
export function applyPujaFilters(pujas, { temple = "", occasion = "", sort = "date" } = {}) {
  let out = pujas.filter(
    (p) =>
      (!temple || getTemple(p) === temple) &&
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
