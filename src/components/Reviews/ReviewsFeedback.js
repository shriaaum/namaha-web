import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getReviews } from "../../data/reviewsAndFeedback";
import "./ReviewsFeedback.css";

const getVisibleCount = () => {
  if (typeof window === "undefined") return 4;
  if (window.innerWidth <= 640) return 1;
  if (window.innerWidth <= 1024) return 2;
  return 4;
};

const getInitials = (name) =>
  name
    .replace(/\./g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

function ReviewsFeedback({ serviceType = "puja", matchText = "" }) {
  const { t } = useTranslation();
  const [visibleCount, setVisibleCount] = useState(getVisibleCount);
  const [page, setPage] = useState(0);
  const reviews = useMemo(() => getReviews(serviceType, matchText), [serviceType, matchText]);

  useEffect(() => {
    const onResize = () => setVisibleCount(getVisibleCount());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => setPage(0), [visibleCount, reviews]);

  const pages = useMemo(
    () =>
      Array.from({ length: Math.ceil(reviews.length / visibleCount) }, (_, index) =>
        reviews.slice(index * visibleCount, index * visibleCount + visibleCount)
      ),
    [reviews, visibleCount]
  );

  if (reviews.length === 0) return null;

  const intro = serviceType === "chadhava" ? t("reviewsFeedback.introChadhava") : t("reviewsFeedback.introPuja");

  return (
    <section className="rf-section" aria-labelledby={`rf-title-${serviceType}`}>
      <h2 id={`rf-title-${serviceType}`} className="rf-title">{t("reviewsFeedback.title")}</h2>
      <p className="rf-intro">{intro}</p>

      <div className="rf-grid" style={{ gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))` }}>
        {(pages[page] || []).map((item) => (
          <figure key={item.id} className="rf-item">
            <blockquote className="rf-card">
              <p>{item.review}</p>
            </blockquote>
            <figcaption className="rf-author">
              <span className="rf-avatar" aria-hidden="true">{getInitials(item.name)}</span>
              <span className="rf-author-text">
                <span className="rf-name">{item.name}</span>
                <span className="rf-meta">
                  <span className="rf-city">{item.city}</span>
                  {item.rating ? (
                    <span className="rf-stars" role="img" aria-label={t("reviewsFeedback.ratingLabel", { rating: item.rating })}>
                      {"★".repeat(item.rating)}
                    </span>
                  ) : null}
                </span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      {pages.length > 1 && (
        <div className="rf-controls" aria-label={t("reviewsFeedback.paginationLabel")}>
          <button
            type="button"
            className="rf-arrow"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0}
            aria-label={t("reviewsFeedback.previous")}
          >
            {"‹"}
          </button>
          <div className="rf-dots">
            {pages.map((_, index) => (
              <button
                key={index}
                type="button"
                className={index === page ? "is-active" : ""}
                onClick={() => setPage(index)}
                aria-label={t("reviewsFeedback.goToPage", { page: index + 1 })}
                aria-current={index === page ? "true" : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            className="rf-arrow"
            onClick={() => setPage((current) => Math.min(pages.length - 1, current + 1))}
            disabled={page === pages.length - 1}
            aria-label={t("reviewsFeedback.next")}
          >
            {"›"}
          </button>
        </div>
      )}
    </section>
  );
}

export default ReviewsFeedback;
