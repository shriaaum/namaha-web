import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../../lib/instance';
import {
  PUJA_LIST_GRID_COLUMNS,
  normalizeApiSoldTag,
  isPujaUserSoldOut,
  getEventDateTimeRawInIST,
} from '../../data/pujaList';
import './Chadhava.css';
import PujaFilters from '../PujaList/PujaFilters';
import { applyPujaFilters, getTempleOptions, getOccasionOptions } from '../PujaList/pujaFilterSort';
import Footer from '../Footer/Footer';
import { useTranslation } from 'react-i18next';
import i18nInstance from '../../i18n';
import { localizeChadhava } from '../../i18n/cmsText';
import { getDateLocale, reportMissingTranslations } from '../../i18n/content';
import { localizeApiMessage } from '../../i18n/apiErrors';
import { cardImageProps } from '../../lib/img';

const INITIAL_VISIBLE_CARDS = 4;
const LOAD_MORE_STEP = 4;
// Chadhava has no popularity / top-choice data, so only these sorts apply.
const CHADHAVA_SORT_OPTIONS = ['date', 'name'];
const titleCase = (v) => String(v || '').replace(/\b\w/g, (c) => c.toUpperCase());

const getItemsFromResponse = (data) => {
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.result?.items)) return data.result.items;
  if (Array.isArray(data)) return data;
  return [];
};

const normalizeCard = (rawItem = {}) => {
  // Ids/dates come from the raw record; visible text from the localized copy.
  const item = localizeChadhava(rawItem, i18nInstance.language);
  reportMissingTranslations(
    'chadhava',
    rawItem,
    item,
    ['title', 'shortTitle', 'description', 'templeName', 'templeDescription', 'buttonText', 'category'],
    i18nInstance.language,
  );
  const rawId = rawItem.id || rawItem._id || rawItem.shortTitle || rawItem.slug || rawItem.title;
  const idOrShortTitle = rawItem.id || rawItem._id || rawItem.shortTitle || rawItem.slug;
  const rawDate = item.eventdate || item.eventDate || item.dateText || item.dateRange;
  const eventDateRaw = getEventDateTimeRawInIST(rawDate, item.eventTime);
  const soldTagPolicy = normalizeApiSoldTag(item.soldTag ?? item.soldTagPolicy);
  const card = {
    id: String(rawId || Math.random()),
    idOrShortTitle,
    title: item.title || i18nInstance.t('chadhava.untitled'),
    eventdate: rawDate || '',
    eventDateRaw,
    soldTagPolicy,
    description: item.description || i18nInstance.t('chadhava.detailsSoon'),
    bannerImage: item.bannerImage || item.image || item.thumbnail || '',
    bannerImageVariants: item.bannerImage ? item.bannerImageVariants : undefined,
    buttonText: item.buttonText || item.ctaText || i18nInstance.t('common.viewDetails'),
    // Filter values stay English (stable in URLs); labels follow the language.
    templeName: item.templeName || '',
    templeNameEn: rawItem.templeName || '',
    category: titleCase(item.category),
    categoryEn: titleCase(rawItem.category),
  };
  return {
    ...card,
    isPastEvent: isPujaUserSoldOut(card),
  };
};

/** Same rules as `pujaList.js`: admin `soldTag` + event date; bookable-first sort. */
const sortChadhavaByAvailabilityThenDate = (a, b) => {
  const dateA = Number(a?.eventDateRaw || 0);
  const dateB = Number(b?.eventDateRaw || 0);
  const soldA = isPujaUserSoldOut(a);
  const soldB = isPujaUserSoldOut(b);
  if (soldA !== soldB) return soldA ? 1 : -1;
  if (!soldA && !soldB && dateA !== dateB) return dateA - dateB;
  if (soldA && soldB && dateA !== dateB) return dateB - dateA;
  return 0;
};

function Chadhava() {
  const { t, i18n } = useTranslation();
  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Re-localize already-fetched items whenever the language changes.
  const cards = useMemo(
    () =>
      rawItems
        .filter((item) => item?.isHidden !== true)
        .map(normalizeCard)
        .filter((card) => card.idOrShortTitle || card.id)
        .sort(sortChadhavaByAvailabilityThenDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawItems, i18n.language]
  );
  const [expandedCards, setExpandedCards] = useState({});
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_CARDS);
  const navigate = useNavigate();
  const offeringsRef = useRef(null);

  // Filters/sort live in the URL (?temple=&occasion=&sort=) like the Puja list.
  const [searchParams, setSearchParams] = useSearchParams();
  const sortParam = searchParams.get('sort');
  const filters = {
    temple: searchParams.get('temple') || '',
    occasion: searchParams.get('occasion') || '',
    sort: CHADHAVA_SORT_OPTIONS.includes(sortParam) ? sortParam : 'date',
  };
  const setFilters = (next) => {
    const params = {};
    if (next.temple) params.temple = next.temple;
    if (next.occasion) params.occasion = next.occasion;
    if (next.sort && next.sort !== 'date') params.sort = next.sort;
    setSearchParams(params, { replace: true });
  };
  const filteredCards = useMemo(
    () => applyPujaFilters(cards, filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards, filters.temple, filters.occasion, filters.sort]
  );

  /* Banner sizing lives in `Chadhava.css` — mirrors `PujaList.css` `.pl-card-banner` */

  const formatEventDate = (value) => {
    if (!value) return t('chadhava.dateAnnounced');
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(getDateLocale(i18n.language), {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    return String(value);
  };

  useEffect(() => {
    let mounted = true;

    const loadChadhavaCards = async () => {
      try {
        setLoading(true);
        setError(false);
        setErrorMessage('');
        const res = await axiosInstance.get('/chadhava');
        const items = getItemsFromResponse(res?.data);
        if (!mounted) return;
        setRawItems(items);
      } catch (err) {
        if (!mounted) return;
        // Keep the server message (if any); the fallback is translated at render.
        setError(true);
        setErrorMessage(err?.response?.data?.message || '');
        setRawItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadChadhavaCards();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_CARDS);
  }, [filteredCards.length]);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop || 0;
      const viewportHeight = window.innerHeight || 0;
      const fullHeight = document.documentElement.scrollHeight || 0;
      const firstCard = document.querySelector('.ch-card');
      const cardHeight = firstCard?.getBoundingClientRect?.().height || 400;
      const halfCardHeightThreshold = cardHeight / 2;
      const nearBottom =
        scrollTop + viewportHeight >= fullHeight - halfCardHeightThreshold;

      if (!nearBottom) return;
      setVisibleCount((prev) => Math.min(prev + LOAD_MORE_STEP, filteredCards.length));
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [filteredCards.length]);

  const visibleCards = filteredCards.slice(0, visibleCount);

  return (
    <main className="chadhava-page">
      {/* Hero */}
      <section className="ch-hero">
        <div className="ch-hero-inner">
          <div className="ch-hero-content">
            <h1 className="ch-hero-title">
              {t('chadhava.listTitle')}
            </h1>
          </div>
        </div>
      </section>

      {/* Upcoming Chadhava offerings */}
      <section className="ch-offerings" ref={offeringsRef}>
        <div className="ch-offerings-header">
          <h2 className="ch-offerings-title">
            {t('chadhava.upcoming', { count: filteredCards.length })}
          </h2>
          {/* <p className="ch-offerings-subtitle">
            Experience the divine with Shri aaum Chadhava SHRI AAUM. Offer Chadhava at renowned
            temples across India, receiving blessings and a video recording of the ceremony
            performed by our Purohit ji on your behalf.
          </p> */}
        </div>

        {!loading && !error && cards.length > 0 && (
          <PujaFilters
            temples={getTempleOptions(cards)}
            occasions={getOccasionOptions(cards)}
            value={filters}
            onChange={setFilters}
            onClear={() => setFilters({ temple: '', occasion: '', sort: 'date' })}
            sortOptions={CHADHAVA_SORT_OPTIONS}
            alwaysShowClear
            title={t('chadhava.filterTitle', { defaultValue: 'Find your chadhava' })}
            subtitle={t('chadhava.filterSubtitle', { defaultValue: 'Filter by temple or occasion, and sort by date or name' })}
          />
        )}

        {loading ? (
          <div className="ch-loading-state" role="status" aria-live="polite">
            <div className="ch-loading-spinner" aria-hidden="true" />
            <p className="ch-loading-text">{t('chadhava.loading')}</p>
          </div>
        ) : error ? (
          <p className="ch-offerings-subtitle">{localizeApiMessage(errorMessage, t('chadhava.loadError'), t, i18n.language)}</p>
        ) : cards.length === 0 ? (
          <p className="ch-offerings-subtitle">{t('chadhava.empty')}</p>
        ) : filteredCards.length === 0 ? (
          <p className="pf-empty">{t('chadhava.noMatch', { defaultValue: 'No chadhava offerings match your filters.' })}</p>
        ) : (
          <div
            className={`ch-card-grid${visibleCards.length === 1 ? ' ch-card-grid--single' : ''}`}
            style={{ '--ch-grid-cols': String(PUJA_LIST_GRID_COLUMNS) }}
          >
            {visibleCards.map((card) => {
              const isPastEvent =
                typeof card.isPastEvent === 'boolean'
                  ? card.isPastEvent
                  : isPujaUserSoldOut(card);
              return (
              <article
                key={card.id}
                className="ch-card"
                onClick={() => !isPastEvent && navigate(`/chadhava/${encodeURIComponent(card.idOrShortTitle || card.id)}`)}
                style={{ cursor: isPastEvent ? 'default' : 'pointer' }}
                onMouseEnter={() => { if (card.bannerImage) new Image().src = card.bannerImage; }}
              >
                <div className="ch-card-banner">
                  {card.bannerImage && (
                    <img
                      {...cardImageProps(card.bannerImage, card.bannerImageVariants)}
                      width="400"
                      height="200"
                      alt=""
                      aria-hidden="true"
                      className="ch-banner-img-fade"
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  {isPastEvent ? (
                    <span className="ch-card-sold-out-tag">{t('puja.soldOut')}</span>
                  ) : null}
                </div>
                <div className="ch-card-body">
                  <h3 className="ch-card-title">{card.title}</h3>
                  <p className="ch-card-date">{formatEventDate(card.eventdate)}</p>
                  <p className={`ch-card-text ${expandedCards[card.id] ? 'is-expanded' : ''}`}>
                    {card.description}
                  </p>
                  {card.description && card.description.length > 140 && (
                    <button
                      type="button"
                      className="ch-card-readmore"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedCards((prev) => ({
                          ...prev,
                          [card.id]: !prev[card.id],
                        }));
                      }}
                    >
                      {expandedCards[card.id] ? t('common.readLess') : t('common.readMore')}
                    </button>
                  )}
                  {isPastEvent ? (
                    <div className="ch-card-cta ch-card-cta--disabled" aria-disabled="true">
                      {t('common.bookingClosed')}
                    </div>
                  ) : (
                    <Link
                      to={`/chadhava/${encodeURIComponent(card.idOrShortTitle || card.id)}`}
                      className="ch-card-cta"
                    >
                      {card.buttonText}
                    </Link>
                  )}
                </div>
              </article>
            )})}
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}

export default Chadhava;

