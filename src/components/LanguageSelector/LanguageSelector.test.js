/**
 * The header language selector: options, current value, and instant switching
 * of every translated component on the page.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import LanguageSelector from './LanguageSelector';

const en = require('../../i18n/en.json');
const hi = require('../../i18n/hi.json');
const te = require('../../i18n/te.json');

function NavLabel() {
  const { t } = useTranslation();
  return <span data-testid="label">{t('nav.home')}</span>;
}

beforeEach(async () => {
  localStorage.clear();
  await act(async () => { await i18n.changeLanguage('en'); });
});

test('shows English, Hindi and Telugu with their native names', () => {
  render(<LanguageSelector />);
  const options = screen.getAllByRole('option').map((o) => [o.value, o.textContent]);
  expect(options).toEqual([['en', 'English'], ['hi', 'हिन्दी'], ['te', 'తెలుగు']]);
});

test('is labelled for screen readers in the current language', async () => {
  render(<LanguageSelector />);
  expect(screen.getByRole('combobox', { name: en.common.language })).toBeInTheDocument();
  await act(async () => { await i18n.changeLanguage('hi'); });
  expect(screen.getByRole('combobox', { name: hi.common.language })).toBeInTheDocument();
});

test.each([['hi', hi], ['te', te], ['en', en]])('selecting %s switches page text instantly and saves it', (lang, json) => {
  render(<><LanguageSelector /><NavLabel /></>);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: lang } });
  expect(screen.getByTestId('label')).toHaveTextContent(json.nav.home);
  expect(screen.getByRole('combobox')).toHaveValue(lang);
  expect(localStorage.getItem('shriaaum.language')).toBe(lang);
  expect(document.documentElement.lang).toBe(lang);
});

test('reflects a language changed elsewhere in the app', async () => {
  render(<LanguageSelector />);
  await act(async () => { await i18n.changeLanguage('te'); });
  expect(screen.getByRole('combobox')).toHaveValue('te');
});

test('switching back and forth never leaves stale text', () => {
  render(<><LanguageSelector /><NavLabel /></>);
  const select = screen.getByRole('combobox');
  for (const [lang, json] of [['hi', hi], ['te', te], ['hi', hi], ['en', en], ['te', te]]) {
    fireEvent.change(select, { target: { value: lang } });
    expect(screen.getByTestId('label')).toHaveTextContent(json.nav.home);
  }
});
