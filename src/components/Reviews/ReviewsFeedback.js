import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getReviews } from "../../data/reviewsAndFeedback";
import "./ReviewsFeedback.css";

const getVisibleCount = () => {
  if (typeof window === "undefined") return 4;
  if (window.innerWidth <= 640) return 1;
  if (window.innerWidth <= 1024) return 2;
  return 4;
};

const getInitials = (name = "") => String(name).replace(/\./g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
const normalizeBenefits = (benefits) => (Array.isArray(benefits) ? benefits : []).map((benefit) => {
  if (typeof benefit === "string") {
    const title = benefit.trim().replace(/^\d+\s*[.)]\s*/, "");
    return title ? { title, subtitle: "" } : null;
  }
  if (!benefit || typeof benefit !== "object") return null;
  const title = String(benefit.title || "").trim().replace(/^\d+\s*[.)]\s*/, "");
  const subtitle = String(benefit.subtitle || "").trim();
  return title ? { title, subtitle } : null;
}).filter(Boolean);
const asSentence = (text) => {
  const trimmed = text.trim();
  return /[.!?।]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

const FALLBACK_REVIEWER = Object.freeze({
  name: "Amit Sharma",
  location: "Varanasi",
  rating: 5,
});

const getBenefitReviewer = (source) => {
  if (!source || typeof source !== "object") return FALLBACK_REVIEWER;
  const name = String(source.name || "").trim();
  const location = String(source.location || source.city || "").trim();
  const rating = Number(source.rating);
  return name && location && rating > 0 ? { name, location, rating } : FALLBACK_REVIEWER;
};

const makeBenefitReview = (benefits, serviceType) => {
  const points = benefits.map((benefit) => asSentence(benefit.subtitle || benefit.title));
  const service = serviceType === "chadhava" ? "Chadhava" : "Puja";
  return [
    `I booked this ${service} and had a wonderful experience.`,
    `I found "${points[0]}" especially meaningful.`,
    ...(points[1] ? [`I also appreciated "${points[1]}".`] : []),
    "The spiritual significance of these prayers made me feel peaceful.",
  ].join(" ");
};

const FEMALE_REVIEWERS = new Set([
  "Ananya Sharma", "Kavya Reddy", "Meena Patel", "Meenakshi Rao", "Meera Iyer", "Neha Singh",
  "Pooja Mishra", "Pooja S.", "Priya Reddy", "Priyanka Reddy", "Shreya Mishra",
  "Sunita Agarwal", "Swathi Reddy",
]);

const makeAvatarPool = (gender) => [
  ...Array.from({ length: 4 }, (_, index) => `/review-avatars/senior-${gender}-${index + 1}.png`),
  ...Array.from({ length: 6 }, (_, index) => `/review-avatars/young-${gender}-${index + 1}.png`),
];
const AVATAR_POOLS = Object.freeze({ female: makeAvatarPool("female"), male: makeAvatarPool("male") });

// Picks a stable avatar per name, skipping any already used so cards shown together never repeat a face.
const assignAvatarSources = (names) => {
  const used = new Set();
  return names.map((name) => {
    const pool = AVATAR_POOLS[FEMALE_REVIEWERS.has(name) ? "female" : "male"];
    const start = [...String(name)].reduce((total, character) => total + character.charCodeAt(0), 0) % pool.length;
    const offset = Array.from({ length: pool.length }, (_, step) => step).find((step) => !used.has(pool[(start + step) % pool.length])) ?? 0;
    const source = pool[(start + offset) % pool.length];
    used.add(source);
    return source;
  });
};

function ReviewAvatar({ name, src }) {
  const [hasImageError, setHasImageError] = useState(false);
  return (
    <span className="rf-avatar" aria-hidden="true">
      {!hasImageError ? <img src={src} alt="" onError={() => setHasImageError(true)} /> : getInitials(name)}
    </span>
  );
}

function ReviewsFeedback({ serviceType = "puja", matchText = "", benefits = [], benefitSource = {} }) {
  const { t } = useTranslation();
  const [visibleCount, setVisibleCount] = useState(getVisibleCount);
  const [page, setPage] = useState(0);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [overflowingItemIds, setOverflowingItemIds] = useState(() => new Set());
  const [measurementVersion, setMeasurementVersion] = useState(0);
  const textRefs = useRef(new Map());
  const reviews = useMemo(() => getReviews(serviceType, matchText), [serviceType, matchText]);
  const benefitHighlight = useMemo(() => {
    const selectedBenefits = normalizeBenefits(benefits).slice(0, 2);
    return selectedBenefits.length ? { id: "benefit-highlight", type: "benefit", text: makeBenefitReview(selectedBenefits, serviceType) } : null;
  }, [benefits, serviceType]);
  const items = useMemo(() => [...(benefitHighlight ? [benefitHighlight] : []), ...reviews.map((review) => ({ ...review, type: "review" }))], [benefitHighlight, reviews]);
  const pages = useMemo(() => Array.from({ length: Math.ceil(items.length / visibleCount) }, (_, index) => items.slice(index * visibleCount, index * visibleCount + visibleCount)), [items, visibleCount]);

  useEffect(() => {
    const onResize = () => { setVisibleCount(getVisibleCount()); setExpandedItemId(null); setMeasurementVersion((version) => version + 1); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => setPage(0), [visibleCount, items]);
  useEffect(() => setExpandedItemId(null), [page]);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const overflowingIds = new Set();
      textRefs.current.forEach((element, id) => { if (element.scrollHeight > element.clientHeight) overflowingIds.add(id); });
      setOverflowingItemIds(overflowingIds);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [page, visibleCount, items, measurementVersion]);

  if (!items.length) return null;
  const intro = serviceType === "chadhava" ? t("reviewsFeedback.introChadhava") : t("reviewsFeedback.introPuja");
  const benefitReviewer = getBenefitReviewer(benefitSource);
  const pageItems = pages[page] || [];
  const avatarSources = assignAvatarSources(pageItems.map((item) => (item.type === "benefit" ? benefitReviewer.name : item.name)));
  const renderCard = (item) => {
    const isExpanded = expandedItemId === item.id;
    return <div className="rf-card"><div className="rf-card-content"><p ref={(element) => { if (element) textRefs.current.set(item.id, element); else textRefs.current.delete(item.id); }} className={isExpanded ? "is-expanded" : ""}>{item.type === "benefit" ? item.text : item.review}</p>{overflowingItemIds.has(item.id) && <button type="button" className="rf-view-toggle" onClick={() => setExpandedItemId(isExpanded ? null : item.id)} aria-expanded={isExpanded}>{isExpanded ? t("reviewsFeedback.viewLess") : t("reviewsFeedback.viewMore")}</button>}</div></div>;
  };

  return <section className="rf-section" aria-labelledby={`rf-title-${serviceType}`}>
    <h2 id={`rf-title-${serviceType}`} className="rf-title">{t("reviewsFeedback.title")}</h2><p className="rf-intro">{intro}</p>
    <div className="rf-grid" style={{ gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))` }}>
      {pageItems.map((item, position) => item.type === "benefit" ? <article key={item.id} className="rf-item rf-benefit" data-testid="benefit-highlight">{renderCard(item)}<div className="rf-author"><ReviewAvatar name={benefitReviewer.name} src={avatarSources[position]} /><span className="rf-author-text"><span className="rf-name">{benefitReviewer.name}</span><span className="rf-meta"><span className="rf-city">{benefitReviewer.location}</span><span className="rf-stars" role="img" aria-label={t("reviewsFeedback.ratingLabel", { rating: benefitReviewer.rating })}>{"★".repeat(benefitReviewer.rating)}</span></span></span></div></article> : <figure key={item.id} className="rf-item"><blockquote>{renderCard(item)}</blockquote><figcaption className="rf-author"><ReviewAvatar name={item.name} src={avatarSources[position]} /><span className="rf-author-text"><span className="rf-name">{item.name}</span><span className="rf-meta"><span className="rf-city">{item.city}</span>{item.rating ? <span className="rf-stars" role="img" aria-label={t("reviewsFeedback.ratingLabel", { rating: item.rating })}>{"★".repeat(item.rating)}</span> : null}</span></span></figcaption></figure>)}
    </div>
    {pages.length > 1 && <div className="rf-controls" aria-label={t("reviewsFeedback.paginationLabel")}><button type="button" className="rf-arrow" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} aria-label={t("reviewsFeedback.previous")}>‹</button><div className="rf-dots">{pages.map((_, index) => <button key={index} type="button" className={index === page ? "is-active" : ""} onClick={() => setPage(index)} aria-label={t("reviewsFeedback.goToPage", { page: index + 1 })} aria-current={index === page ? "true" : undefined} />)}</div><button type="button" className="rf-arrow" onClick={() => setPage((current) => Math.min(pages.length - 1, current + 1))} disabled={page === pages.length - 1} aria-label={t("reviewsFeedback.next")}>›</button></div>}
  </section>;
}

export default ReviewsFeedback;
