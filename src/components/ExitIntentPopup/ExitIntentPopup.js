import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axiosInstance from "../../lib/instance";
import {
  getExitIntentContext,
  hasActivePendingBooking,
  isBookingCompleted,
  isExitIntentSuppressed,
  resetExitIntentContext,
  setExitIntentSuppressed,
} from "../../lib/exitIntentContext";
import "./ExitIntentPopup.css";

/** Pages where the popup may open. pageType labels non-item pages for the lead (item pages set their own context). */
export const EXIT_INTENT_ROUTES = [
  { pattern: /^\/(puja|chadhava|chadava)\/[^/]+\/?$/, item: true },
  { pattern: /^\/billing\/?$/, item: true },
  { pattern: /^\/puja\/?$/, pageType: "puja-list" },
  { pattern: /^\/(chadhava|chadava)\/?$/, pageType: "chadhava-list" },
  { pattern: /^\/(en|hi|te|tu)?\/?$/, pageType: "home" },
];
const matchRoute = (pathname) => EXIT_INTENT_ROUTES.find((r) => r.pattern.test(pathname)) || null;

const MIN_DWELL_MS = 5000;
const CLOSED_COOLDOWN_MS = 864e5; // 24h, only after an explicit close
const SUBMITTED_COOLDOWN_MS = 30 * 864e5;
const SIDE_EXIT_TOP_PX = 120; // leaving through the left/right edge this close to the top counts as exit
const FAST_SCROLL_UP_PX_PER_MS = 1.2;
const FAST_SCROLL_NEAR_TOP_PX = 300;
const FAST_SCROLL_MIN_DEPTH_PX = 800;

const storage = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k,v) => { try { localStorage.setItem(k,v); } catch {} } };
const session = { get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k,v) => { try { sessionStorage.setItem(k,v); } catch {} } };
const debug = (...args) => { if (storage.get("exitIntentDebug") === "1") console.log("[exit-intent]", ...args); };
const isMobile = () => /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || Boolean(window.matchMedia?.("(pointer: coarse)").matches);
// Router entries pushed by this component (one guard per page, per tab session).
const guardedKeys = new Set();

export default function ExitIntentPopup() {
 const {t,i18n}=useTranslation(), {pathname}=useLocation(); const [open,setOpen]=useState(false),[name,setName]=useState(""),[phone,setPhone]=useState(""),[loading,setLoading]=useState(false),[success,setSuccess]=useState(false),[error,setError]=useState("");
 const eligibleRef = useRef(false), openRef = useRef(false), onGuardRef = useRef(false), guardKeyRef = useRef(null), showAfterReturnRef = useRef(false), prevPathRef = useRef(null);
 eligibleRef.current = Boolean(matchRoute(pathname));
 openRef.current = open;

 /** Why the popup must not open now, or null. Reads refs/storage only, so listeners never go stale. */
 const blockedReason = useCallback(({ ignoreDwell = false } = {}) => {
  if (!eligibleRef.current) return `route not eligible (${window.location.pathname})`;
  if (openRef.current) return "already open";
  if (isBookingCompleted()) return "booking completed in this session";
  if (isExitIntentSuppressed()) return "suppressed: payment in progress";
  if (hasActivePendingBooking()) return "pending booking saved < 15 min ago";
  if (session.get("exitIntentVisitShown")) return "already shown in this session";
  if (Number(storage.get("exitIntentSubmittedUntil")) > Date.now()) return "submitted cooldown active";
  if (Number(storage.get("exitIntentClosedUntil")) > Date.now()) return "closed cooldown active (24h)";
  const dwell = Date.now() - Number(session.get("exitIntentSessionStart") || Date.now());
  if (!ignoreDwell && dwell < MIN_DWELL_MS) return `dwell ${Math.round(dwell / 100) / 10}s < ${MIN_DWELL_MS / 1000}s`;
  return null;
 }, []);

 const close=useCallback(()=>{storage.set("exitIntentClosedUntil",String(Date.now()+CLOSED_COOLDOWN_MS));setOpen(false)},[]);
 const show=useCallback((trigger)=>{const reason=blockedReason();if(reason){debug(`not shown (${trigger}):`,reason);return false}debug(`shown (${trigger})`);openRef.current=true;session.set("exitIntentVisitShown","1");let u={};try{u=JSON.parse(storage.get("user")||"{}")}catch{}setName(u.name||u.fullName||"");setPhone(String(u.phone||u.mobile||"").replace(/^\+?91/,""));setOpen(true);return true},[blockedReason]);

 /** Back guard: only on the tab's first app entry (Back would leave the site) and after a user gesture (Chrome skips entries pushed without one).
  *  Mobile: every eligible page. Desktop: the home page only, so the browser Back button there shows the popup before leaving the site. */
 const armBackGuard = useCallback(() => {
  if (!eligibleRef.current) return;
  if (!isMobile() && matchRoute(window.location.pathname)?.pageType !== "home") return;
  const state = window.history.state || {};
  if (state.exitGuard) { onGuardRef.current = true; guardKeyRef.current = state.key ?? null; return; }
  if ((state.idx ?? 0) !== 0) return; // an in-app entry is behind this one: Back stays on the site
  const key = state.key ?? "default";
  if (guardedKeys.has(key)) return;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  const reason = blockedReason({ ignoreDwell: true });
  if (reason) { debug("back guard not armed:", reason); return; }
  window.history.pushState({ ...state, exitGuard: true }, "", window.location.href);
  guardedKeys.add(key);
  onGuardRef.current = true;
  guardKeyRef.current = state.key ?? null;
  debug("back guard armed for", window.location.pathname);
 }, [blockedReason]);

 // Route change: start the dwell clock, keep context/suppression accurate, re-check the guard.
 useEffect(() => {
  const route = matchRoute(pathname);
  if (route && !session.get("exitIntentSessionStart")) session.set("exitIntentSessionStart", String(Date.now()));
  // Item pages (and billing) set their own context once loaded; every other page must not show a stale item.
  // This runs before the page's own effects (the popup renders before <Routes>).
  if (route && !route.item) resetExitIntentContext({ pageType: route.pageType });
  else if (prevPathRef.current !== null && prevPathRef.current !== pathname) resetExitIntentContext();
  if (!/^\/billing\/?$/.test(pathname)) setExitIntentSuppressed(false);
  prevPathRef.current = pathname;
  onGuardRef.current = Boolean(window.history.state?.exitGuard);
  if (navigator.userActivation?.hasBeenActive) armBackGuard();
 }, [pathname, armBackGuard]);

 // All triggers attach once; they read refs, so route changes never leave stale closures.
 useEffect(() => {
  try { localStorage.removeItem("exitIntentVisitShown"); } catch {} // legacy: was once-per-browser-forever
  const onMouseOut = (e) => {
   if (e.relatedTarget || e.toElement) return; // still inside the window
   const leftTop = e.clientY <= 0;
   const leftSideNearTop = e.clientY < SIDE_EXIT_TOP_PX && (e.clientX <= 0 || e.clientX >= window.innerWidth - 1);
   if (leftTop || leftSideNearTop) show(leftTop ? "mouse-left-top" : "mouse-left-side");
  };
  const onKeyDown = (e) => { if (e.key === "Escape" && openRef.current) close(); };
  const onVisibility = () => {
   if (document.visibilityState === "hidden") {
    const reason = blockedReason();
    showAfterReturnRef.current = !reason;
    debug(reason ? `tab hidden, will not show on return: ${reason}` : "tab hidden, will show on return");
   } else if (showAfterReturnRef.current) {
    showAfterReturnRef.current = false;
    show("returned-to-tab");
   }
  };
  const onPopState = (e) => {
   const state = e.state || {};
   const poppedGuard = onGuardRef.current && !state.exitGuard && (state.key ?? null) === guardKeyRef.current;
   onGuardRef.current = Boolean(state.exitGuard);
   if (!poppedGuard) return;
   // Back on the first page: show instead of leaving; if blocked, finish the Back the user asked for.
   if (!show("mobile-back")) window.history.back();
  };
  let lastY = window.scrollY, lastT = performance.now(), maxY = lastY;
  const onScroll = () => {
   if (!isMobile()) return;
   const y = window.scrollY, now = performance.now(), dt = now - lastT;
   maxY = Math.max(maxY, y);
   if (dt > 0 && dt < 250 && (lastY - y) / dt >= FAST_SCROLL_UP_PX_PER_MS && y <= FAST_SCROLL_NEAR_TOP_PX && maxY >= FAST_SCROLL_MIN_DEPTH_PX) {
    maxY = y; // one attempt per scroll-down
    show("mobile-fast-scroll-up");
   }
   lastY = y; lastT = now;
  };
  const onGesture = () => armBackGuard();
  document.addEventListener("mouseout", onMouseOut);
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("popstate", onPopState);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pointerdown", onGesture, { capture: true, passive: true });
  window.addEventListener("keydown", onGesture, { capture: true, passive: true });
  return () => {
   document.removeEventListener("mouseout", onMouseOut);
   document.removeEventListener("keydown", onKeyDown);
   document.removeEventListener("visibilitychange", onVisibility);
   window.removeEventListener("popstate", onPopState);
   window.removeEventListener("scroll", onScroll);
   window.removeEventListener("pointerdown", onGesture, { capture: true });
   window.removeEventListener("keydown", onGesture, { capture: true });
  };
 }, [show, close, blockedReason, armBackGuard]);

 const submit=async e=>{e.preventDefault();const p=phone.replace(/\D/g,"").replace(/^91(?=\d{10}$)/,"");if(name.trim().length<2||!/^[6-9]\d{9}$/.test(p))return setError(t("exitPopup.validation"));setLoading(true);try{const c=getExitIntentContext();await axiosInstance.post("/leads/exit-intent",{name:name.trim(),phone:p,pageUrl:window.location.href,pageType:c.pageType||"billing",poojaId:c.poojaId,chadhavaId:c.chadhavaId,itemTitle:c.itemTitle,amount:c.amount,language:i18n.language,device:navigator.userAgent});storage.set("exitIntentSubmittedUntil",String(Date.now()+SUBMITTED_COOLDOWN_MS));setSuccess(true);setTimeout(()=>setOpen(false),3000)}catch{setError(t("exitPopup.error"))}finally{setLoading(false)}};
 if(!open)return null;const item=getExitIntentContext().itemTitle;return <div className="exit-overlay" onMouseDown={e=>e.target===e.currentTarget&&close()}><form className="exit-popup" onSubmit={submit}><button type="button" className="exit-close" onClick={close}>×</button>{success?<p className="exit-success">{t("exitPopup.success")}</p>:<><h2>{t("exitPopup.title")}</h2><p>{t("exitPopup.text")}</p>{item&&<p className="exit-item">{t("exitPopup.lookingAt",{item})}</p>}<label>{t("exitPopup.name")}<input value={name} onChange={e=>setName(e.target.value)} maxLength="50" required/></label><label>{t("exitPopup.mobile")}<div className="exit-phone"><span>+91</span><input inputMode="numeric" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))} maxLength="10" required/></div></label>{error&&<small>{error}</small>}<button className="exit-submit" disabled={loading}>{loading?t("exitPopup.loading"):t("exitPopup.submit")}</button></>}</form></div>
}
