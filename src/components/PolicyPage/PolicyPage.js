import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Footer from '../Footer/Footer';
import { policies } from './policyContent';
import './PolicyPage.css';

function PolicyPage({ policy }) {
  const { t } = useTranslation();
  const content = policies[policy];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [policy]);

  return (
    <>
      <article className="policy-page">
        <div className="policy-container">
          <header className="policy-header">
            <h1>{t(`policies.${policy}.title`, { defaultValue: content.title })}</h1>
            <p className="policy-effective">{t('policies.effectiveDate', { defaultValue: 'Effective Date: August 12, 2026' })}</p>
          </header>
          {content.intro?.map((paragraph) => <p key={paragraph} className="policy-intro">{paragraph}</p>)}
          {content.sections.map(([heading, paragraphs, bullets]) => (
            <section className="policy-section" key={heading}>
              <h2>{heading}</h2>
              {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {bullets && <ul>{bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
            </section>
          ))}
        </div>
      </article>
      <Footer />
    </>
  );
}

export default PolicyPage;
