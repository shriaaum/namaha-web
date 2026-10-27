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
const CLOSED_COOLDOWN_MS = 30 * 1000; // short pause after an explicit close, so it does not reopen instantly; then it shows on every exit attempt again
const SUBMITTED_COOLDOWN_MS = 30 * 864e5;

const storage = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k,v) => { try { localStorage.setItem(k,v); } catch {} } };
const session = { get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k,v) => { try { sessionStorage.setItem(k,v); } catch {} } };
const debug = (...args) => { if (storage.get("exitIntentDebug") === "1") console.log("[exit-intent]", ...args); };
// Router entries pushed by this component (one guard per page, per tab session).
const guardedKeys = new Set();

export default function ExitIntentPopup() {
 const {t,i18n}=useTranslation(), {pathname}=useLocation(); const [open,setOpen]=useState(false),[name,setName]=useState(""),[phone,setPhone]=useState(""),[loading,setLoading]=useState(false),[success,setSuccess]=useState(false),[error,setError]=useState("");
 const eligibleRef = useRef(false), openRef = useRef(false), onGuardRef = useRef(false), guardKeyRef = useRef(null), prevPathRef = useRef(null);
 eligibleRef.current = Boolean(matchRoute(pathname));
 openRef.current = open;

 /** Why the popup must not open now, or null. Reads refs/storage only, so listeners never go stale. */
 const blockedReason = useCallback(({ ignoreDwell = false } = {}) => {
  if (!eligibleRef.current) return `route not eligible (${window.location.pathname})`;
  if (openRef.current) return "already open";
  if (isBookingCompleted()) return "booking completed in this session";
  if (isExitIntentSuppressed()) return "suppressed: payment in progress";
  if (hasActivePendingBooking()) return "pending booking saved < 15 min ago";
  if (Number(storage.get("exitIntentSubmittedUntil")) > Date.now()) return "submitted cooldown active";
  // Values beyond the current pause come from the old 24h rule: ignore them so those visitors see the popup again.
  const closedUntil = Number(storage.get("exitIntentClosedUntil"));
  if (closedUntil > Date.now() && closedUntil <= Date.now() + CLOSED_COOLDOWN_MS) return `closed ${Math.ceil((closedUntil - Date.now()) / 1000)}s ago pause`;
  const dwell = Date.now() - Number(session.get("exitIntentSessionStart") || Date.now());
  if (!ignoreDwell && dwell < MIN_DWELL_MS) return `dwell ${Math.round(dwell / 100) / 10}s < ${MIN_DWELL_MS / 1000}s`;
  return null;
 }, []);

 const close=useCallback(()=>{storage.set("exitIntentClosedUntil",String(Date.now()+CLOSED_COOLDOWN_MS));setOpen(false)},[]);
 const show=useCallback((trigger)=>{const reason=blockedReason();if(reason){debug(`not shown (${trigger}):`,reason);return false}debug(`shown (${trigger})`);openRef.current=true;let u={};try{u=JSON.parse(storage.get("user")||"{}")}catch{}setName(u.name||u.fullName||"");setPhone(String(u.phone||u.mobile||"").replace(/^\+?91/,""));setOpen(true);return true},[blockedReason]);

 /** Back guard (the only trigger): the browser/phone Back button on the tab's first app entry, i.e. when Back would leave the site.
  *  Works on every eligible page, desktop and mobile. Needs one click/tap first (Chrome skips history entries pushed without a user gesture). */
 const armBackGuard = useCallback(() => {
  if (!eligibleRef.current) return;
  const state = window.history.state || {};
  if (state.exitGuard) { onGuardRef.current = true; guardKeyRef.current = state.key ?? null; return; }
  //if ((state.idx ?? 0) !== 0) return; // an in-app entry is behind this one: Back stays on the site
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

 // The popup opens only from the Back button (no mouse, tab-switch or scroll triggers). Listeners attach once; they read refs, so route changes never leave stale closures.
 useEffect(() => {
  try { localStorage.removeItem("exitIntentVisitShown"); sessionStorage.removeItem("exitIntentVisitShown"); } catch {} // legacy: once-per-browser / once-per-session rules were removed
  const onKeyDown = (e) => { if (e.key === "Escape" && openRef.current) close(); };
  const onPopState = (e) => {
   const state = e.state || {};
   const poppedGuard = onGuardRef.current && !state.exitGuard && (state.key ?? null) === guardKeyRef.current;
   onGuardRef.current = Boolean(state.exitGuard);
   if (!poppedGuard) return;
   // Back on the first page: show instead of leaving; if blocked, finish the Back the user asked for.
   if (!show("back-button")) window.history.back();
  };
  const onGesture = () => armBackGuard();
  document.addEventListener("keydown", onKeyDown);
  window.addEventListener("popstate", onPopState);
  window.addEventListener("pointerdown", onGesture, { capture: true, passive: true });
  window.addEventListener("keydown", onGesture, { capture: true, passive: true });
  return () => {
   document.removeEventListener("keydown", onKeyDown);
   window.removeEventListener("popstate", onPopState);
   window.removeEventListener("pointerdown", onGesture, { capture: true });
   window.removeEventListener("keydown", onGesture, { capture: true });
  };
 }, [show, close, blockedReason, armBackGuard]);

 const submit=async e=>{e.preventDefault();const p=phone.replace(/\D/g,"").replace(/^91(?=\d{10}$)/,"");if(name.trim().length<2||!/^[6-9]\d{9}$/.test(p))return setError(t("exitPopup.validation"));setLoading(true);try{const c=getExitIntentContext();await axiosInstance.post("/leads/exit-intent",{name:name.trim(),phone:p,pageUrl:window.location.href,pageType:c.pageType||"billing",poojaId:c.poojaId,chadhavaId:c.chadhavaId,itemTitle:c.itemTitle,amount:c.amount,language:i18n.language,device:navigator.userAgent});storage.set("exitIntentSubmittedUntil",String(Date.now()+SUBMITTED_COOLDOWN_MS));setSuccess(true);setTimeout(()=>setOpen(false),3000)}catch{setError(t("exitPopup.error"))}finally{setLoading(false)}};
 if(!open)return null;const item=getExitIntentContext().itemTitle;return <div className="exit-overlay" onMouseDown={e=>e.target===e.currentTarget&&close()}><form className="exit-popup" onSubmit={submit}><button type="button" className="exit-close" onClick={close}>×</button>{success?<p className="exit-success">{t("exitPopup.success")}</p>:<><h2>{t("exitPopup.title")}</h2><p>{t("exitPopup.text")}</p>{item&&<p className="exit-item">{t("exitPopup.lookingAt",{item})}</p>}<label>{t("exitPopup.name")}<input value={name} onChange={e=>setName(e.target.value)} maxLength="50" required/></label><label>{t("exitPopup.mobile")}<div className="exit-phone"><span>+91</span><input inputMode="numeric" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))} maxLength="10" required/></div></label>{error&&<small>{error}</small>}<button className="exit-submit" disabled={loading}>{loading?t("exitPopup.loading"):t("exitPopup.submit")}</button></>}</form></div>
}
