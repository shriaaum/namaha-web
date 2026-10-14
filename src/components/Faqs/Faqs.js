import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './Faqs.css';

// Text lives in i18n under faqs.<key>Title / faqs.<key>Desc.
const benefits = [
  { id: 1, key: 'festivals', icon: '🪔' },
  { id: 2, key: 'sankalpa', icon: '📦' },
  { id: 3, key: 'pandits', icon: '📿' },
  { id: 4, key: 'affordable', icon: '💫' },
];

function Faqs() {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const goToSlide = (index) => {
    setActiveIndex((index + benefits.length) % benefits.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 4000);
  };

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % benefits.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  return (
    <section className="faq-section">
      <div className="faq-container">
        <h2 className="faq-heading">
          {t('faqs.heading')}
        </h2>
       
        <div className="faq-carousel">
          {/* <button
            type="button"
            className="faq-carousel-btn faq-carousel-prev"
            onClick={() => goToSlide(activeIndex - 1)}
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            className="faq-carousel-btn faq-carousel-next"
            onClick={() => goToSlide(activeIndex + 1)}
            aria-label="Next"
          >
            ›
          </button> */}

          <div className="faq-carousel-track">
            {benefits.map((item, index) => (
              <div
                key={item.id}
                className={`faq-carousel-slide ${index === activeIndex ? 'active' : ''} ${index < activeIndex ? 'prev' : ''} ${index > activeIndex ? 'next' : ''}`}
              >
                <div className="faq-benefit-card">
                  <span className="faq-benefit-icon" aria-hidden="true">{item.icon}</span>
                  <h3 className="faq-benefit-title">{t(`faqs.${item.key}Title`)}</h3>
                  <p className="faq-benefit-desc">{t(`faqs.${item.key}Desc`)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="faq-carousel-dots">
            {benefits.map((_, index) => (
              <button
                key={benefits[index].id}
                type="button"
                className={`faq-dot ${index === activeIndex ? 'active' : ''}`}
                onClick={() => goToSlide(index)}
                aria-label={t('faqs.goToSlide', { number: index + 1 })}
                aria-current={index === activeIndex}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Faqs;
