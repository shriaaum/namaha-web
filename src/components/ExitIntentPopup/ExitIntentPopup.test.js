import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import ExitIntentPopup from './ExitIntentPopup';
import {
  getExitIntentContext,
  markPendingBooking,
  clearPendingBooking,
  resetExitIntentContext,
  setExitIntentContext,
  setExitIntentSuppressed,
} from '../../lib/exitIntentContext';

// react-scripts' Jest cannot resolve react-router-dom v7's package exports; v7 re-exports react-router.
jest.mock('react-router-dom', () => {
  const { TextEncoder, TextDecoder } = jest.requireActual('util'); // react-router needs these; jsdom lacks them
  Object.assign(global, { TextEncoder, TextDecoder });
  return jest.requireActual('react-router');
}, { virtual: true });
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, o) => (o?.item ? `${k}:${o.item}` : k), i18n: { language: 'en' } }),
}));
jest.mock('../../lib/instance', () => ({ __esModule: true, default: { post: jest.fn(() => Promise.resolve({ data: { success: true } })) } }));

const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36';
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/130.0 Mobile Safari/537.36';

let now;
let keySeq = 0;
let navigate;
const NavProbe = () => { navigate = useNavigate(); return null; };

const setUA = (ua) => Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true });
const advance = (ms) => { now += ms; };
const popupShown = () => screen.queryByText('exitPopup.title') !== null;
const leaveTop = () => fireEvent.mouseOut(document, { clientY: -1, clientX: 400, relatedTarget: null });
/** The only trigger: a click/tap (arms the Back guard) and then the browser/phone Back button. */
const clickThenBack = async () => { fireEvent.pointerDown(window); await back(); };
const flush = () => act(() => new Promise((r) => setTimeout(r, 20)));
/** jsdom fires popstate asynchronously after history.back(). */
const back = async () => { await act(async () => { window.history.back(); await new Promise((r) => setTimeout(r, 30)); }); };

const mount = (path) => {
  // A fresh router key per test: the guard is "once per page" by router entry key.
  window.history.replaceState({ usr: null, key: `t${++keySeq}`, idx: 0 }, '', path);
  return render(<BrowserRouter><NavProbe /><ExitIntentPopup /></BrowserRouter>);
};

beforeEach(() => {
  now = 1_700_000_000_000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  localStorage.clear();
  sessionStorage.clear();
  resetExitIntentContext();
  setExitIntentSuppressed(false);
  setUA(DESKTOP_UA);
});
afterEach(() => jest.restoreAllMocks());

describe('only the Back button opens the popup', () => {
  test('mouse leaving through the top or side does NOT open it', () => {
    mount('/puja/abc');
    advance(6000);
    leaveTop();
    fireEvent.mouseOut(document, { clientY: 60, clientX: window.innerWidth, relatedTarget: null });
    expect(popupShown()).toBe(false);
  });

  test('switching tabs and coming back does NOT open it', () => {
    mount('/puja/abc');
    advance(6000);
    const setVisibility = (v) => Object.defineProperty(document, 'visibilityState', { value: v, configurable: true });
    setVisibility('hidden');
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    setVisibility('visible');
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(popupShown()).toBe(false);
  });

  test('fast scroll up on mobile does NOT open it', () => {
    setUA(MOBILE_UA);
    mount('/puja/abc');
    advance(6000);
    let t = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => t);
    const scrollTo = (y, at) => { t = at; Object.defineProperty(window, 'scrollY', { value: y, configurable: true }); fireEvent.scroll(window); };
    scrollTo(0, 0); scrollTo(1200, 1000); scrollTo(100, 1100);
    expect(popupShown()).toBe(false);
  });

  test('no auto-open on a timer, and opening/clicking the page does not open it', async () => {
    jest.useFakeTimers();
    try {
      mount('/');
      fireEvent.pointerDown(window);
      advance(120000);
      act(() => { jest.advanceTimersByTime(120000); });
      expect(popupShown()).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  test('desktop: home as first page -> Back shows the popup instead of leaving; next Back is not trapped', async () => {
    mount('/');
    advance(6000);
    await clickThenBack();
    expect(popupShown()).toBe(true);
    expect(window.location.pathname).toBe('/');
    expect(getExitIntentContext().pageType).toBe('home');

    fireEvent.click(screen.getByText('×'));
    fireEvent.pointerDown(window);
    expect(window.history.state?.exitGuard).toBeUndefined(); // no second guard on the same page
  });

  test('desktop and mobile: Back works on every eligible page', async () => {
    for (const ua of [DESKTOP_UA, MOBILE_UA]) {
      setUA(ua);
      for (const path of ['/', '/en', '/hi', '/te', '/tu', '/puja', '/puja/abc', '/chadhava', '/chadhava/c1', '/chadava/c1', '/billing']) {
        localStorage.clear();
        const { unmount } = mount(path);
        advance(6000);
        await clickThenBack();
        expect([ua === MOBILE_UA ? 'mobile' : 'desktop', path, popupShown()]).toEqual([ua === MOBILE_UA ? 'mobile' : 'desktop', path, true]);
        unmount();
      }
    }
  });

  test('pages outside the list (e.g. /about) never arm the Back guard', () => {
    mount('/about');
    advance(6000);
    fireEvent.pointerDown(window);
    expect(window.history.state?.exitGuard).toBeUndefined();
  });

  test('Back without any click/tap first is not intercepted (browser rule)', () => {
    Object.defineProperty(navigator, 'userActivation', { value: { hasBeenActive: false }, configurable: true });
    try {
      mount('/');
      advance(6000);
      fireEvent.pointerDown(window);
      expect(window.history.state?.exitGuard).toBeUndefined();
    } finally {
      delete navigator.userActivation;
    }
  });

  test('Back within the first 5s lets the Back proceed, and debug mode says why', async () => {
    localStorage.setItem('exitIntentDebug', '1');
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mount('/puja/abc');
    advance(3000);
    const historyBack = jest.spyOn(window.history, 'back');
    await clickThenBack();
    expect(popupShown()).toBe(false);
    expect(historyBack).toHaveBeenCalledTimes(2); // ours + the re-issued one
    expect(log).toHaveBeenCalledWith('[exit-intent]', 'not shown (back-button):', expect.stringMatching(/^dwell 3s < 5s/));
  });

  test('dwell is measured from the first eligible page view, not reset by navigation', async () => {
    mount('/puja');
    advance(4000);
    fireEvent.pointerDown(window);
    act(() => navigate('/puja/abc'));
    advance(1500);
    await back(); // /puja/abc -> /puja (guard entry)
    await back(); // leaving the site
    expect(popupShown()).toBe(true);
  });

  test('in-app Back between two pages does not trigger; Back that leaves the site does', async () => {
    mount('/puja');
    advance(6000);
    fireEvent.pointerDown(window);
    act(() => navigate('/puja/abc'));
    await back();
    expect(window.location.pathname).toBe('/puja');
    expect(popupShown()).toBe(false);
    await back();
    expect(popupShown()).toBe(true);
  });
});

describe('repeat rules', () => {
  test('close -> short 30s pause only; after it, every new visit shows the popup again on Back', async () => {
    let view = mount('/puja/abc');
    advance(6000);
    await clickThenBack();
    fireEvent.click(screen.getByText('×'));
    expect(popupShown()).toBe(false);
    view.unmount();

    advance(10 * 1000);
    view = mount('/'); // came back within 30s
    await clickThenBack();
    expect(popupShown()).toBe(false);
    view.unmount();

    advance(25 * 1000);
    mount('/');
    await clickThenBack();
    expect(popupShown()).toBe(true);
  });

  test('shows again in the same session (no once-per-session rule)', async () => {
    const view = mount('/puja/abc');
    advance(6000);
    await clickThenBack();
    expect(popupShown()).toBe(true);
    fireEvent.click(screen.getByText('×'));
    view.unmount();

    advance(60 * 1000);
    mount('/');
    await clickThenBack();
    expect(popupShown()).toBe(true);
  });

  test('an old 24h close (from the previous rule) no longer blocks the popup', async () => {
    localStorage.setItem('exitIntentClosedUntil', String(Date.now() + 20 * 3600 * 1000));
    sessionStorage.setItem('exitIntentVisitShown', '1'); // old once-per-session flag
    mount('/puja/abc');
    advance(6000);
    await clickThenBack();
    expect(popupShown()).toBe(true);
  });

  test('Escape while the popup is closed does not start the close pause', () => {
    mount('/puja/abc');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(localStorage.getItem('exitIntentClosedUntil')).toBeNull();
  });
});

describe('booking / payment guards', () => {
  test('Back while the payment window is open does not show it; after cancelling payment it does', async () => {
    mount('/billing');
    advance(6000);
    fireEvent.pointerDown(window); // guard armed while nothing blocks
    setExitIntentSuppressed(true); // Razorpay open
    const historyBack = jest.spyOn(window.history, 'back');
    await back();
    expect(popupShown()).toBe(false);
    expect(historyBack).toHaveBeenCalledTimes(2); // Back is allowed to proceed
  });

  test('start booking -> cancel payment -> Back shows the popup', async () => {
    mount('/billing');
    advance(6000);
    sessionStorage.setItem('pendingBookingId', 'b1');
    markPendingBooking();
    setExitIntentSuppressed(true);
    setExitIntentSuppressed(false); // ondismiss
    clearPendingBooking();
    await clickThenBack();
    expect(popupShown()).toBe(true);
  });

  test('a fresh pending booking (< 15 min) blocks it', async () => {
    mount('/billing');
    sessionStorage.setItem('pendingBookingId', 'b1');
    markPendingBooking();
    advance(6000);
    await clickThenBack();
    expect(popupShown()).toBe(false);
  });

  test('a pending booking older than 15 minutes no longer blocks it', async () => {
    sessionStorage.setItem('pendingBookingId', 'b1');
    markPendingBooking();
    advance(16 * 60 * 1000);
    mount('/billing');
    advance(6000);
    await clickThenBack();
    expect(popupShown()).toBe(true);
  });

  test('suppression resets when the route leaves billing', async () => {
    mount('/'); // visitor lands on home and clicks through to billing
    advance(6000);
    fireEvent.pointerDown(window);
    act(() => navigate('/billing'));
    setExitIntentSuppressed(true);
    act(() => navigate('/puja'));
    await back(); // /puja -> /billing
    await back(); // /billing -> / (guard entry)
    await back(); // leaving the site
    expect(popupShown()).toBe(true);
  });
});

describe('context', () => {
  test('item context is cleared on non-item pages and replaced on the next item', () => {
    mount('/puja/abc');
    act(() => setExitIntentContext({ pageType: 'puja', poojaId: 'p1', itemTitle: 'Rudrabhishek' }));
    act(() => navigate('/about'));
    expect(getExitIntentContext().itemTitle).toBeUndefined();
    act(() => setExitIntentContext({ pageType: 'puja', poojaId: 'p1', itemTitle: 'Rudrabhishek' }));
    act(() => navigate('/chadhava'));
    expect(getExitIntentContext()).toEqual({ pageType: 'chadhava-list' });
    act(() => navigate('/chadhava/c1'));
    expect(getExitIntentContext().itemTitle).toBeUndefined();
  });
});

test('listeners are attached once and removed on unmount; no mouseout/scroll/visibility listeners', async () => {
  const addDoc = jest.spyOn(document, 'addEventListener');
  const addWin = jest.spyOn(window, 'addEventListener');
  const remove = jest.spyOn(window, 'removeEventListener');
  const { unmount } = mount('/puja');
  act(() => navigate('/puja/abc'));
  act(() => navigate('/about'));
  act(() => navigate('/chadhava'));
  await flush();
  expect(addWin.mock.calls.filter(([type, fn]) => type === 'popstate' && fn.name === 'onPopState')).toHaveLength(1); // the router adds its own popstate listener
  expect(addDoc.mock.calls.filter(([type]) => ['mouseout', 'visibilitychange'].includes(type))).toHaveLength(0);
  expect(addWin.mock.calls.filter(([type]) => type === 'scroll')).toHaveLength(0);
  unmount();
  expect(remove.mock.calls.filter(([type, fn]) => type === 'popstate' && fn.name === 'onPopState')).toHaveLength(1);
});
