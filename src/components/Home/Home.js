import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../../lib/instance";
import { useTranslation } from 'react-i18next';
import { localizeHeroBanner } from "../../i18n/content";
import "./Home.css";

function Home() {
  const { t, i18n } = useTranslation();
  const trustStripItems = [
    { id: 1, icon: 'shield', text: t('home.trustPandits') },
    { id: 2, icon: 'shield', text: t('home.trustRecording') },
    { id: 3, icon: 'shield', text: t('home.trustPrasad') },
  ];
  const [activeSlide, setActiveSlide] = useState(0);
  const [rawSlides, setRawSlides] = useState([]);

  // Localize at render time so a language switch updates already-loaded banners.
  const heroSlides = useMemo(
    () =>
      rawSlides
        .map((s) => localizeHeroBanner(s, i18n.language))
        .map((s, idx) => ({
          id: String(s.slideId || s.id || s._id || `hero-${idx}`),
          title: s.title || t('home.heroFallbackTitle'),
          description: s.subtitle || s.description || "",
          ctaLabel: s.ctaLabel || t('home.heroFallbackCta'),
          ctaTo: s.ctaTo || "/",
          image:
            s.image ||
            s.images?.[0]?.url ||
            s.images?.[0] ||
            "",
          imageAlt: s.imageAlt || s.title || t('home.heroFallbackAlt'),
        }))
        .filter((s) => s.image),
    [rawSlides, i18n.language, t]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await axiosInstance.get("/hero-banner");
        const data = res?.data;
        const rawSlides = Array.isArray(data?.banners)
          ? data.banners
          : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.slides)
            ? data.slides
            : Array.isArray(data?.data?.banners)
              ? data.data.banners
            : Array.isArray(data?.data?.items)
              ? data.data.items
              : Array.isArray(data?.data?.slides)
                ? data.data.slides
                : Array.isArray(data)
                  ? data
                  : data && typeof data === "object"
                    ? [data]
                    : [];

        const sortedSlides = [...rawSlides].sort((a, b) => {
          const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aTime - bTime; // oldest -> newest
        });

        const activeSlides = sortedSlides.filter(
          (s) => s && typeof s === "object" && s.isActive === true
        );

        if (!mounted) return;
        setRawSlides(activeSlides);
      } catch {
        if (!mounted) return;
        setRawSlides([]);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // keep active slide in range when slides change
    setActiveSlide((prev) => {
      const len = heroSlides.length || 0;
      if (len <= 0) return 0;
      return prev >= len ? 0 : prev;
    });
  }, [heroSlides.length]);

  useEffect(() => {
    if (heroSlides.length <= 0) return undefined;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  return (
    <div className="App">
      <main>
        <div className="home-hero-viewport">
          {/* ================= HERO ================= */}
          {heroSlides.length > 0 && (
            <section id="home" className="hero-modern">
              <div className="hero-modern-carousel">
                {heroSlides.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`hero-modern-slide ${index === activeSlide ? "hero-modern-slide-active" : ""}`}
                  >
                    <div className="hero-modern-inner">
                      <div className="hero-modern-content">
                        <div className="hero-modern-block">
                          <h1>{slide.title}</h1>
                          <p>{slide.description}</p>
                          <Link to={slide.ctaTo} className="hero-btn hero-btn-solid">
                            {slide.ctaLabel}
                          </Link>
                        </div>
                      </div>
                      <div className="hero-modern-images" aria-hidden="true">
                        <div className="hero-modern-image-card">
                          <img
                            src={slide.image}
                            alt={slide.imageAlt}
                            className="hero-modern-image"
                            loading={index === 0 ? "eager" : "lazy"}
                            decoding={index === 0 ? "sync" : "async"}
                            fetchpriority={index === 0 ? "high" : "low"}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="hero-modern-dots">
                  {heroSlides.map((slide, index) => (
                    <button
                      key={slide.id}
                      type="button"
                      className={`hero-modern-dot ${index === activeSlide ? "hero-modern-dot-active" : ""}`}
                      onClick={() => setActiveSlide(index)}
                      aria-label={t('home.showSlide', { title: slide.title })}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Trust strip */}
          <div className="trust-strip-wrap">
            <div className="trust-strip-scroll">
              <div className="trust-strip-inner">
                {[...trustStripItems, ...trustStripItems].map(
                  (item, index) => (
                    <span key={index} className="trust-strip-item">
                      {item.icon === "shield" && (
                        <span className="trust-strip-icon">✓</span>
                      )}
                      {item.icon === "badge" && (
                        <span className="trust-strip-icon">1</span>
                      )}
                      <span className="trust-strip-text">{item.text}</span>
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
