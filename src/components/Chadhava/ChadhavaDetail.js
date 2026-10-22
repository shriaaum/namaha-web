import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../lib/instance';
import { normalizeApiSoldTag, isPujaUserSoldOut, getEventDateTimeRawInIST } from '../../data/pujaList';
import { useTranslation } from 'react-i18next';
import { localizeChadhava } from '../../i18n/cmsText';
import { buildTextTranslations, getDateLocale, localizePujaRecord, localizeRecord, reportMissingTranslations } from '../../i18n/content';
import './ChadhavaDetail.css';
import Footer from '../Footer/Footer';
import ReviewsFeedback from '../Reviews/ReviewsFeedback';
import PrasadamCard from '../Prasadam/PrasadamCard';
import { optimizedImage, optimizedSrcSet } from '../../lib/img';
import { setExitIntentContext } from '../../lib/exitIntentContext';
import { findRelatedPuja, getPujaBannerImage, getPujaPackagePrice } from './relatedPuja';

const renderRichText = (text) => {
  if (!text || typeof text !== 'string') return null;

  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\t/g, '  ').trimEnd());

  const blocks = [];
  let currentList = [];
  let pBuffer = '';

  const flushParagraph = () => {
    const content = pBuffer.trim();
    if (!content) return;
    blocks.push({ type: 'p', content });
    pBuffer = '';
  };

  const flushList = () => {
    if (currentList.length <= 0) return;
    blocks.push({ type: 'ul', items: currentList });
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
        if (b.type === 'ul') {
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
            {b.content.split('\n').map((part, idx) => (
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

// FAQ text lives in i18n: chadhavaDetail.faq{n}q / chadhavaDetail.faq{n}a
const FAQ_NUMBERS = [1, 2, 3, 4, 5, 6, 7];

// Cart keys match the existing offering rows: `_id || id || index`.
const offeringKey = (offering, index) => String(offering?._id || offering?.id || index);

// Offerings have no availability flag; one is bookable when it has a title and a price.
const isOfferingAvailable = (offering) =>
  Boolean(offering && String(offering.title || '').trim()) && Number(offering.price) > 0;

// Per-chadhava cart in sessionStorage, so returning from /billing (navigate(-1))
// restores the user's selection instead of re-applying the default.
const CART_STORAGE_PREFIX = 'shriaaum.chadhavaCart:';
// A recommendation is hidden for the current browser session only after the
// customer actively dismisses it. `Shown` keys from the earlier behaviour are
// deliberately ignored so they cannot suppress a valid recommendation.
const RELATED_POOJA_DISMISSED_STORAGE_PREFIX = 'shriaaum.relatedPoojaDismissed:';

const SECTION_TABS = [
  { id: 'packages', labelKey: 'detailTabs.packages' },
  { id: 'benefits', labelKey: 'detailTabs.benefits' },
  { id: 'temple', labelKey: 'detailTabs.temple' },
  { id: 'faqs', labelKey: 'detailTabs.faqs' },
  { id: 'reviews', labelKey: 'detailTabs.reviews' },
];

// Placeholder reviewer metadata for the Chadhava benefit card. This is display-only
// frontend data and does not alter any customer or backend review record.
const CHADHAVA_BENEFIT_REVIEWER = {
  title: 'Amit Sharma',
  location: 'Varanasi',
  rating: 5,
};

function ChadhavaDetail() {
  // Keep the exit popup aware of the item currently being viewed.
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [activeFaq, setActiveFaq] = useState(null);
  const [cart, setCart] = useState({});
  // True once the cart was restored or defaulted for the loaded chadhava.
  const [cartReady, setCartReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [activeTab, setActiveTab] = useState('packages');
  const aboutTextRef = useRef(null);
  const sectionRefs = useRef({});
  const tabScrollLockRef = useRef(false);
  const collapsedLines = 4;
  const [aboutVisibleLines, setAboutVisibleLines] = useState(collapsedLines);
  const [aboutHasOverflow, setAboutHasOverflow] = useState(false);
  const [relatedPuja, setRelatedPuja] = useState(null);
  const [showRelatedPuja, setShowRelatedPuja] = useState(false);
  const relatedPujaRequestRef = useRef(false);

  // locale defaults to en-GB: the billing/booking payload keeps the English date.
  const formatEventDate = (value, locale = 'en-GB') => {
    if (!value) return locale === 'en-GB' ? 'Date will be announced' : t('chadhava.dateAnnounced');
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    return String(value);
  };

  /** Same as `Chadhava.js` / `pujaList.js`: admin `soldTag` + event date. */
  const { isBookingBlocked } = useMemo(() => {
    if (!detail) return { isBookingBlocked: false };
    const raw = detail.eventdate || detail.eventDate || detail.dateRange;
    const eventDateRaw = getEventDateTimeRawInIST(raw, detail.eventTime);
    const soldTagPolicy = normalizeApiSoldTag(detail.soldTag ?? detail.soldTagPolicy);
    const ctx = { eventDateRaw, soldTagPolicy };
    return { isBookingBlocked: isPujaUserSoldOut(ctx) };
  }, [detail]);

  // Localized copy of the record for display; `detail`/`offerings` stay raw (English).
  const view = useMemo(() => localizeChadhava(detail, i18n.language), [detail, i18n.language]);
  useEffect(() => {
    reportMissingTranslations(
      'chadhava',
      detail,
      view,
      ['title', 'shortTitle', 'description', 'templeName', 'templeDescription', 'buttonText', 'category'],
      i18n.language,
    );
  }, [detail, view, i18n.language]);
  useEffect(() => {
    if (detail) setExitIntentContext({ pageType: 'chadhava', chadhavaId: detail._id || detail.id || id, itemTitle: detail.title || detail.name, amount: 0 });
  }, [detail, id]);
  useEffect(() => {
    const key = 'hidden-item-robots'; let meta = document.querySelector(`meta[data-exit-key="${key}"]`);
    if (detail?.isHidden) { if (!meta) { meta = document.createElement('meta'); meta.dataset.exitKey = key; meta.name = 'robots'; document.head.appendChild(meta); } meta.content = 'noindex,nofollow'; }
    return () => meta?.remove();
  }, [detail?.isHidden]);
  const viewOfferings = useMemo(
    () => (Array.isArray(view?.offerings) ? view.offerings : offerings),
    [view, offerings]
  );
  const displayDate = (value) => formatEventDate(value, getDateLocale(i18n.language));

  const normalizedBenefits = useMemo(() => {
    const raw = view?.benefits;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => {
        if (typeof item === 'string') {
          const title = item.trim();
          return title ? { title, subtitle: '' } : null;
        }
        if (!item || typeof item !== 'object') return null;
        const title = String(item.title || '').trim();
        const subtitle = String(item.subtitle || '').trim();
        if (!title && !subtitle) return null;
        return { title, subtitle };
      })
      .filter(Boolean);
  }, [view]);

  const templeName = view?.templeName || t('chadhavaDetail.defaultTemple');
  const templeDescription = view?.templeDescription || '';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    document.body.classList.add('hide-whatsapp-fab');
    return () => {
      document.body.classList.remove('hide-whatsapp-fab');
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const getDetail = async () => {
      try {
        setLoading(true);
        setCartReady(false);
        setCart({});
        const res = await axiosInstance.get(`/chadhava/${encodeURIComponent(id)}`);
        const item = res?.data?.item || res?.data?.data?.item || res?.data?.data || res?.data;
        if (!mounted) return;
        if (!item || typeof item !== 'object') {
          setDetail(null);
          setOfferings([]);
          return;
        }
        setDetail(item);
        setOfferings(Array.isArray(item.offerings) ? item.offerings : []);
      } catch (e) {
        if (!mounted) return;
        setDetail(null);
        setOfferings([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (id) getDetail();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    setAboutVisibleLines(collapsedLines);
  }, [detail]);

  useEffect(() => {
    if (!aboutTextRef.current) {
      setAboutHasOverflow(false);
      return;
    }
    const el = aboutTextRef.current;
    setAboutHasOverflow(el.scrollHeight - el.clientHeight > 2);
  }, [detail, aboutVisibleLines]);

  useEffect(() => {
    if (isBookingBlocked) setCart({});
  }, [isBookingBlocked]);

  const cartStorageKey = `${CART_STORAGE_PREFIX}${detail?._id || detail?.id || id}`;
  const relatedPujaStorageKey = `${RELATED_POOJA_DISMISSED_STORAGE_PREFIX}${detail?._id || detail?.id || id}`;
  const firstAvailableIndex = useMemo(() => offerings.findIndex(isOfferingAvailable), [offerings]);

  useEffect(() => {
    relatedPujaRequestRef.current = false;
    setRelatedPuja(null);
    setShowRelatedPuja(false);
  }, [id]);

  // Once per loaded chadhava: restore the saved selection, otherwise preselect
  // the first available offering (qty 1). Never auto-selects when booking is closed.
  useEffect(() => {
    if (loading || !detail || cartReady) return;
    if (isBookingBlocked) {
      setCartReady(true);
      return;
    }
    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(cartStorageKey) || 'null');
    } catch {
      saved = null;
    }
    if (saved && typeof saved.cart === 'object' && saved.cart !== null) {
      const validKeys = new Set(
        offerings.map((o, i) => (isOfferingAvailable(o) ? offeringKey(o, i) : null)).filter(Boolean)
      );
      const restored = {};
      Object.entries(saved.cart).forEach(([key, qty]) => {
        const n = Math.floor(Number(qty));
        if (validKeys.has(key) && n > 0) restored[key] = n;
      });
      setCart(restored);
    } else if (firstAvailableIndex >= 0) {
      setCart({ [offeringKey(offerings[firstAvailableIndex], firstAvailableIndex)]: 1 });
    }
    setCartReady(true);
  }, [loading, detail, cartReady, isBookingBlocked, cartStorageKey, offerings, firstAvailableIndex]);

  // Remember every change (including an emptied cart) for this chadhava.
  useEffect(() => {
    if (!cartReady || isBookingBlocked) return;
    try {
      sessionStorage.setItem(cartStorageKey, JSON.stringify({ cart }));
    } catch {
      // storage unavailable (private mode): selection just won't survive navigation
    }
  }, [cart, cartReady, isBookingBlocked, cartStorageKey]);

  useEffect(() => {
    if (!cartReady || !detail || isBookingBlocked || relatedPujaRequestRef.current) return;
    if (Object.values(cart).reduce((sum, quantity) => sum + Number(quantity || 0), 0) <= 0) return;
    try {
      if (sessionStorage.getItem(relatedPujaStorageKey)) return;
    } catch {
      // Continue without persistence when storage is unavailable.
    }

    let mounted = true;
    relatedPujaRequestRef.current = true;
    axiosInstance.get('/pooja', { params: { upcoming: true, limit: 100 } })
      .then((response) => {
        const pujas = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.poojas)
            ? response.data.poojas
            : [];
        const match = findRelatedPuja(detail, pujas);
        if (!mounted || !match) return;
        setRelatedPuja(match);
        setShowRelatedPuja(true);
      })
      .catch(() => {
        // Recommendations are optional and must never affect booking.
      });
    return () => {
      mounted = false;
    };
  }, [cart, cartReady, detail, isBookingBlocked, relatedPujaStorageKey]);

  const relatedPujaView = useMemo(() => (
    relatedPuja ? localizeRecord(localizePujaRecord(relatedPuja, i18n.language), i18n.language) : null
  ), [relatedPuja, i18n.language]);
  const relatedPujaPrice = relatedPuja ? getPujaPackagePrice(relatedPuja) : null;
  const relatedPujaBanner = useMemo(() => getPujaBannerImage(relatedPuja), [relatedPuja]);
  const dismissRelatedPuja = () => {
    setShowRelatedPuja(false);
    try {
      sessionStorage.setItem(relatedPujaStorageKey, '1');
    } catch {
      // Dismissal still works for this render when storage is unavailable.
    }
  };
  const viewRelatedPuja = () => {
    const pujaId = relatedPuja?._id || relatedPuja?.id;
    if (!pujaId) return;
    dismissRelatedPuja();
    navigate(`/puja/${encodeURIComponent(pujaId)}`);
  };

  const scrollToSection = (sectionId) => {
    setActiveTab(sectionId);
    tabScrollLockRef.current = true;
    sectionRefs.current[sectionId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  useEffect(() => {
    let unlockTimer;
    const onScroll = () => {
      // While a tab click is smooth-scrolling, keep the clicked tab active until scrolling settles.
      if (tabScrollLockRef.current) {
        clearTimeout(unlockTimer);
        unlockTimer = setTimeout(() => { tabScrollLockRef.current = false; }, 150);
        return;
      }
      const sectionOrder = SECTION_TABS.map((t) => t.id);
      let current = activeTab;
      for (const idKey of sectionOrder) {
        const el = sectionRefs.current[idKey];
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= 160) current = idKey;
      }
      if (current !== activeTab) setActiveTab(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(unlockTimer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [activeTab]);

  const updateCart = (offeringId, change) => {
    if (isBookingBlocked) return;
    setCart(prev => {
      const currentCount = prev[offeringId] || 0;
      const newCount = Math.max(0, currentCount + change);
      
      if (newCount === 0) {
        const newCart = { ...prev };
        delete newCart[offeringId];
        return newCart;
      }
      
      return {
        ...prev,
        [offeringId]: newCount
      };
    });
  };

  const getTotalItems = () => Object.values(cart).reduce((sum, count) => sum + count, 0);
  const getTotalPrice = () => 
    Object.entries(cart).reduce((total, [offeringId, count]) => {
      const offering = offerings.find((o, i) => String(o._id || o.id || i) === String(offeringId));
      return total + ((Number(offering?.price) || 0) * count || 0);
    }, 0);

  const handleBuyNow = () => {
    if (isBookingBlocked || getTotalItems() === 0) return;
    const selectedOfferings = Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([offeringId, qty]) => {
        const offering = offerings.find((o, i) => String(o._id || o.id || i) === String(offeringId));
        if (!offering) return null;
        const price = Number(offering.price || 0);
        return {
          id: offering._id || offering.id || offeringId,
          // English (raw) name is saved in the booking; BillingPage translates it for display.
          name: offering.title || 'Offering',
          price,
          quantity: qty,
          total: price * qty,
        };
      })
      .filter(Boolean);

    const total = selectedOfferings.reduce((sum, item) => sum + item.total, 0);

    const billingState = {
      puja: {
        id: detail?._id || detail?.id || id,
        title: detail?.title || 'Chadhava',
        date: formatEventDate(detail?.eventdate || detail?.eventDate || detail?.dateRange),
      },
      selectedChadhava: {
        id: detail?._id || detail?.id || id,
        title: detail?.title || 'Chadhava',
        date: formatEventDate(detail?.eventdate || detail?.eventDate || detail?.dateRange),
        bannerImage: detail?.bannerImage || null,
        description: detail?.description || '',
      },
      image: detail?.bannerImage || null,
      selectedPackage: {
        id: 'chadhava-offerings',
        name: detail?.title || 'Chadhava',
        price: total,
      },
      addons: selectedOfferings,
      addonsTotal: 0,
      grandTotal: total,
      mode: 'chadhava',
      // Display-only Hindi/Telugu for the English names above (not sent with the booking).
      textTranslations: buildTextTranslations(
        { ...detail, offerings },
        [detail?.title, ...offerings.map((o) => o?.title)],
        localizeChadhava
      ),
    };


    navigate('/billing', {
      state: billingState,
    });
  };

  if (loading) {
    return (
      <main className="chd-page">
        <div className="chd-not-found">
          <p>{t('chadhava.detailsLoading')}</p>
        </div>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="chd-page">
        <div className="chd-not-found">
          <p>{t('chadhava.notFound')}</p>
          <button type="button" onClick={() => navigate('/chadhava')}>
            {t('chadhava.backToList')}
          </button>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="chd-page">
        <div className="chd-container">
          {/* Hero: banner + text */}
          <section className="chd-hero">
            <div className="chd-hero-grid">
              <div className="chd-hero-wrap">
                <div className="chd-hero-banner">
                  <div className="chd-hero-inner">
                    {detail.bannerImage ? (
                      <img
                        // Resized WebP copies when the API provides variants; otherwise the original.
                        src={optimizedImage(detail.bannerImage, 960, detail.bannerImageVariants)}
                        srcSet={optimizedSrcSet(detail.bannerImage, [640, 960, 1280], detail.bannerImageVariants)}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        alt={view.title || t('nav.chadhava')}
                        className="chd-hero-image"
                        loading="eager"
                        fetchpriority="high"
                        decoding="async"
                      />
                    ) : (
                      <div className="chd-hero-image chd-hero-image-fallback" />
                    )}
                    {isBookingBlocked ? (
                      <span className="chd-sold-out-tag">{t('puja.soldOut')}</span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="chd-hero-text">
                <div className="chd-details-header">
                  <h1 className="chd-title">{view.title}</h1>
                  <p className="chd-subtitle">
                    {view.subtitle || t('chadhavaDetail.defaultSubtitle')}
                  </p>
                  <p className="chd-meta">
                    <span className="chd-meta-icon">🏛</span>
                    {templeName}
                  </p>
                  <p className="chd-meta">
                    <span className="chd-meta-icon">📅</span>
                    {displayDate(detail.eventdate || detail.eventDate || detail.dateRange)}
                  </p>
                </div>
                {view?.description ? (
                  <div className="chd-details-about">
                    <div
                      className="chd-details-about-text"
                      style={{
                        WebkitLineClamp: aboutVisibleLines,
                        lineClamp: aboutVisibleLines,
                      }}
                      ref={aboutTextRef}
                    >
                      {renderRichText(view.description)}
                    </div>
                    <div className="chd-details-about-actions">
                      {aboutVisibleLines <= collapsedLines && aboutHasOverflow ? (
                        <button
                          type="button"
                          className="chd-read-more-btn"
                          onClick={() => setAboutVisibleLines(999)}
                        >
                          {t('common.readMore')}
                        </button>
                      ) : null}
                      {aboutVisibleLines > collapsedLines ? (
                        <button
                          type="button"
                          className="chd-read-more-btn chd-read-less"
                          onClick={() => setAboutVisibleLines(collapsedLines)}
                        >
                          {t('common.readLess')}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <p className="chd-devotees">
                  {t('chadhavaDetail.devoteesBefore')}{' '}
                  <strong>{t('chadhavaDetail.devoteesCount', { count: detail.devoteesCount || t('chadhavaDetail.many') })}</strong>{' '}
                  {t('chadhavaDetail.devoteesAfter')}
                </p>
              </div>
            </div>
          </section>

          <nav className="chd-section-nav">
            <div className="chd-section-nav-inner">
              {SECTION_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`chd-section-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => scrollToSection(tab.id)}
                >
                  {t(tab.labelKey)}
                </button>
              ))}
            </div>
          </nav>

          {/* Offerings list */}
          <section
            className="chd-offerings chd-section"
            id="packages"
            ref={(el) => {
              sectionRefs.current.packages = el;
            }}
          >
            {showRelatedPuja && relatedPuja && relatedPujaView && (
              <aside className="chd-related-pooja" role="dialog" aria-label={t('relatedPooja.title')}>
                <button type="button" className="chd-related-pooja-close" onClick={dismissRelatedPuja} aria-label={t('relatedPooja.close')}>×</button>
                {relatedPujaBanner && (
                  <img
                    className="chd-related-pooja-image"
                    src={optimizedImage(relatedPujaBanner.url, 320, relatedPujaBanner.variants)}
                    srcSet={optimizedSrcSet(relatedPujaBanner.url, [320, 640], relatedPujaBanner.variants)}
                    sizes="(max-width: 480px) 96px, 180px"
                    alt=""
                    loading="lazy"
                  />
                )}
                <div className="chd-related-pooja-content">
                  <p className="chd-related-pooja-eyebrow">{t('relatedPooja.title')}</p>
                  <p className="chd-related-pooja-name">{relatedPujaView.name || relatedPujaView.title}</p>
                  {relatedPujaView.description && <p className="chd-related-pooja-description">{relatedPujaView.description}</p>}
                  {relatedPujaPrice != null && <p className="chd-related-pooja-price">{t('relatedPooja.fromPrice', { price: relatedPujaPrice.toLocaleString('en-IN') })}</p>}
                  <button type="button" className="chd-related-pooja-view" onClick={viewRelatedPuja}>{t('relatedPooja.viewPooja')}</button>
                </div>
              </aside>
            )}
            <h2 className="chd-section-title">{t('chadhava.chooseOffering')}</h2>
            {isBookingBlocked ? (
              <p className="chd-booking-closed-banner" role="status">
                <strong>{t('detailCommon.bookingClosedStrong')}</strong> {t('chadhavaDetail.notAvailable')}
              </p>
            ) : null}
            <div className="chd-offering-list">
              {viewOfferings.map((offering, index) => {
                const offeringId = offering._id || offering.id || index;
                const count = cart[offeringId] || 0;
                return (
                  <div key={offeringId} className="chd-offering-row">
                    <div className="chd-offering-main">
                      <p className="chd-offering-label">{offering.special ? t('chadhavaDetail.specialOffering') : t('chadhavaDetail.offering')}</p>
                      <h3 className="chd-offering-title">{offering.title}</h3>
                      {offering.description && <p className="chd-offering-meta">{offering.description}</p>}
                      <p className="chd-offering-price">₹{Number(offering.price || 0).toLocaleString('en-IN')}</p>
                     
                     
                    </div>
                    <div className="chd-offering-side">
                      <div
                        className="chd-offering-thumb"
                        style={offering.image ? { backgroundImage: `url(${offering.image})` } : undefined}
                      />
                      <div className="chd-offering-controls">
                        {count > 0 ? (
                          <div className="chd-quantity-controls">
                            <button 
                              type="button"
                              className="chd-qty-btn chd-qty-minus"
                              disabled={isBookingBlocked}
                              onClick={() => updateCart(offeringId, -1)}
                            >
                              -
                            </button>
                            <span className="chd-qty-display">{count}</span>
                            <button 
                              type="button"
                              className="chd-qty-btn chd-qty-plus"
                              disabled={isBookingBlocked}
                              onClick={() => updateCart(offeringId, 1)}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button 
                            type="button" 
                            className="chd-offering-add"
                            disabled={isBookingBlocked}
                            onClick={() => updateCart(offeringId, 1)}
                          >
                            {t('chadhava.add')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {offerings.length === 0 && (
              <p className="chd-faq-answer">{t('chadhava.noOfferings')}</p>
            )}
          </section>

          <PrasadamCard source="chadhava" />

          <section
            className="chd-temple-benefits chd-section"
            id="benefits"
            ref={(el) => {
              sectionRefs.current.benefits = el;
            }}
          >
            <h2 className="chd-section-title">{t('detailTabs.benefits')}</h2>
            {normalizedBenefits.length > 0 ? (
              <ul className="chd-benefits-grid">
                {normalizedBenefits.map((benefit, idx) => (
                  <li key={`${benefit.title}-${idx}`} className="chd-benefit-item">
                    <div className="chd-benefit-icon">✓</div>
                    <p className="chd-benefit-title">{benefit.title}</p>
                    {benefit.subtitle ? (
                      <p className="chd-benefit-subtitle">{benefit.subtitle}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="chd-empty-block">{t('chadhavaDetail.benefitsSoon')}</p>
            )}
          </section>

          <section
            className="chd-temple-benefits chd-section"
            id="temple"
            ref={(el) => {
              sectionRefs.current.temple = el;
            }}
          >
            <h2 className="chd-section-title">{t('detailTabs.temple')}</h2>
            {templeDescription ? (
              <div className="chd-temple-block">
                <h3 className="chd-temple-name">{templeName}</h3>
                <div className="chd-temple-text">{renderRichText(templeDescription)}</div>
              </div>
            ) : (
              <p className="chd-empty-block">{t('chadhavaDetail.templeSoon')}</p>
            )}
          </section>

          {/* FAQs */}
          <section
            className="chd-faqs chd-section"
            id="faqs"
            ref={(el) => {
              sectionRefs.current.faqs = el;
            }}
          >
            <h2 className="chd-section-title">{t('detailCommon.faqTitle')}</h2>
            <ul className="chd-faq-list">
              {FAQ_NUMBERS.map((n, index) => (
                <li key={n} className="chd-faq-item">
                  <button
                    type="button"
                    className="chd-faq-question"
                    onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  >
                    {t(`chadhavaDetail.faq${n}q`)}
                    <span className="chd-faq-chevron">
                      {activeFaq === index ? '▲' : '▼'}
                    </span>
                  </button>
                  {activeFaq === index && (
                    <p className="chd-faq-answer">
                      {t(`chadhavaDetail.faq${n}a`)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* Reviews & Feedback */}
          <div
            className="chd-reviews-anchor"
            id="reviews"
            ref={(el) => {
              sectionRefs.current.reviews = el;
            }}
          >
            <ReviewsFeedback
              serviceType="chadhava"
              benefits={normalizedBenefits}
              benefitSource={CHADHAVA_BENEFIT_REVIEWER}
              matchText={[detail?.title, detail?.shortTitle, detail?.subtitle, detail?.templeName, detail?.description]
                .filter(Boolean)
                .join(' ')}
            />
          </div>
        </div>
        <Footer />
      </main>

      {/* Sticky bottom CTA — same pattern as the Pooja detail page's sticky bar */}
      <div className={`chd-sticky-cta${isBookingBlocked ? ' chd-sticky-cta--closed' : ''}`}>
        <div className="chd-sticky-inner">
          {isBookingBlocked ? (
            <span className="chd-sticky-closed-text">🔒 {t('common.bookingClosed')}</span>
          ) : getTotalItems() > 0 ? (
            <button
              type="button"
              className="chd-sticky-btn chd-sticky-btn--selected"
              onClick={handleBuyNow}
            >
              <span className="chd-sticky-info">
                <span className="chd-sticky-count">{t('chadhava.items', { count: getTotalItems() })}</span>
                <span className="chd-sticky-price">₹{getTotalPrice().toLocaleString('en-IN')}</span>
              </span>
              <span className="chd-sticky-action">{t('chadhavaDetail.offerChadhava')} →</span>
            </button>
          ) : (
            <button
              type="button"
              className="chd-sticky-btn chd-sticky-btn--full"
              disabled={firstAvailableIndex < 0}
              onClick={() => scrollToSection('packages')}
            >
              {firstAvailableIndex < 0 ? t('chadhava.noOfferings') : `${t('chadhava.chooseOffering')} →`}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default ChadhavaDetail;
