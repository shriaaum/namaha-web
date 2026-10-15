import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getPujaById, isPujaUserSoldOut } from "../../data/pujaList";
import { optimizedImage, optimizedSrcSet } from "../../lib/img";
import "./PujaDetail.css";
import Footer from "../Footer/Footer";

const renderRichText = (text) => {
  if (!text || typeof text !== "string") return null;

  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\t/g, "  ").trimEnd());

  const blocks = [];
  let currentList = [];
  let pBuffer = "";

  const flushParagraph = () => {
    const content = pBuffer.trim();
    if (!content) return;
    blocks.push({ type: "p", content });
    pBuffer = "";
  };

  const flushList = () => {
    if (currentList.length <= 0) return;
    blocks.push({ type: "ul", items: currentList });
    currentList = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const bulletMatch = line.match(/^([•*·-])\s*(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      currentList.push(bulletMatch[2].trim());
      continue;
    }

    flushList();
    pBuffer = pBuffer ? `${pBuffer}\n${line}` : line;
  }

  flushParagraph();
  flushList();

  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === "ul") {
          return (
            <ul key={`ul-${i}`}>
              {b.items.map((item, idx) => (
                <li key={`li-${i}-${idx}`}>{item}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={`p-${i}`}>
            {b.content.split("\n").map((part, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 ? <br /> : null}
                {part}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
};

const SECTION_TABS = [
  { id: "packages", labelKey: "detailTabs.packages" },
  { id: "benefits", labelKey: "detailTabs.benefits" },
  { id: "temple", labelKey: "detailTabs.temple" },
  { id: "faqs", labelKey: "detailTabs.faqs" },
];
// --- Rating helpers (deterministic per item id) ---
const hashStr = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};
const RATING_OPTIONS = [4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9];
const getDynamicRating = (id) =>
  RATING_OPTIONS[hashStr(String(id || "x")) % RATING_OPTIONS.length];
const getDynamicReviewCount = (id) =>
  80 + (hashStr(String(id || "x") + "r") % 420);

const getRatingAvatars = (id, count = 4) => {
  const h = hashStr(String(id || "x") + "av");
  return Array.from({ length: count }, (_, i) => ({
    src: `https://i.pravatar.cc/40?img=${((h + i * 7) % 70) + 1}`,
  }));
};
// ---

// Text lives in i18n: pujaDetail.bullet1..3
const PACKAGE_BULLET_KEYS = ["pujaDetail.bullet1", "pujaDetail.bullet2", "pujaDetail.bullet3"];

// pkg.name stays English (image lookup + booking payload); only the label is translated.
const PACKAGE_LABEL_KEYS = {
  Individual: "pujaDetail.pkgIndividual",
  Couple: "pujaDetail.pkgCouple",
  Family: "pujaDetail.pkgFamily",
  "Joint Family": "pujaDetail.pkgJoint",
};

const PACKAGE_IMAGES = {
  Individual: "https://img.freepik.com/premium-photo/indian-girl-dressed-traditional-attire-performing-graceful-dhunuchi-dance-with-clay-incense-burner-vibrant-durga-puja-celebrations_748982-26973.jpg?semt=ais_rp_progressive&w=740&q=80",
  Couple: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTrZHdY1aqFNTp-HqB_YjnU6GZXvS2dZEehRQ&s",
  Family: "https://t3.ftcdn.net/jpg/09/48/77/26/360_F_948772697_m5ITrhbmM3FFkI0dNIm78wscg5D8GX6G.jpg",
  "Joint Family": "https://img.freepik.com/premium-photo/indian-family-celebrating-gudi-padwa-ugadi-festival-while-lady-wife-holding-puja-pooja-thali-it-s-new-year-hindu-religion_466689-44362.jpg",
};

const getPackageDisplayName = (pkg) => {
  const id = (pkg.id || "").toLowerCase();
  const name = (pkg.name || "").toLowerCase();
  const persons = pkg.persons ?? 1;
  if (name === "individual" || id.includes("individual") || persons === 1) return "Individual";
  if (name === "two person" || name.includes("partner") || name.includes("couple") || id.includes("partner") || id.includes("couple") || persons === 2) return "Couple";
  if (name === "joint family" || name.includes("joint") || id.includes("joint") || persons >= 6) return "Joint Family";
  return "Family";
};

const getPackages = (puja) => {
  if (puja?.packageDetails?.length > 0) {
    return puja.packageDetails.map((pkg) => {
      const base = {
        id: pkg.id || pkg._id,
        name: pkg.name,
price:
          typeof pkg.price === "string"
            ? Number(pkg.price.replace(/[^0-9]/g, ""))
            : Number(pkg.price),
        persons: pkg.persons || 1,
      };
      return { ...base, name: getPackageDisplayName(base) };
    });
  }

  return [
    { id: "individual", name: "Individual", price: 851, persons: 1 },
    { id: "partner", name: "Couple", price: 1251, persons: 2 },
    { id: "family", name: "Family", price: 2001, persons: 4 },
    { id: "joint", name: "Joint Family", price: 3001, persons: 6 },
  ];
};

const INCLUDE_KEYS = ["pujaDetail.include1", "pujaDetail.include2", "pujaDetail.include3", "pujaDetail.include4"];

const HOW_IT_WORKS_STEPS = [
  { id: "select", titleKey: "pujaDetail.stepPackage", icon: "grid" },
  { id: "name-gotra", titleKey: "pujaDetail.stepNameGotra", icon: "form" },
  { id: "watch", titleKey: "pujaDetail.stepWatch", icon: "video" },
  { id: "prashad", titleKey: "pujaDetail.stepPrashad", icon: "box" },
];

// FAQ text lives in i18n: pujaDetail.faq{n}q / pujaDetail.faq{n}a
const FAQ_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8];

function PujaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const packageLabel = (pkg) => (PACKAGE_LABEL_KEYS[pkg?.name] ? t(PACKAGE_LABEL_KEYS[pkg.name]) : pkg?.name);

  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [puja, setPuja] = useState(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  // Replace static countdown state
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [activeTab, setActiveTab] = useState("packages");
  const [openFaq, setOpenFaq] = useState(null);
  const [isNavSticky, setIsNavSticky] = useState(false);
  const [aboutVisibleLines, setAboutVisibleLines] = useState(() =>
    typeof window !== "undefined" && window.innerWidth <= 768 ? 2 : 7
  );
  const [aboutHasOverflow, setAboutHasOverflow] = useState(false);
  const collapsedLines = 4;
  const [howItWorksHoverIndex, setHowItWorksHoverIndex] = useState(null);
  // Track which package card's "Read more" is expanded by index (per-card)
  const [expandedPackageIndex, setExpandedPackageIndex] = useState(null);

  const sectionRefs = useRef({});
  const sectionNavRef = useRef(null);
  const stickyThresholdRef = useRef(null);
  const aboutTextRef = useRef(null);

  const slides = puja?.bannerUrls?.map((img) => img.url) || [];

  const isBookingBlocked = useMemo(
    () => (puja ? isPujaUserSoldOut(puja) : false),
    [puja]
  );

  const handleBookPujaClick = (pkg) => {
    if (isPujaUserSoldOut(puja)) {
      alert(t("pujaDetail.closedAlert"));
      return;
    }
    const mainImage = puja?.bannerUrls?.[0]?.url || null;
    const pkgPrice = Number(pkg?.price) || 0;

    const billingState = {
      puja,
      selectedPackage: pkg,
      image: mainImage,
      addons: [],
      addonsTotal: 0,
      grandTotal: pkgPrice,
      coupon: puja?.coupon ?? null,
      coupons: puja?.coupons ?? (puja?.coupon ? [puja.coupon] : null),
      mode: puja?.mode,
      prasadam: false, // user selects on BillingPage
    };

    navigate("/billing", { state: billingState });
  };

  useEffect(() => {
    const loadPuja = async () => {
      if (!id) return;
      setLoading(true);
      const foundPuja = await getPujaById(id);
      setPuja(foundPuja);
      if (foundPuja) setSelectedPackage(null);
      setLoading(false);
    };
    loadPuja();
  }, [id]);

  // Language switch: re-fetch quietly so title, benefits, temple text etc. are re-localized.
  useEffect(() => {
    let active = true;
    const onLanguageChanged = async () => {
      if (!id) return;
      const refreshed = await getPujaById(id);
      if (active && refreshed) setPuja(refreshed);
    };
    i18n.on("languageChanged", onLanguageChanged);
    return () => {
      active = false;
      i18n.off("languageChanged", onLanguageChanged);
    };
  }, [id, i18n]);

  // Sync mobile viewport and collapse lines on resize
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handleChange = () => {
      setAboutVisibleLines((prev) => {
        if (prev < 999) return 4;
        return prev;
      });
    };
    handleChange(mq);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  // Detect if About Puja content overflows when collapsed (show Read more only when needed)
  useEffect(() => {
    if (!puja?.aboutPuja || aboutVisibleLines > collapsedLines) {
      setAboutHasOverflow(false);
      return;
    }
    const t = setTimeout(() => {
      const el = aboutTextRef.current;
      if (!el) return;
      setAboutHasOverflow(el.scrollHeight > el.clientHeight);
    }, 0);
    return () => clearTimeout(t);
  }, [puja?.aboutPuja, aboutVisibleLines, collapsedLines]);

  const scrollToSection = (sectionId) => {
    setActiveTab(sectionId);
    const nav = sectionNavRef.current;
    if (nav) {
      const navTop = nav.getBoundingClientRect().top + window.scrollY;
      stickyThresholdRef.current = navTop - 82;
    }
    sectionRefs.current[sectionId]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setIsNavSticky(true);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const nav = sectionNavRef.current;
      if (!nav) return;
      if (!isNavSticky) {
        const rect = nav.getBoundingClientRect();
        const navTop = rect.top + window.scrollY;
        const threshold = navTop - 82;
        if (window.scrollY >= threshold) {
          stickyThresholdRef.current = threshold;
          setIsNavSticky(true);
        }
      } else {
        if (
          stickyThresholdRef.current != null &&
          window.scrollY < stickyThresholdRef.current
        ) {
          setIsNavSticky(false);
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [puja, isNavSticky]);

  // Countdown to puja event date (use eventDateRaw when available; fallback to parsing puja.date)
  useEffect(() => {
    const eventTimeMs = puja?.eventDateRaw && puja.eventDateRaw > 0
      ? puja.eventDateRaw
      : (() => {
          if (!puja?.date) return 0;
          const d = new Date(puja.date);
          return isNaN(d.getTime()) ? 0 : d.setHours(23, 59, 59, 999);
        })();
    if (!eventTimeMs) {
      return;
    }

    let intervalId;

    const tick = () => {
      const now = Date.now();
      const diff = eventTimeMs - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(intervalId);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({ days, hours, minutes, seconds });
    };

    // Start immediately
    tick();

    // Tick every second
    intervalId = setInterval(tick, 1000);

    return () => clearInterval(intervalId);
  }, [puja]); // ✅ Depend on WHOLE puja object once

  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIndex((i) => (i + 1) % (puja?.carouselImages?.length || 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [puja]);

  // Show full-page loading overlay when initial data load is in progress
  if (loading) {
    return (
      <>
        <div className="pd-loading-overlay" role="status" aria-live="polite">
          <div className="pd-loading-spinner" aria-hidden="true" />
          <div className="pd-loading-text">{t("common.loading")}</div>
        </div>
        <main className="puja-detail-page" aria-hidden="true" />
      </>
    );
  }

  if (!puja) {
    return (
      <main className="puja-detail-page">
        <div className="pd-not-found">
          <p>{t("pujaDetail.notFound")}</p>
          <button type="button" onClick={() => navigate("/puja")}>
            {t("pujaDetail.backToList")}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="puja-detail-page">
      <div className="pd-container">
        <div className="pd-section-content pd-grid">
          {/* Left: Image carousel */}
          <div className="pd-carousel-wrap">
            <div className="pd-carousel-frame">
              <div className="pd-carousel-inner">
                {slides.map((imgUrl, i) => (
                  <div
                    key={i}
                    className={`pd-carousel-slide ${
                      i === carouselIndex ? "active" : ""
                    }`}
                  >
                    <img
                      // Resized WebP copies when the API provides `variants`; otherwise the original.
                      src={optimizedImage(imgUrl, 960, puja.bannerUrls?.[i]?.variants)}
                      srcSet={optimizedSrcSet(imgUrl, [640, 960, 1280], puja.bannerUrls?.[i]?.variants)}
                      sizes="(max-width: 768px) 100vw, 50vw"
                      alt={t("pujaDetail.slideAlt", { number: i + 1 })}
                      className="pd-carousel-image"
                      loading={i === 0 ? "eager" : "lazy"}
                      decoding={i === 0 ? "sync" : "async"}
                      fetchpriority={i === 0 ? "high" : "low"}
                    />
                  </div>
                ))}
              </div>
              {/* <span className="pd-badge">{puja.specialTag}</span> */}
              {isBookingBlocked ? (
                <span className="pd-soldout-tag" aria-hidden="true">{t("puja.soldOut")}</span>
              ) : null}
            </div>

          </div>

          {/* Right: Event details */}
          <div className="pd-details">
            {/* category: puja type/classification */}
            {/* <p className="pd-category">{puja.category}</p> */}
            <div className="pd-details-header">
              <h1 className="pd-title">{puja.title}</h1>
              <p className="pd-purpose">{puja.purpose}</p>
              <p className="pd-meta">
                <span className="pd-meta-icon">🏛</span>
                {puja.templeName}
              </p>
              <p className="pd-meta">
                <span className="pd-meta-icon">📅</span>
                {puja.displayDate || puja.date}
              </p>
            </div>

            {/* About Puja - below date, Read more outside clamped area so it stays visible */}
            {puja?.aboutPuja && (
              <div className="pd-details-about">
                <div
                  className="pd-details-about-text"
                  style={{
                    WebkitLineClamp: aboutVisibleLines,
                    lineClamp: aboutVisibleLines,
                  }}
                  ref={aboutTextRef}
                >
                  {renderRichText(puja.aboutPuja)}
                </div>
                <div className="pd-details-about-actions">
                  {aboutVisibleLines <= collapsedLines && aboutHasOverflow && (
                    <button
                      type="button"
                      className="pd-read-more-btn"
                      onClick={() => setAboutVisibleLines(999)}
                    >
                      {t("common.readMore")}
                    </button>
                  )}
                  {aboutVisibleLines > collapsedLines && (
                    <button
                      type="button"
                      className="pd-read-more-btn pd-read-less"
                      onClick={() => setAboutVisibleLines(collapsedLines)}
                    >
                      {t("common.readLess")}
                    </button>
                  )}
                </div>
              </div>
            )}

            <p className="pd-countdown-label">{t("pujaDetail.countdownLabel")}</p>
            <div className="pd-countdown">
              <div className="pd-countdown-item">
                <span className="pd-countdown-num">{countdown.days}</span>
                <span className="pd-countdown-label-sm">{t("pujaDetail.days")}</span>
              </div>
              <div className="pd-countdown-item">
                <span className="pd-countdown-num">{countdown.hours}</span>
                <span className="pd-countdown-label-sm">{t("pujaDetail.hours")}</span>
              </div>
              <div className="pd-countdown-item">
                <span className="pd-countdown-num">{countdown.minutes}</span>
                <span className="pd-countdown-label-sm">{t("pujaDetail.min")}</span>
              </div>
              <div className="pd-countdown-item">
                <span className="pd-countdown-num">{countdown.seconds}</span>
                <span className="pd-countdown-label-sm">{t("pujaDetail.secs")}</span>
              </div>
            </div>
            {(() => {
              const rating = getDynamicRating(puja.id);
              const reviewCount = getDynamicReviewCount(puja.id);
              const avatars = getRatingAvatars(puja.id);
              const fullStars = Math.floor(rating);
              const hasHalf = rating - fullStars >= 0.3;
              return (
                <div className="pd-rating-row" aria-label={t("detailCommon.ratingAria", { rating })}>
                  <div className="pd-rating-avatars">
                    {avatars.map((av, i) => (
                      <img key={i} src={av.src} alt="" aria-hidden="true" className="pd-rating-avatar" />
                    ))}
                  </div>
                  <div className="pd-rating-meta">
                    <span className="pd-rating-stars-wrap" aria-hidden="true">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span
                          key={s}
                          className={`pd-rating-star ${
                            s <= fullStars ? "filled" : hasHalf && s === fullStars + 1 ? "half" : "empty"
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </span>
                    <span className="pd-rating-score">{rating.toFixed(1)}</span>
                    <span className="pd-rating-count">{t("detailCommon.ratingsCount", { count: reviewCount })}</span>
                  </div>
                </div>
              );
            })()}
            {isBookingBlocked ? (
              <div className="pd-booking-closed" role="alert">
                <span className="pd-booking-closed-icon">🔒</span>
                <strong>{t("detailCommon.bookingClosedStrong")}</strong> {t("pujaDetail.notAvailable")}
              </div>
            ) : null}
            {/* <div className="pd-participants">
              <div className="pd-avatars">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="pd-avatar" />
                ))}
              </div>
              <span className="pd-rating">
                ⭐ {puja.rating} ({puja.ratingCount} ratings)
              </span>
            </div> */}
            {/* <p className="pd-devotees">
              Till now <strong>{puja.devoteesCount} Devotees</strong> have
              participated in Pujas conducted by Shri aaum Puja SHRI AAUM.
            </p> */}
            <button
              type="button"
              className={`pd-cta ${isBookingBlocked ? "pd-cta--disabled" : ""}`}
              disabled={isBookingBlocked}
              onClick={() => !isBookingBlocked && scrollToSection("packages")}
            >
              {isBookingBlocked ? t("common.bookingClosed") : t("pujaDetail.selectPackage")}
            </button>
          </div>
        </div>

        {/* How it Works */}
        <section className="pd-how-it-works">
          <h2 className="pd-how-title">
            <span className="pd-how-ornament">◆</span> {t("pujaDetail.howTitle")} <span className="pd-how-ornament">◆</span>
          </h2>
          <div className="pd-how-steps">
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div
                  className="pd-how-step"
                  onMouseEnter={() => setHowItWorksHoverIndex(index)}
                  onMouseLeave={() => setHowItWorksHoverIndex(null)}
                >
                  <div
                    className={`pd-how-icon-wrap ${step.icon === "video" ? "pd-how-icon-video" : ""}`}
                  >
                    {step.icon === "grid" && (
                      <div className="pd-how-icon pd-how-icon-grid">
                        <span /><span /><span /><span className="highlight" />
                      </div>
                    )}
                    {step.icon === "form" && (
                      <div className="pd-how-icon pd-how-icon-form">
                        <div className="pd-how-form-field" />
                        <div className="pd-how-form-check">✓</div>
                      </div>
                    )}
                    {step.icon === "video" && (
                      <div className="pd-how-icon pd-how-icon-video-inner">
                        <div className="pd-how-video-play">▶</div>
                      </div>
                    )}
                    {step.icon === "box" && (
                      <div className="pd-how-icon pd-how-icon-box" />
                    )}
                  </div>
                  <h3 className="pd-how-step-title">{t(step.titleKey)}</h3>
                </div>
                {index < HOW_IT_WORKS_STEPS.length - 1 && (
                  <div className="pd-how-connector" aria-hidden="true">
                    <div
                      className={`pd-how-connector-fill ${howItWorksHoverIndex === index ? "filled" : ""}`}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* Section tabs */}
        <nav
          ref={sectionNavRef}
          className={`pd-section-nav ${
            isNavSticky ? "pd-section-nav--fixed" : ""
          }`}
        >
          <div className="pd-section-nav-inner">
            {SECTION_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`pd-section-tab ${
                  activeTab === tab.id ? "active" : ""
                }`}
                onClick={() => scrollToSection(tab.id)}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        </nav>
        {isNavSticky && (
          <div className="pd-section-nav-spacer" aria-hidden="true" />
        )}

        {/* Package selection - first section */}
        <section
          className="pd-section pd-packages"
          ref={(el) => {
            sectionRefs.current.packages = el;
          }}
        >
          <div className="pd-section-content">
            <h2 className="pd-section-title">{t("pujaDetail.selectTitle")}</h2>
            <div className="pd-package-cards">
            {getPackages(puja).map((pkg, index) => (
                <div
                  key={pkg.id}
                  className={`pd-package-card ${
                    selectedPackage?.id === pkg.id ? "selected" : ""
                  }`}
                  onClick={() => !isBookingBlocked && setSelectedPackage(pkg)}
                  style={{ cursor: isBookingBlocked ? 'default' : 'pointer' }}
                >
                  <div
                    className="pd-package-image-wrap"
                    style={{
                      backgroundImage: `url(${pkg.image || PACKAGE_IMAGES[pkg.name] || "https://www.shutterstock.com/image-photo/modern-women-wear-fancy-saree-260nw-2575893271.jpg"})`,
                    }}
                  />
                  <span className="pd-package-price-tag">₹{pkg.price?.toLocaleString("en-IN")}</span>
                  <div className="pd-package-body">
                    <h3 className="pd-package-name">{packageLabel(pkg)}</h3>
                    <ul className="pd-package-bullets">
                      {(expandedPackageIndex === index
                        ? PACKAGE_BULLET_KEYS
                        : PACKAGE_BULLET_KEYS.slice(0, 2)
                      ).map((bulletKey) => (
                        <li key={bulletKey}>{t(bulletKey)}</li>
                      ))}
                    </ul>
                    {PACKAGE_BULLET_KEYS.length > 2 && (
                      <button
                        type="button"
                        className="pd-package-read-more"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedPackageIndex((prev) =>
                            prev === index ? null : index
                          );
                        }}
                      >
                        {expandedPackageIndex === index ? t("common.readLess") : t("common.readMore")}
                      </button>
                    )}
                    <button
                      type="button"
                      className={`pd-package-btn ${isBookingBlocked ? "pd-package-btn--disabled" : ""}`}
                      disabled={isBookingBlocked}
                      onClick={(e) => { e.stopPropagation(); handleBookPujaClick(pkg); }}
                    >
                      {isBookingBlocked ? t("pujaDetail.bookingClosedCaps") : t("pujaDetail.bookPuja")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section
          className="pd-section pd-benefits"
          ref={(el) => {
            sectionRefs.current.benefits = el;
          }}
        >
          <div className="pd-section-content">
            <h2 className="pd-section-title">{t("pujaDetail.benefitsTitle")}</h2>
            <div className="pd-benefits-grid">
              {puja.benefits?.map((benefit, i) => {
                const title = typeof benefit === 'object' ? benefit.title : benefit;
                const subtitle = typeof benefit === 'object' ? benefit.subtitle : null;
                const key = typeof benefit === 'object' && benefit._id ? benefit._id : i;
                return (
                  <div key={key} className="pd-benefit-card">
                    <div className="pd-benefit-icon">✓</div>
                    <h3 className="pd-benefit-title">{title}</h3>
                    {subtitle && <p className="pd-benefit-text">{subtitle}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Temple Details */}
        <section
          className="pd-section pd-temple"
          ref={(el) => {
            sectionRefs.current.temple = el;
          }}
        >
          <div className="pd-section-content">
            <h2 className="pd-temple-name">{puja.templeName}</h2>
            <div className="pd-temple-text">
              {renderRichText(puja.templeDescription || t("pujaDetail.templeLoading"))}
            </div>
          </div>
        </section>

        {/* Includes */}
        <section className="pd-section pd-includes">
          <div className="pd-section-content">
            <h2 className="pd-section-title">{t("pujaDetail.includesTitle")}</h2>
            <ul className="pd-includes-list">
              {INCLUDE_KEYS.map((itemKey) => (
                <li key={itemKey}>
                  <span className="pd-includes-check">✓</span> {t(itemKey)}
                </li>
              ))}
            </ul>
            <p className="pd-includes-note">
              {t("pujaDetail.includesNote")}
            </p>
          </div>
        </section>

        {/* Reviews & Ratings */}
        {/* <section
          className="pd-section pd-reviews-ratings"
          ref={(el) => {
            sectionRefs.current.reviews = el;
          }}
        >
          <div className="pd-section-content">
            <h2 className="pd-reviews-main-title">Reviews & Ratings</h2>
            <p className="pd-reviews-subtitle">
              Read what our beloved devotees have to say about Shri aaum.
            </p>
            <div className="pd-testimonials-wrap">
              <div
                className="pd-testimonials-track"
                style={{ transform: `translateX(-${testimonialIndex * 100}%)` }}
              >
                {TESTIMONIALS.map((t, i) => (
                  <div key={i} className="pd-testimonial-card">
                    {t.type === "video" ? (
                      <div className="pd-testimonial-video">
                        <div className="pd-video-placeholder">
                          ▶ 0:00 / 1:00
                        </div>
                        <div className="pd-testimonial-author">
                          <div className="pd-testimonial-avatar" />
                          <div>
                            <strong>{t.name}</strong>
                            <span>{t.location}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="pd-testimonial-text">{t.text}</p>
                        <div className="pd-testimonial-author">
                          <div className="pd-testimonial-avatar" />
                          <div>
                            <strong>{t.name}</strong>
                            <span>{t.location}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="pd-testimonial-dots">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={i === testimonialIndex ? "active" : ""}
                    onClick={() => setTestimonialIndex(i)}
                    aria-label={`Testimonial ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section> */}

        {/* User Reviews */}
        {/* <section className="pd-section pd-user-reviews">
          <div className="pd-section-content">
            <h2 className="pd-section-title">User Reviews</h2>
            <p className="pd-user-reviews-sub">
              Reviews from our devotees who booked Puja with us
            </p>
            <ul className="pd-user-reviews-list">
              {USER_REVIEWS.map((r, i) => (
                <li key={i} className="pd-user-review-item">
                  <div className="pd-user-review-avatar" />
                  <div className="pd-user-review-content">
                    <div className="pd-user-review-meta">
                      <strong>{r.name}</strong>
                      <span>{r.date}</span>
                    </div>
                    <div className="pd-user-review-stars">
                      {"★".repeat(r.stars)}
                    </div>
                    <p>{r.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <button type="button" className="pd-view-more">
              View More
            </button>
          </div>
        </section> */}

        {/* FAQs */}
        <section
          className="pd-section pd-faqs"
          ref={(el) => {
            sectionRefs.current.faqs = el;
          }}
        >
          <div className="pd-section-content">
            <div className="pd-faqs-header">
              <h2 className="pd-section-title">{t("detailCommon.faqTitle")}</h2>
            </div>
            <ul className="pd-faq-list">
              {FAQ_NUMBERS.map((n, i) => (
                <li key={i} className="pd-faq-item">
                  <button
                    type="button"
                    className="pd-faq-question"
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    {t(`pujaDetail.faq${n}q`)}
                    <span className="pd-faq-chevron">
                      {openFaq === i ? "▲" : "▼"}
                    </span>
                  </button>
                  {openFaq === i && (
                    <div className="pd-faq-answer">{t(`pujaDetail.faq${n}a`)}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
      <Footer />

      {/* Mobile sticky bottom CTA — replaces bottom nav on puja detail pages */}
      {!isBookingBlocked && (
        <div className="pd-mobile-sticky-cta">
          {selectedPackage ? (
            <button
              type="button"
              className="pd-mobile-sticky-btn pd-mobile-sticky-btn--selected"
              onClick={() => handleBookPujaClick(selectedPackage)}
            >
              <div className="pd-mobile-sticky-pkg-info">
                <span className="pd-mobile-sticky-name">{packageLabel(selectedPackage)}</span>
                <span className="pd-mobile-sticky-price">
                  ₹{Number(selectedPackage.price).toLocaleString("en-IN")}
                </span>
              </div>
              <span className="pd-mobile-sticky-action">{t("common.bookNow")} →</span>
            </button>
          ) : (
            <button
              type="button"
              className="pd-mobile-sticky-btn pd-mobile-sticky-btn--full"
              onClick={() => {
                const firstPkg = getPackages(puja)[0];
                if (firstPkg) setSelectedPackage(firstPkg);
                scrollToSection("packages");
              }}
            >
              {t("pujaDetail.selectPackage")}
            </button>
          )}
        </div>
      )}
      {isBookingBlocked && (
        <div className="pd-mobile-sticky-cta pd-mobile-sticky-cta--closed">
          <span className="pd-mobile-sticky-closed-text">🔒 {t("common.bookingClosed")}</span>
        </div>
      )}
    </main>
  );
}

export default PujaDetail;
