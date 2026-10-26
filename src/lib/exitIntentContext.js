// Shared state between the exit-intent popup and the pages that feed it.
const session = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} },
  remove: (k) => { try { sessionStorage.removeItem(k); } catch {} },
};

// A pending (autosaved, unpaid) booking only blocks the popup for this long.
export const PENDING_BOOKING_TTL_MS = 15 * 60 * 1000;
const PENDING_BOOKING_AT = "pendingBookingAt";
const BOOKED_THIS_SESSION = "exitIntentBooked";

let context = {};
let suppressed = false;

export const setExitIntentContext = (next) => { context = { ...context, ...next }; };
export const getExitIntentContext = () => context;
/** Forget the last item ("You were looking at: ...") when leaving item pages. */
export const resetExitIntentContext = (next = {}) => { context = { ...next }; };

/** True while a payment is in progress (Razorpay open); reset on dismiss or leaving billing. */
export const setExitIntentSuppressed = (value) => { suppressed = Boolean(value); };
export const isExitIntentSuppressed = () => suppressed;

/** A paid booking converts the visitor for the rest of the tab session. */
export const markBookingCompleted = () => {
  suppressed = false;
  session.set(BOOKED_THIS_SESSION, "1");
  session.remove(PENDING_BOOKING_AT);
};
export const isBookingCompleted = () => session.get(BOOKED_THIS_SESSION) === "1";

// BillingPage keeps sessionStorage "pendingBookingId" to reuse the same pending booking
// on retry, so it is not deleted here; the popup only honours it while it is fresh.
export const markPendingBooking = () => session.set(PENDING_BOOKING_AT, String(Date.now()));
export const clearPendingBooking = () => session.remove(PENDING_BOOKING_AT);
export const hasActivePendingBooking = () => {
  if (!session.get("pendingBookingId")) return false;
  const at = Number(session.get(PENDING_BOOKING_AT));
  return at > 0 && Date.now() - at < PENDING_BOOKING_TTL_MS;
};
