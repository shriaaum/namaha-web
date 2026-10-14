import React from 'react';
import { useTranslation } from 'react-i18next';
import './About.css';
import Footer from '../Footer/Footer';

function About() {
  const { t } = useTranslation();
  // const stats = [
  //   { id: 1, icon: '🙏', value: '10k', label: 'Devotees' },
  //   { id: 2, icon: '⭐', value: '4.5', label: 'Star Rating' },
  //   { id: 4, icon: '🔥', value: '10k+', label: 'Services' },
  // ];

  return (
    <main className="about-page">
      <section className="about-hero">
        <div className="about-hero-inner">
          <img src="/logo.png" alt={t('about.logoAlt')} className="about-logo" />
          <h1>{t('about.title')}</h1>
          <p className="about-tagline">
            {t('about.tagline')}
          </p>
        </div>
      </section>

      <section className="about-content">
        <div className="about-container">
          <p className="about-desc">
            {t('about.p1')}
          </p>
          <p className="about-desc">
            {t('about.p2')}
          </p>
          <p className="about-desc">
            <strong>{t('about.shriLabel')}</strong> {t('about.shriText')}<br />
            <strong>{t('about.aaumLabel')}</strong> {t('about.aaumText')}
          </p>
          <p className="about-desc">
            {t('about.p4')}
          </p>
          <p className="about-desc">
            {t('about.p5')}
          </p>
        </div>
      </section>

      <section className="about-values">
        <div className="about-container">
          <h2>{t('about.principlesTitle')}</h2>
          <div className="about-values-grid">
            <div className="about-value-card">
              <h3>{t('about.templeTitle')}</h3>
              <p>{t('about.templeText')}</p>
            </div>
            <div className="about-value-card">
              <h3>{t('about.teerthTitle')}</h3>
              <p>{t('about.teerthText')}</p>
            </div>
            <div className="about-value-card">
              <h3>{t('about.tattvaTitle')}</h3>
              <p>{t('about.tattvaText')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-content">
        <div className="about-container">
          <p className="about-desc">
            {t('about.p6')}
          </p>
          <p className="about-desc">
            {t('about.forTravel')}<br />
            {t('about.forStructure')}<br />
            {t('about.forGrace')}
          </p>
          <p className="about-desc about-cta">
            {t('about.cta')}
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}

export default About;
