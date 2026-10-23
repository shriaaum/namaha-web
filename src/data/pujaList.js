import axiosInstance from "../lib/instance";
import { useState, useEffect } from "react";
import i18n from '../i18n';
import { localizeRecord, localizePujaRecord, getDateLocale, reportMissingTranslations, buildTextTranslations } from '../i18n/content';
import { localizeChadhava, translateCmsText } from '../i18n/cmsText';

const translatePujaFields = (record, language) => {
  if (!record || typeof record !== 'object') return record;
  const translate = (value) => translateCmsText(value, language);
  return {
    ...record,
    name: translate(record.name),
    description: translate(record.description),
    templeName: translate(record.templeName),
    templeDescription: translate(record.templeDescription),
    aboutPuja: translate(record.aboutPuja),
    category: record.category && typeof record.category === 'object'
      ? { ...record.category, category: translate(record.category.category) }
      : record.category,
    benefits: Array.isArray(record.benefits)
      ? record.benefits.map((benefit) => ({
          ...benefit,
          title: translate(benefit?.title),
          subtitle: translate(benefit?.subtitle),
        }))
      : record.benefits,
    addOns: Array.isArray(record.addOns)
      ? record.addOns.map((addOn) => ({ ...addOn, name: translate(addOn?.name) }))
      : record.addOns,
    packageDetails: Array.isArray(record.packageDetails)
      ? record.packageDetails.map((pkg) => ({ ...pkg, name: translate(pkg?.name) }))
      : record.packageDetails,
  };
};

/**
 * Display-only localization for Pooja CMS records. `*En` retains the exact
 * English source used by booking payloads; API-provided record translations
 * are applied last and therefore override local reviewed fallbacks.
 */
export const localizePooja = (record, language) => {
  if (!record || typeof record !== 'object') return record;
  const withEnglish = {
    ...record,
    nameEn: record.name,
    addOns: Array.isArray(record.addOns)
      ? record.addOns.map((addOn) => ({ ...addOn, nameEn: addOn?.name }))
      : record.addOns,
    packageDetails: Array.isArray(record.packageDetails)
      ? record.packageDetails.map((pkg) => ({ ...pkg, nameEn: pkg?.name }))
      : record.packageDetails,
  };
  return localizeRecord(
    translatePujaFields(localizePujaRecord(withEnglish, language), language),
    language
  );
};

/** Grid column count for Puja list + Special Puja cards (see PujaList.css `.pl-cards`, SpecialPuja.css `.sp-cards`). */
export const PUJA_LIST_GRID_COLUMNS = 4;

/** Same as Chadhava list: `eventDateRaw > 0` and not after now → treat as past event. */
export const computePujaIsPastEvent = (eventDateRaw) => {
  const raw = Number(eventDateRaw) || 0;
  return raw > 0 && raw <= Date.now();
};

/** Admin/API policy: true = sold/blocked; false|null|undefined = fallback to event date-time check. */
export const normalizeApiSoldTag = (value) => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  if (s === "none" || s === "") return null;
  return null;
};

const IST_TIMEZONE = "Asia/Kolkata";
const IST_OFFSET_MINUTES = 330; // UTC+05:30 (no DST)

const getIstDatePartsFromDate = (dateObj) => {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateObj);
  const day = Number(parts.find((p) => p.type === "day")?.value || 0);
  const month = Number(parts.find((p) => p.type === "month")?.value || 0);
  const year = Number(parts.find((p) => p.type === "year")?.value || 0);
  if (!year || !month || !day) return null;
  return { year, month, day };
};

/**
 * Build absolute timestamp using date + time interpreted strictly in Asia/Kolkata.
 * Returns 0 when either date or time is missing/invalid.
 */
export const getEventDateTimeRawInIST = (eventDateValue, eventTimeValue) => {
  const ev = eventDateValue ? new Date(eventDateValue) : null;
  const eventTimeStr = String(eventTimeValue || "").trim();
  if (!(ev instanceof Date) || Number.isNaN(ev.getTime()) || !eventTimeStr) return 0;
  const m = eventTimeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 0;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const istDateParts = getIstDatePartsFromDate(ev);
  if (
    !istDateParts ||
    !Number.isFinite(hh) ||
    !Number.isFinite(mm) ||
    hh < 0 ||
    hh > 23 ||
    mm < 0 ||
    mm > 59
  ) {
    return 0;
  }
  return (
    Date.UTC(
      istDateParts.year,
      istDateParts.month - 1,
      istDateParts.day,
      hh,
      mm,
      0,
      0
    ) -
    IST_OFFSET_MINUTES * 60 * 1000
  );
};

function computeUserSoldOutFromPolicyAndDate(policy, eventDateRaw) {
  if (policy === true) return true;
  return computePujaIsPastEvent(eventDateRaw);
}

/**
 * User-site booking/list "sold" state:
 * - `soldTag/soldTagPolicy === true` always blocks booking.
 * - Otherwise (false/null/missing), fallback is event date-time past check.
 * Never POST this from booking UI.
 */
export function isPujaUserSoldOut(puja) {
  if (!puja || typeof puja !== "object") return false;
  const policy = Object.prototype.hasOwnProperty.call(puja, "soldTagPolicy")
    ? puja.soldTagPolicy
    : normalizeApiSoldTag(puja.soldTag);
  return computeUserSoldOutFromPolicyAndDate(policy, puja.eventDateRaw);
}


const sortByAvailabilityThenDate = (a, b) => {
  const dateA = Number(a?.eventDateRaw || 0);
  const dateB = Number(b?.eventDateRaw || 0);
  const soldOutA = isPujaUserSoldOut(a);
  const soldOutB = isPujaUserSoldOut(b);

  // Bookable first (not sold / not past per policy+date).
  if (soldOutA !== soldOutB) return soldOutA ? 1 : -1;

  // Bookable group: nearest event first.
  if (!soldOutA && !soldOutB && dateA !== dateB) return dateA - dateB;

  // Sold/past group: most recently ended first.
  if (soldOutA && soldOutB && dateA !== dateB) return dateB - dateA;

  return (a.rank ?? 9999) - (b.rank ?? 9999);
};

const normalizeCompareText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getItemsFromChadhavaResponse = (data) => {
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.result?.items)) return data.result.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
};

const mapChadhavaOfferingsToAddOns = (offerings = []) =>
  offerings
    .map((offering, index) => {
      const price = Number(offering?.price ?? offering?.amount ?? 0);
      if (!Number.isFinite(price) || price <= 0) return null;
      return {
        id: offering?._id || offering?.id || `chadhava-offering-${index}`,
        name: offering?.title || offering?.name || "Chadhava Offering",
        price: `₹${price}`,
      };
    })
    .filter(Boolean);

/** Same date fields as `Chadhava.js` / `ChadhavaDetail.js` — used to hide merged puja add-ons when the event has ended. */
const getChadhavaItemEventDateRaw = (item) => {
  if (!item || typeof item !== "object") return 0;
  const raw = item.eventdate || item.eventDate || item.dateText || item.dateRange;
  return getEventDateTimeRawInIST(raw, item.eventTime);
};

// `chadhavaListRequest` (optional) is an already-started GET /chadhava, so the
// puja and chadhava requests run in parallel instead of one after the other.
const mergeMatchedChadhavaOfferings = async (puja, chadhavaListRequest) => {
  // Match on the English title: the displayed title may be Hindi/Telugu.
  const pujaNameKey = normalizeCompareText(puja?.titleEn || puja?.title || puja?.name);
  if (!pujaNameKey) return puja;

  try {
    const res = await (chadhavaListRequest || axiosInstance.get("/chadhava"));
    const chadhavaItems = getItemsFromChadhavaResponse(res?.data);
    if (!chadhavaItems.length) return puja;

    const matchedChadhava = chadhavaItems.find((item) => {
      const shortTitleKey = normalizeCompareText(item?.shortTitle);
      const titleKey = normalizeCompareText(item?.title);
      return shortTitleKey === pujaNameKey || titleKey === pujaNameKey;
    });
    if (!matchedChadhava) return puja;

    let offerings = Array.isArray(matchedChadhava?.offerings)
      ? matchedChadhava.offerings
      : [];
    let detailItem = null;

    // Fallback: if offerings are not present in list API response, fetch detail.
    if (!offerings.length) {
      const detailId =
        matchedChadhava?._id ||
        matchedChadhava?.id ||
        matchedChadhava?.shortTitle ||
        matchedChadhava?.slug;
      if (detailId) {
        const detailRes = await cachedGet(`/chadhava/${encodeURIComponent(detailId)}`);
        detailItem =
          detailRes?.data?.item ||
          detailRes?.data?.data?.item ||
          detailRes?.data?.data ||
          detailRes?.data;
        if (detailItem && typeof detailItem === "object") {
          offerings = Array.isArray(detailItem?.offerings) ? detailItem.offerings : [];
        }
      }
    }

    const eventSource =
      detailItem && typeof detailItem === "object" ? detailItem : matchedChadhava;
    const chadhavaEventRaw = getChadhavaItemEventDateRaw(eventSource);
    if (chadhavaEventRaw > 0 && chadhavaEventRaw <= Date.now()) {
      return puja;
    }

    const chadhavaAddOns = mapChadhavaOfferingsToAddOns(offerings);
    if (!chadhavaAddOns.length) return puja;

    // Offering names: English kept as `nameEn` (booking payload), display text localized.
    const chadhavaRecord = { ...matchedChadhava, ...(detailItem || {}), offerings };
    const localizedOfferings = localizeChadhava(chadhavaRecord, i18n.language)?.offerings || [];
    const localizedNameByEnglish = new Map(
      offerings.map((o, index) => [o?.title || o?.name, localizedOfferings[index]?.title])
    );
    const offeringTexts = buildTextTranslations(chadhavaRecord, offerings.map((o) => o?.title), localizeChadhava);

    const existingAddOns = Array.isArray(puja?.addOns) ? puja.addOns : [];
    const existingNames = new Set(
      existingAddOns.map((a) => normalizeCompareText(a?.nameEn || a?.name))
    );
    const uniqueChadhavaAddOns = chadhavaAddOns
      .filter((addon) => !existingNames.has(normalizeCompareText(addon?.name)))
      .map((addon) => ({ ...addon, nameEn: addon.name, name: localizedNameByEnglish.get(addon.name) || addon.name }));

    if (!uniqueChadhavaAddOns.length) return puja;
    const textTranslations = { ...(puja.textTranslations || {}) };
    Object.entries(offeringTexts).forEach(([language, map]) => {
      textTranslations[language] = { ...(textTranslations[language] || {}), ...map };
    });
    return {
      ...puja,
      textTranslations,
      addOns: [...existingAddOns, ...uniqueChadhavaAddOns],
    };
  } catch (error) {
    console.warn("Chadhava add-on merge skipped:", error?.message || error);
    return puja;
  }
};

/* =====================================================
   MAP API RESPONSE → UI FORMAT
===================================================== */
const mapApiPujaToPUJA_LIST = (apiPuja) => {
  // English source kept for booking payloads/invoices (`titleEn`, add-on `nameEn`).
  const source = apiPuja;
  const englishAddonNames = new Map((source.addOns || []).map((a) => [String(a._id), a.name]));
  // Reviewed local translations first; CMS `translations` (when the API sends them) override.
  apiPuja = localizePooja(apiPuja, i18n.language);
  reportMissingTranslations("pooja", source, apiPuja, ["name", "description", "templeName", "templeDescription", "aboutPuja", "duration"], i18n.language);
  const ev = apiPuja.eventDate ? new Date(apiPuja.eventDate) : null;
  const fallback = apiPuja.createdAt ? new Date(apiPuja.createdAt) : null;
  const displayDateObj =
    ev && !isNaN(ev.getTime())
      ? ev
      : fallback && !isNaN(fallback.getTime())
        ? fallback
        : null;

  // Booking fallback must use a combined eventDate + eventTime only.
  // If either piece is missing/invalid, keep eventDateRaw = 0 (do not date-only block).
  const eventDateTimeRaw = getEventDateTimeRawInIST(apiPuja.eventDate, apiPuja.eventTime);

  const eventPieces = (() => {
    if (!displayDateObj) return { eventDate: null, eventDateRaw: 0, date: "—", displayDate: "—" };
    const dateFormat = {
      timeZone: IST_TIMEZONE,
      day: "numeric",
      month: "short",
      year: "numeric",
    };
    // `date` stays en-GB: it is parsed by PujaDetail and saved into bookings by BillingPage.
    const formatted = new Intl.DateTimeFormat("en-GB", dateFormat).format(displayDateObj);
    return {
      eventDate: formatted,
      eventDateRaw: eventDateTimeRaw,
      date: formatted,
      displayDate: new Intl.DateTimeFormat(getDateLocale(i18n.language), dateFormat).format(displayDateObj),
    };
  })();

  const soldTagPolicy = normalizeApiSoldTag(apiPuja.soldTag ?? apiPuja.soldTagPolicy);
  const isPastEvent = computeUserSoldOutFromPolicyAndDate(
    soldTagPolicy,
    eventPieces.eventDateRaw
  );

  return {
  id: apiPuja._id,
  rank: apiPuja.rank ?? 9999,
  specialTag: apiPuja.category?.category || `${apiPuja.section} Special`,
  tagColor:
    apiPuja.section === "others"
      ? "blue"
      : apiPuja.section === "wealth"
      ? "red"
      : "green",
  topChoice: apiPuja.isTagRequired,
  promoText: `${apiPuja.name} Puja - ${
    apiPuja.description || "Divine Blessings"
  }`,
  // category: puja type/classification (e.g. GENERAL PUJA, FESTIVAL, WEALTH)
  category: apiPuja.category?.category?.toUpperCase() || i18n.t("pujaDetail.generalPujaCategory"),
  categoryEn: source.category?.category?.toUpperCase() || "GENERAL PUJA",
  title: apiPuja.name,
  titleEn: source.name,
  // Hindi/Telugu for the English names Billing receives (live language switch there).
  textTranslations: buildTextTranslations(
    source,
    [source.name, ...(source.addOns || []).map((a) => a.name), ...(source.packageDetails || []).map((p) => p.name)],
    localizePooja
  ),
  location:
    apiPuja.customSection ||
    `${
      apiPuja.section?.charAt(0).toUpperCase() + apiPuja.section?.slice(1)
    } Temple, India`,
  ...eventPieces,
  addOns:
    apiPuja.addOns?.map((addon) => ({
      name: addon.name,
      nameEn: englishAddonNames.get(String(addon._id)) || addon.name,
      price: `₹${addon.price}`,
      id: addon._id,
    })) || [],
  // Package `name` stays English: it goes into the booking payload/snapshot.
  // Localized labels are display-only, looked up by package id.
  packageDetails:
    apiPuja.packageDetails?.map((pkg) => ({
      persons: pkg.persons,
      name: pkg.nameEn || pkg.name,
      price: `₹${pkg.price}`,
      id: pkg._id,
    })) || [],
  packageDisplayNames: Object.fromEntries(
    (apiPuja.packageDetails || []).map((pkg) => [String(pkg._id), pkg.name])
  ),
  imageClass: `pl-card-${Math.floor(Math.random() * 3) + 1}`,
  // templeName: temple/venue name (API may return as temple.name, temple.templeName, or templeName)
  templeName: apiPuja.temple?.name || apiPuja.temple?.templeName || apiPuja.templeName || apiPuja.customSection || null,
  templeNameEn: source.temple?.name || source.temple?.templeName || source.templeName || source.customSection || null,
  templeDescription: apiPuja.templeDescription,
  aboutPuja: apiPuja.aboutPuja,
  description: apiPuja.description || null,
  rating: "4.9",
  ratingCount: `${Math.floor(Math.random() * 6 + 2)}K+`,
  devoteesCount: `${Math.floor(Math.random() * 4 + 1)}0,000+`,
  carouselImages: apiPuja.bannerUrls?.map(() => "pl-card-1") || [
    "pl-card-1",
    "pl-card-1",
    "pl-card-1",
  ],
  bannerUrls: apiPuja.bannerUrls,
  // duration: estimated time for the puja (e.g. "1-2 hours", "30 mins")
  duration: apiPuja.duration,
  mode: apiPuja.mode,
  benefits: apiPuja.benefits,
  isActive: apiPuja.isActive,
  // popularity: paid bookings count from backend (GET /pooja)
  bookingCount: Number(apiPuja.bookingCount) || 0,
  section: apiPuja.section,
  // occasion: auspicious event/festival when puja is performed (e.g. Ram Navami, Diwali)
  occasion: apiPuja.occasion || apiPuja.eventOccasion || apiPuja.specialTag || null,
  // Admin soldTag (true/false/none) OR event date when policy is none
  soldTagPolicy,
  isPastEvent,
  soldTag: isPastEvent,
  coupon: apiPuja.coupon
    ? {
        code: apiPuja.coupon.code,
        discountType: apiPuja.coupon.discountType,
        discountValue: apiPuja.coupon.discountValue,
        maxDiscountAmount: apiPuja.coupon.maxDiscountAmount,
        expiryDate: apiPuja.coupon.expiryDate
          ? new Date(apiPuja.coupon.expiryDate).toLocaleDateString("en-IN")
          : null,
        isActive: apiPuja.coupon.isActive,
      }
    : null,
  // Multiple coupons per pooja (backend); legacy single coupon as one-item list
  coupons:
    apiPuja.coupons?.length > 0
      ? apiPuja.coupons.map((c) => ({
          code: c.code,
          discountType: c.discountType,
          discountValue: c.discountValue,
          maxDiscountAmount: c.maxDiscountAmount,
          expiryDate: c.expiryDate
            ? new Date(c.expiryDate).toLocaleDateString("en-IN")
            : null,
          isActive: c.isActive !== false,
        }))
      : apiPuja.coupon
        ? [
            {
              code: apiPuja.coupon.code,
              discountType: apiPuja.coupon.discountType,
              discountValue: apiPuja.coupon.discountValue,
              maxDiscountAmount: apiPuja.coupon.maxDiscountAmount,
              expiryDate: apiPuja.coupon.expiryDate
                ? new Date(apiPuja.coupon.expiryDate).toLocaleDateString("en-IN")
                : null,
              isActive: apiPuja.coupon.isActive !== false,
            },
          ]
        : [],
  };
};

/* =====================================================
   🔥 DUMMY DATA (USED IF API FAILS)
===================================================== */
export const PUJA_LIST = [
  {
    id: "1001",
    rank: 1,
    eventDateRaw: new Date("2026-02-12").getTime(),
    specialTag: "MOST POPULAR",
    tagColor: "red",
    topChoice: true,
    promoText: "Maha Ganapathi Puja - Remove obstacles and gain success",
    category: "GANESHA PUJA",
    title: "Maha Ganapathi Homam",
    description: "Removes obstacles and brings prosperity.",
    benefits: [
      { title: "Removes obstacles from your path" },
      { title: "Brings success and prosperity" },
    ],
    purpose: "Removes obstacles and brings prosperity",
    location: "Tirupati Temple, India",
    templeName: "Tirupati Temple",
    date: "12 Feb 2026",
    imageClass: "pl-card-1",
    rating: "4.9",
    ratingCount: "5K+",
    devoteesCount: "50,000+",
    carouselImages: ["pl-card-1", "pl-card-1", "pl-card-1"],
    bannerUrls: [
      {
        url: "https://images.unsplash.com/photo-1604608672516-3b5c9b1c6b14",
      },
      {
        url: "https://images.unsplash.com/photo-1593697820988-9b9f0f9b1d8b",
      },
    ],
    duration: "2 hours",
    mode: "online",
  },
  {
    id: "1002",
    rank: 2,
    eventDateRaw: new Date("2026-02-15").getTime(),
    specialTag: "WEALTH SPECIAL",
    tagColor: "green",
    topChoice: false,
    promoText: "Lakshmi Kubera Puja - Attract wealth and abundance",
    category: "LAKSHMI PUJA",
    title: "Lakshmi Kubera Homam",
    description: "Attract wealth and abundance through sacred offerings.",
    benefits: [
      { title: "Attracts wealth and abundance" },
      { title: "Improves financial stability" },
    ],
    purpose: "Financial growth and prosperity",
    location: "Chennai Temple, India",
    templeName: "Chennai Temple",
    date: "15 Feb 2026",
    imageClass: "pl-card-2",
    rating: "4.8",
    ratingCount: "3K+",
    devoteesCount: "30,000+",
    carouselImages: ["pl-card-1", "pl-card-1", "pl-card-1"],
    bannerUrls: [
      {
        url: "https://images.unsplash.com/photo-1619441207975-6d4d1a7e676f",
      },
    ],
    duration: "3 hours",
    mode: "online",
  },
];

/* =====================================================
   FETCH PUJA LIST FROM API
===================================================== */
export const fetchPujaList = async () => {
  const response = await axiosInstance.get("/pooja", { params: { upcoming: true, limit: 100 } });

  let poojasArray = [];

  if (Array.isArray(response.data)) {
    poojasArray = response.data;
  } else if (response.data?.poojas && Array.isArray(response.data.poojas)) {
    poojasArray = response.data.poojas;
  }

  return poojasArray
    .filter((p) => p?.isHidden !== true)
    .map(mapApiPujaToPUJA_LIST)
    .sort(sortByAvailabilityThenDate);
};

// React hook: usePujaList provides pujas + loading + error for components
export function usePujaList() {
  const [pujas, setPujas] = useState([]);
  const [rawPujas, setRawPujas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await axiosInstance.get("/pooja", { params: { upcoming: true, limit: 100 } });
        const data = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.poojas)
            ? response.data.poojas
            : [];
        if (!mounted) return;
        setRawPujas(data);
        setPujas(data.filter((p) => p?.isHidden !== true).map(mapApiPujaToPUJA_LIST).sort(sortByAvailabilityThenDate));
      } catch (err) {
        if (!mounted) return;
        setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const onLanguageChanged = () => {
      setPujas(rawPujas.filter((p) => p?.isHidden !== true).map(mapApiPujaToPUJA_LIST).sort(sortByAvailabilityThenDate));
    };
    i18n.on('languageChanged', onLanguageChanged);
    return () => i18n.off('languageChanged', onLanguageChanged);
  }, [rawPujas]);

  return { pujas, loading, error };
}
/* =====================================================
   FETCH SINGLE PUJA BY ID - uses GET /api/pooja/:id
===================================================== */
/*
 * Short-lived cache of raw GET responses used by the Pooja detail page. All
 * text is localized on the client from the raw record, so switching language
 * re-maps cached data instantly instead of re-fetching the same records.
 */
const RESPONSE_CACHE_MS = 2 * 60 * 1000;
const responseCache = new Map();
const cachedGet = (url) => {
  const hit = responseCache.get(url);
  if (hit && Date.now() - hit.at < RESPONSE_CACHE_MS) return hit.request;
  const request = axiosInstance.get(url);
  responseCache.set(url, { at: Date.now(), request });
  request.catch(() => responseCache.delete(url)); // never cache failures
  return request;
};
export const clearPujaResponseCache = () => responseCache.clear();

export const fetchPujaById = async (id) => {
  if (!id) return null;
  // Start the chadhava list (needed for the add-on merge) alongside the puja request.
  const chadhavaListRequest = cachedGet("/chadhava");
  chadhavaListRequest.catch(() => {}); // handled inside the merge; avoid unhandled-rejection noise
  try {
    const response = await cachedGet(`/pooja/${id}`);
    const raw = response.data;
    if (!raw) return null;
    // Handle wrapped responses: { pooja }, { data }, or raw array/object
    let apiPuja = raw;
    if (raw.pooja && typeof raw.pooja === "object") apiPuja = raw.pooja;
    else if (raw.data && typeof raw.data === "object") apiPuja = raw.data;
    const arr = Array.isArray(apiPuja) ? apiPuja : [apiPuja];
    const mapped = arr.map(mapApiPujaToPUJA_LIST);
    if (!mapped[0]) return null;
    return await mergeMatchedChadhavaOfferings(mapped[0], chadhavaListRequest);
  } catch (error) {
    if (error?.response?.status === 404) return null;
    console.error("fetchPujaById failed:", error);
    return null;
  }
};

export const getPujaById = async (id) => {
  try {
    const puja = await fetchPujaById(id);
    if (puja) return puja;
    // Fallback: fetch list and match (for legacy/short IDs)
    const allPujas = await fetchPujaList();
    return (
      allPujas.find((p) => p.id === id) ||
      allPujas.find((p) => p.id && p.id.slice(-4) === id) ||
      null
    );
  } catch (error) {
    console.error("getPujaById failed:", error);
    return null;
  }
};
