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

describe('desktop triggers', () => {
  test('puja list -> leave through the top shows the popup (labelled puja-list)', () => {
    mount('/puja');
    advance(6000);
    leaveTop();
    expect(popupShown()).toBe(true);
    expect(getExitIntentContext().pageType).toBe('puja-list');
  });

  test('listing, home, language roots and "chadava" spelling are eligible; others are not', () => {
    for (const path of ['/chadhava', '/chadava/abc', '/', '/hi', '/te', '/tu']) {
      sessionStorage.clear();
      const { unmount } = mount(path);
      advance(6000);
      leaveTop();
      expect([path, popupShown()]).toEqual([path, true]);
      unmount();
    }
    sessionStorage.clear();
    mount('/about');
    advance(6000);
    leaveTop();
    expect(popupShown()).toBe(false);
  });

  test('puja detail -> leave within 5s is blocked by dwell, and debug mode says why', () => {
    localStorage.setItem('exitIntentDebug', '1');
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mount('/puja/abc');
    advance(3000);
    leaveTop();
    expect(popupShown()).toBe(false);
    expect(log).toHaveBeenCalledWith('[exit-intent]', 'not shown (mouse-left-top):', expect.stringMatching(/^dwell 3s < 5s/));
  });

  test('dwell is measured from the first eligible page view, not reset by navigation', () => {
    mount('/puja');
    advance(4000);
    act(() => navigate('/puja/abc'));
    advance(1500);
    leaveTop();
    expect(popupShown()).toBe(true);
  });

  test('mouseout with a relatedTarget (still inside the page) does not trigger', () => {
    mount('/puja/abc');
    advance(6000);
    fireEvent.mouseOut(document, { clientY: -1, relatedTarget: document.body });
    expect(popupShown()).toBe(false);
  });

  test('leaving through the left/right edge near the top triggers; low on the side does not', () => {
    mount('/puja/abc');
    advance(6000);
    fireEvent.mouseOut(document, { clientY: 400, clientX: 0, relatedTarget: null });
    expect(popupShown()).toBe(false);
    fireEvent.mouseOut(document, { clientY: 60, clientX: window.innerWidth, relatedTarget: null });
    expect(popupShown()).toBe(true);
  });

  test('no auto-open on a timer', async () => {
    jest.useFakeTimers();
    try {
      mount('/puja/abc');
      advance(120000);
      act(() => { jest.advanceTimersByTime(120000); });
      expect(popupShown()).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  test('tab hidden does not show immediately; shows when the user returns', () => {
    mount('/puja/abc');
    advance(6000);
    const setVisibility = (v) => Object.defineProperty(document, 'visibilityState', { value: v, configurable: true });
    setVisibility('hidden');
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(popupShown()).toBe(false);
    setVisibility('visible');
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(popupShown()).toBe(true);
  });

  test('close -> 24h cooldown across sessions; a new session shows again only after it', () => {
    const view = mount('/puja/abc');
    advance(6000);
    leaveTop();
    fireEvent.click(screen.getByText('×'));
    expect(popupShown()).toBe(false);
    view.unmount();

    sessionStorage.clear(); // new tab/session
    mount('/puja/abc');
    advance(6000);
    leaveTop();
    expect(popupShown()).toBe(false);

    advance(24 * 3600 * 1000);
    leaveTop();
    expect(popupShown()).toBe(true);
  });

  test('once per session (sessionStorage), again in a new session; legacy localStorage key is ignored', () => {
    localStorage.setItem('exitIntentVisitShown', '1');
    const view = mount('/puja/abc');
    advance(6000);
    leaveTop();
    expect(popupShown()).toBe(true);
    expect(localStorage.getItem('exitIntentVisitShown')).toBeNull();
    expect(sessionStorage.getItem('exitIntentVisitShown')).toBe('1');
    view.unmount();

    mount('/puja/abc'); // same session
    advance(6000);
    leaveTop();
    expect(popupShown()).toBe(false);
  });

  test('Escape while the popup is closed does not start the 24h cooldown', () => {
    mount('/puja/abc');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(localStorage.getItem('exitIntentClosedUntil')).toBeNull();
  });
});

describe('booking / payment guards', () => {
  test('start booking -> cancel payment -> leave shows the popup', () => {
    mount('/billing');
    advance(6000);
    sessionStorage.setItem('pendingBookingId', 'b1');
    markPendingBooking();
    setExitIntentSuppressed(true); // Razorpay open
    leaveTop();
    expect(popupShown()).toBe(false);

    setExitIntentSuppressed(false); // ondismiss
    clearPendingBooking();
    leaveTop();
    expect(popupShown()).toBe(true);
  });

  test('a pending booking id only blocks for 15 minutes', () => {
    mount('/billing');
    sessionStorage.setItem('pendingBookingId', 'b1');
    markPendingBooking();
    advance(6000);
    leaveTop();
    expect(popupShown()).toBe(false);
    advance(15 * 60 * 1000);
    leaveTop();
    expect(popupShown()).toBe(true);
  });

  test('suppression resets when the route leaves billing', () => {
    mount('/billing');
    advance(6000);
    setExitIntentSuppressed(true);
    act(() => navigate('/puja'));
    leaveTop();
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

describe('desktop Back on the home page', () => {
  test('home as first page -> browser Back shows the popup instead of leaving', async () => {
    mount('/');
    advance(6000);
    fireEvent.pointerDown(window); // guard needs a user gesture
    expect(window.history.state.exitGuard).toBe(true);
    await back();
    expect(popupShown()).toBe(true);
    expect(window.location.pathname).toBe('/');
    expect(getExitIntentContext().pageType).toBe('home');
  });

  test('language home URLs (/en, /hi, /tu, /te) are guarded too', () => {
    ['/en', '/hi', '/tu', '/te'].forEach((path) => {
      sessionStorage.clear();
      const { unmount } = mount(path);
      advance(6000);
      fireEvent.pointerDown(window);
      expect(window.history.state.exitGuard).toBe(true);
      unmount();
    });
  });

  test('desktop Back guard is not added on non-home pages (unchanged behaviour)', () => {
    ['/puja', '/puja/abc', '/chadhava/c1', '/billing'].forEach((path) => {
      const { unmount } = mount(path);
      advance(6000);
      fireEvent.pointerDown(window);
      expect(window.history.state?.exitGuard).toBeUndefined();
      unmount();
    });
  });

  test('desktop home Back within 5s lets the Back proceed instead of trapping', async () => {
    mount('/');
    fireEvent.pointerDown(window);
    const historyBack = jest.spyOn(window.history, 'back');
    await back();
    expect(popupShown()).toBe(false);
    expect(historyBack).toHaveBeenCalledTimes(2); // ours + the re-issued one
  });
});

describe('mobile triggers', () => {
  beforeEach(() => setUA(MOBILE_UA));

  test('chadhava detail as first page -> Back shows the popup; next Back is not trapped', async () => {
    mount('/chadhava/c1');
    advance(6000);
    fireEvent.pointerDown(window); // guard needs a user gesture
    expect(window.history.state.exitGuard).toBe(true);
    await back();
    expect(popupShown()).toBe(true);
    expect(window.location.pathname).toBe('/chadhava/c1');

    fireEvent.click(screen.getByText('×'));
    fireEvent.pointerDown(window);
    expect(window.history.state?.exitGuard).toBeUndefined(); // no second guard on the same page
  });

  test('Back on the first page within 5s lets the Back proceed instead of trapping', async () => {
    mount('/chadhava/c1');
    fireEvent.pointerDown(window);
    const historyBack = jest.spyOn(window.history, 'back');
    await back();
    expect(popupShown()).toBe(false);
    expect(historyBack).toHaveBeenCalledTimes(2); // ours + the re-issued one
  });

  test('in-app Back between two eligible pages does not trigger', async () => {
    mount('/puja');
    advance(6000);
    fireEvent.pointerDown(window);
    act(() => navigate('/puja/abc'));
    await back(); // /puja/abc -> /puja (guard entry)
    expect(window.location.pathname).toBe('/puja');
    expect(popupShown()).toBe(false);
    await back(); // now leaving the site
    expect(popupShown()).toBe(true);
  });

  test('fast upward scroll near the top triggers', () => {
    mount('/puja/abc');
    advance(6000);
    let t = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => t);
    const scrollTo = (y, at) => { t = at; Object.defineProperty(window, 'scrollY', { value: y, configurable: true }); fireEvent.scroll(window); };
    scrollTo(0, 0);
    scrollTo(1200, 1000); // read down the page
    scrollTo(900, 2000); // slow scroll up
    expect(popupShown()).toBe(false);
    scrollTo(200, 2400); // 700px in 400ms... too slow
    expect(popupShown()).toBe(false);
    scrollTo(1200, 3000);
    scrollTo(100, 3100); // 1100px in 100ms, ends near the top
    expect(popupShown()).toBe(true);
  });
});

test('listeners are attached once and removed on unmount', async () => {
  const add = jest.spyOn(document, 'addEventListener');
  const remove = jest.spyOn(document, 'removeEventListener');
  const { unmount } = mount('/puja');
  act(() => navigate('/puja/abc'));
  act(() => navigate('/about'));
  act(() => navigate('/chadhava'));
  await flush();
  expect(add.mock.calls.filter(([type]) => type === 'mouseout')).toHaveLength(1);
  unmount();
  expect(remove.mock.calls.filter(([type]) => type === 'mouseout')).toHaveLength(1);
});
