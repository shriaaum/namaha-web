import React from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLanguages } from '../../i18n';
import './LanguageSelector.css';

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();
  return <label className="language-selector">
    <span className="sr-only">{t('common.language')}</span>
    <select aria-label={t('common.language')} value={i18n.language} onChange={(event) => i18n.changeLanguage(event.target.value)}>
      {supportedLanguages.map((language) => <option value={language.code} key={language.code}>{language.label}</option>)}
    </select>
  </label>;
}
