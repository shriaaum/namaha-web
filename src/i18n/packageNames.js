/*
 * Fallback labels for admin-entered package names ("Individual Puja",
 * "Couple ( 2 Member )", "6+ Family Member", ...). Used only when the record's
 * own translations did not localize the name, so a CMS translation always wins.
 * Display-only: booking payloads keep the English name.
 */
const PATTERNS = [
  [/^individual$/i, 'pujaDetail.pkgIndividual'],
  [/^individual puja$/i, 'pujaDetail.pkgIndividualPuja'],
  [/^couple$/i, 'pujaDetail.pkgCouple'],
  [/^(two|2) persons?$/i, 'pujaDetail.pkgTwoPerson'],
  [/^couple \(? ?(\d+) members? ?\)?$/i, 'pujaDetail.pkgCoupleMembers'],
  [/^family$/i, 'pujaDetail.pkgFamily'],
  [/^family \(? ?up to (\d+) members? ?\)?$/i, 'pujaDetail.pkgFamilyUpTo'],
  [/^joint family$/i, 'pujaDetail.pkgJoint'],
  [/^(\d+) ?\+ family members?$/i, 'pujaDetail.pkgFamilyPlus'],
];

/** Translated label for a known package-name shape, or null when the name is not recognised. */
export function translatePackageName(name, t) {
  if (typeof name !== 'string') return null;
  const normalized = name.trim().replace(/\s+/g, ' ');
  for (const [pattern, key] of PATTERNS) {
    const match = normalized.match(pattern);
    if (match) return t(key, { n: match[1] });
  }
  return null;
}

/**
 * Display name for a package: English stays as entered; other languages use the
 * already-localized name when it is no longer English, else the fallback label.
 */
export function localizePackageName(name, t, language, translateFallback) {
  if (!name || language === 'en') return name;
  if (!/[A-Za-z]{2,}/.test(name)) return name;
  const viaDictionary = translateFallback ? translateFallback(name) : name;
  if (viaDictionary && viaDictionary !== name) return viaDictionary;
  return translatePackageName(name, t) || name;
}
