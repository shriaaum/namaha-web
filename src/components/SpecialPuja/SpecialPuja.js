import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./SpecialPuja.css";
import "../PujaList/PujaList.css";
import {
  usePujaList,
  PUJA_LIST_GRID_COLUMNS,
  isPujaUserSoldOut,
} from "../../data/pujaList";
import { useTranslation } from 'react-i18next';
import { cardImageProps } from "../../lib/img";

/** Same as PujaList: trust API-mapped `isPastEvent` when boolean; else policy + date via `isPujaUserSoldOut`. */
const isPujaPastEvent = (puja) =>
  typeof puja?.isPastEvent === "boolean"
    ? puja.isPastEvent
    : isPujaUserSoldOut(puja);

const SP_IMAGE_MAP = {
  1: "sp-banner-1",
  2: "sp-banner-2",
  3: "sp-banner-3",
};

const sortByAvailabilityThenDate = (a, b) => {
  const dateA = Number(a?.eventDateRaw || 0);
  const dateB = Number(b?.eventDateRaw || 0);
  const soldA = isPujaPastEvent(a);
  const soldB = isPujaPastEvent(b);

  if (soldA !== soldB) return soldA ? 1 : -1;
  if (!soldA && !soldB && dateA !== dateB) return dateA - dateB;
  if (soldA && soldB && dateA !== dateB) return dateB - dateA;

  return (a.rank ?? 9999) - (b.rank ?? 9999);
};

function SpecialPuja() {
  const { t } = useTranslation();
  // usePujaList re-maps already-fetched records on language change.
  const { pujas: apiPujas, loading, error } = usePujaList();
  const navigate = useNavigate();

  const getBenefitTitle = (benefit) => {
    if (!benefit) return null;
    if (typeof benefit === "string") return benefit;
    if (typeof benefit === "object") return benefit.title || benefit.name || null;
    return null;
  };

  // Map API data to SpecialPuja format
  const pujas = useMemo(
    () =>
      apiPujas
        .map((p) => ({
          ...p,
          imageClass:
            SP_IMAGE_MAP[p.id] ||
            p.imageClass ||
            `sp-banner-${Math.floor(Math.random() * 3) + 1}`,
        }))
        .sort(sortByAvailabilityThenDate)
        .slice(0, PUJA_LIST_GRID_COLUMNS),
    [apiPujas]
  );

  if (error) console.error("❌ SpecialPuja fetch failed:", error);

  if (loading) {
    // In-flow placeholder (not the full-screen .pl-loading-overlay used on /puja):
    // on the home page the hero must stay visible while pujas load.
    return (
      <section className="special-puja-section" aria-busy="true" key="loading">
        <div className="sp-container">
          <div className="sp-loading" role="status" aria-live="polite">
            <div className="pl-loading-spinner" aria-hidden="true" />
            <div className="pl-loading-text">{t('common.loading')}</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="special-puja-section">
      <div className="sp-container">
        <div className="sp-header">
          <h2>
            <span className="sp-title-purple">{t('home.joinSacred')}</span>{' '}{t('home.fromAnywhere')}
          </h2>
          <p className="sp-subtitle">
            {t('home.specialDescription')}
          </p>
        </div>

        <div className="sp-cards">
          {pujas.map((puja) => (
            <div
              key={puja.id}
              className="pl-card"
              onClick={() => !isPujaPastEvent(puja) && navigate(`/puja/${puja.id}`)}
              style={{ cursor: isPujaPastEvent(puja) ? 'default' : 'pointer' }}
              onMouseEnter={() => puja.bannerUrls?.forEach(b => { if (b?.url) new Image().src = b.url; })}
            >
              {/* ✅ USE API IMAGES */}
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
                {isPujaPastEvent(puja) ? (
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

              {Array.isArray(puja.benefits) && puja.benefits.length > 0 && (
                <ul className="pl-card-benefits" aria-label={t('puja.benefits')}>
                  {puja.benefits
                    .map(getBenefitTitle)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((title, idx) => (
                      <li key={idx}>{title}</li>
                    ))}
                </ul>
              )}
              {/* duration: estimated puja time */}
              {/* <p className="pl-card-purpose">Duration: {puja.duration}</p> */}
              {/* templeName: temple/venue where puja is performed */}
              <p className="pl-card-meta">🏛 {puja.templeName}</p>
              {/* occasion: auspicious date/event when puja is performed */}
              <p className="pl-card-meta pl-card-date">📅 {puja.displayDate || puja.date}</p>
              {isPujaPastEvent(puja) ? (
                <div className="pl-card-participate pl-card-participate-disabled">
                  {t('common.bookingClosed')}
                </div>
              ) : (
                <Link to={`/puja/${puja.id}`} className="pl-card-participate">
                  {t('common.bookNow')} <span className="btn-icon">🙏🏻</span>
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="sp-footer">
          <Link to="/puja" className="sp-view-all">
            {t('home.viewAllPujas')} →
          </Link>
        </div>
      </div>
    </section>
  );
}

export default SpecialPuja;
