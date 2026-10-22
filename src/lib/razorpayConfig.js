/**
 * The checkout key is intentionally public: Razorpay Checkout receives it in
 * the browser. Secrets remain API-only. Keeping validation here makes both
 * checkout flows fail before creating a pending order when a build is broken.
 */
export const RAZORPAY_PUBLIC_KEY_ENV = "REACT_APP_RAZORPAY_KEY_ID";

export function getRazorpayPublicKey(env = process.env) {
  const key = String(env?.[RAZORPAY_PUBLIC_KEY_ENV] || "").trim();
  return /^rzp_(?:live|test)_[A-Za-z0-9]+$/.test(key) ? key : null;
}
