import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Contact.css';
import Footer from '../Footer/Footer';

const WHATSAPP_NUMBER = "9177709684";

function Contact() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Build a WhatsApp message from the form fields
    const { name, email, subject, message } = formData;
    const lines = [
      "New contact enquiry from website:",
      name && `Name: ${name}`,
      email && `Email: ${email}`,
      subject && `Subject: ${subject}`,
      message && `Message: ${message}`,
    ].filter(Boolean);

    const text = encodeURIComponent(lines.join("\n"));
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;

    // Open WhatsApp chat with pre-filled text
    window.open(waUrl, "_blank");

    setSubmitted(true);
  };

  return (
    <main className="contact-page">
      <section className="contact-hero">
        <div className="contact-hero-inner">
          <h1>{t('contact.title')}</h1>
          <p>{t('contact.subtitle')}</p>
        </div>
      </section>

      <section className="contact-main">
        <div className="contact-container">
          <div className="contact-grid">
            <div className="contact-info">
              <h2>{t('contact.getInTouch')}</h2>
              <div className="contact-info-item">
                <span className="contact-icon">📍</span>
                <div>
                  <strong>{t('contact.ourAddress')}</strong>
                  <p>
                    {t('address.line1')}<br />
                    {t('address.line2')}<br />
                    {t('address.line3')}
                  </p>
                </div>
              </div>
              <div className="contact-info-item">
                <span className="contact-icon">📧</span>
                <div>
                  <strong>{t('contact.email')}</strong>
                  <p>bhakta@shriaaum.com</p>
                </div>
              </div>
              <div className="contact-info-item">
                <span className="contact-icon">📱</span>
                <div>
                  <strong>{t('contact.support')}</strong>
                  <p>{t('contact.supportVia')}</p>
                  <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"> 9177709684 {t('contact.whatsappSuffix')}</a>
                </div>
              </div>
            </div>

            <div className="contact-form-wrap">
              <h2>{t('contact.sendMessageTitle')}</h2>
              {submitted ? (
                <div className="contact-success">
                  <p>{t('contact.thankYou')}</p>
                </div>
              ) : (
                <form className="contact-form" onSubmit={handleSubmit}>
                  <div className="contact-field">
                    <label htmlFor="name">{t('contact.name')}</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder={t('contact.namePlaceholder')}
                    />
                  </div>
                  <div className="contact-field">
                    <label htmlFor="email">{t('contact.email')}</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder={t('contact.emailPlaceholder')}
                    />
                  </div>
                  <div className="contact-field">
                    <label htmlFor="subject">{t('contact.subject')}</label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder={t('contact.subjectPlaceholder')}
                    />
                  </div>
                  <div className="contact-field">
                    <label htmlFor="message">{t('contact.message')}</label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      placeholder={t('contact.messagePlaceholder')}
                    />
                  </div>
                  <button type="submit" className="contact-btn">
                    {t('contact.send')}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

export default Contact;
