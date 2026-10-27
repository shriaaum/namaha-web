import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "./PujaList.css";
import PujaFilters from "./PujaFilters";
import {
  applyPujaFilters,
  getTempleOptions,
  getOccasionOptions,
  SORT_OPTIONS,
} from "./pujaFilterSort";
import Footer from "../Footer/Footer";
import { usePujaList, isPujaUserSoldOut } from "../../data/pujaList";
import { useTranslation } from 'react-i18next';
import { cardImageProps } from "../../lib/img";

const INITIAL_VISIBLE_CARDS = 4;
const LOAD_MORE_STEP = 4;

const isPujaPastEvent = (puja) =>
  typeof puja?.isPastEvent === "boolean"
    ? puja.isPastEvent
    : isPujaUserSoldOut(puja);

const normalizeBenefitTitles = (benefits) => {
  if (Array.isArray(benefits)) {
    return benefits
      .map((b) => {
        if (!b) return null;
        if (typeof b === "string") return b;
        if (typeof b === "object") return b.title || b.name || b.benefitTitle || null;
        return null;
      })
      .filter(Boolean)
      .map((t) => String(t).replace(/<[^>]*>/g, "").trim())
      .filter(Boolean);
  }
  if (typeof benefits === "string") {
    return benefits
      .replace(/<[^>]*>/g, "")
      .split(/[\n,•]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

function PujaList() {
  const { t } = useTranslation();
  const { pujas: pujaList, loading, error } = usePujaList();
  const navigate = useNavigate();

  // Upcoming first, then sold-out; keep date-wise order within each group.
  const baseSortedPujas = [...pujaList].sort((a, b) => {
    const dateA = Number(a.eventDateRaw || 0);
    const dateB = Number(b.eventDateRaw || 0);
    const pastA = isPujaPastEvent(a);
    const pastB = isPujaPastEvent(b);

    // Upcoming items first (bookable pujas on top).
    if (pastA !== pastB) return pastA ? 1 : -1;

    // Upcoming group: nearest date first.
    if (!pastA && !pastB && dateA !== dateB) return dateA - dateB;

    // Past group: most recently ended first.
    if (pastA && pastB && dateA !== dateB) return dateB - dateA;

    return (a.rank ?? 9999) - (b.rank ?? 9999);
  });

  // Filters/sort live in the URL (?temple=&occasion=&sort=) so they survive refresh/share.
  const [searchParams, setSearchParams] = useSearchParams();
  const sortParam = searchParams.get("sort");
  const filters = {
    temple: searchParams.get("temple") || "",
    occasion: searchParams.get("occasion") || "",
    sort: SORT_OPTIONS.includes(sortParam) ? sortParam : "date",
  };
  const setFilters = (next) => {
    const params = {};
    if (next.temple) params.temple = next.temple;
    if (next.occasion) params.occasion = next.occasion;
    if (next.sort && next.sort !== "date") params.sort = next.sort;
    setSearchParams(params, { replace: true });
  };
  const sortedPujas = applyPujaFilters(baseSortedPujas, filters);

  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_CARDS);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_CARDS);
  }, [sortedPujas.length]);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop =
        window.pageYOffset || document.documentElement.scrollTop || 0;
      const viewportHeight = window.innerHeight || 0;
      const fullHeight = document.documentElement.scrollHeight || 0;
      const firstCard = document.querySelector(".pl-card");
      const cardHeight = firstCard?.getBoundingClientRect?.().height || 400;
      const halfCardHeightThreshold = cardHeight / 2;
      const nearBottom =
        scrollTop + viewportHeight >= fullHeight - halfCardHeightThreshold;

      if (!nearBottom) return;
      setVisibleCount((prev) =>
        Math.min(prev + LOAD_MORE_STEP, sortedPujas.length)
      );
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [sortedPujas.length]);

  const visiblePujas = sortedPujas.slice(0, visibleCount);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <main className="puja-list-page" aria-busy="true">
        <div className="pl-loading-overlay" role="status" aria-live="polite">
          <div className="pl-loading-spinner" aria-hidden="true" />
          <div className="pl-loading-text">{t('puja.loading')}</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="puja-list-page">
        <div className="pl-loading-overlay">
          <p className="pl-loading-text">{t('puja.loadError')}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="puja-list-page">
      {/* ================= PUJA LIST ================= */}
      <section className="pl-upcoming">
        <h1 className="pl-main-heading">
          {t('puja.listTitle')}
        </h1>
        <h2 className="pl-upcoming-title">
          {t('puja.upcoming', { count: sortedPujas.length })}
        </h2>

        <PujaFilters
          temples={getTempleOptions(pujaList)}
          occasions={getOccasionOptions(pujaList)}
          value={filters}
          onChange={setFilters}
          alwaysShowClear
          onClear={() => setFilters({ temple: "", occasion: "", sort: "date" })}
        />

        {sortedPujas.length === 0 && (
          <p className="pf-empty">
            {t('puja.noMatch', { defaultValue: 'No pujas match your filters.' })}
          </p>
        )}

        <div className="pl-cards">
          {visiblePujas.map((puja) => {
            const isPastEvent = isPujaPastEvent(puja);
            return (
            <div
              key={puja.id}
              className="pl-card"
              onClick={() => !isPastEvent && navigate(`/puja/${puja.id}`)}
              style={{ cursor: isPastEvent ? 'default' : 'pointer' }}
              onMouseEnter={() => puja.bannerUrls?.forEach(b => { if (b?.url) new Image().src = b.url; })}
            >

              <div className={`pl-card-banner ${puja.imageClass}`}>
                {puja.bannerUrls?.[0] && (
                  <img
                    {...cardImageProps(puja.bannerUrls[0].url, puja.bannerUrls[0].variants)}
                    width="400"
                    height="200"
                    alt=""
                    aria-hidden="true"
                    className="pl-banner-img-fade"
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <div className="pl-card-overlay" />
                {isPastEvent ? (
                  <span className="pl-top-choice-tag sold-out">{t('puja.soldOut')}</span>
                ) : (
                  puja.topChoice && (
                    <span className="pl-top-choice-tag">{t('puja.topChoice')}</span>
                  )
                )}
              </div>

              {/* category: puja type/classification */}
              {/* <p className="pl-card-category">{puja.category}</p> */}
              <h3 className="pl-card-title">{puja.title}</h3>
              {(() => {
                const titles = normalizeBenefitTitles(puja.benefits).slice(0, 2);
                if (titles.length === 0) return null;
                return (
                  <ul className="pl-card-benefits" aria-label={t('puja.benefits')}>
                    {titles.map((title, idx) => (
                      <li key={idx}>{title}</li>
                    ))}
                  </ul>
                );
              })()}
              {/* duration: estimated puja time */}
              {/* <p className="pl-card-meta">Duration: {puja.duration}</p> */}
              <p className="pl-card-meta">🏛 {puja.templeName}</p>
              {/* occasion: auspicious date/event when puja is performed */}
              <p className="pl-card-meta pl-card-date">📅 {puja.displayDate || puja.date}</p>

              {isPastEvent ? (
                <div className="pl-card-participate pl-card-participate-disabled">
                  {t('common.bookingClosed')}
                </div>
              ) : (
                <Link to={`/puja/${puja.id}`} className="pl-card-participate">
                  {t('common.bookNow')} <span className="btn-icon">🙏🏻</span>
                </Link>
              )}
            </div>
          )})}
        </div>
      </section>

      
      <Footer />
    </main>
  );
}

export default PujaList;
