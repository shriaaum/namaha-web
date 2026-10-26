import axiosInstance from "./instance";
import { loadScript } from "./loadScript";
import { getRazorpayPublicKey } from "./razorpayConfig";

const RAZORPAY_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const apiMessage = (err, fallback) => err?.response?.data?.message || fallback;

/** Asks the server whether Razorpay captured the money; retries while the capture is not visible yet (409). */
export async function reconcileCartOrder({ cartOrderId, accessToken }, attempts = 3) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await axiosInstance.post("/cart/reconcile", { cartOrderId, accessToken });
      return res.data;
    } catch (err) {
      if (err?.response?.status !== 409 || attempt === attempts - 1) throw err;
      await wait(5000);
    }
  }
  return null;
}

/**
 * Opens Razorpay Checkout for a cart order returned by /cart/checkout or /cart/retry and finalises it.
 * Never reports a failure for money that was actually taken: if /cart/confirm fails it verifies via reconcile.
 *
 * @param {object} order      { cartOrderId, accessToken, razorpayOrderId, amountPaise, items }
 * @param {object} callbacks  onPaid(summary), onError(message), onSettled() - always called last
 */
export async function payCartOrder({ order, prefill = {}, description, messages, onPaid, onError, onSettled }) {
  const settle = () => onSettled && onSettled();
  const syncing = messages?.syncing || "Your payment is being confirmed. Check My Bookings shortly.";

  const razorpayKey = getRazorpayPublicKey();
  if (!razorpayKey) {
    onError(messages?.noKey || "Payments are temporarily unavailable.");
    return settle();
  }
  try {
    await loadScript(RAZORPAY_SRC);
  } catch {
    onError(messages?.checkoutFailed || "Unable to start payment. Please try again.");
    return settle();
  }

  const rzp = new window.Razorpay({
    key: razorpayKey,
    amount: order.amountPaise,
    currency: "INR",
    order_id: order.razorpayOrderId,
    name: "Shri Aaum",
    description: description || `${order.items?.length || 1}`,
    prefill,
    theme: { color: "#f96b26" },
    handler: async (response) => {
      if (!response?.razorpay_payment_id || !response?.razorpay_signature) return settle();
      try {
        const res = await axiosInstance.post("/cart/confirm", {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
        onPaid(res.data);
      } catch {
        try {
          const summary = await reconcileCartOrder(order);
          if (summary?.status === "paid") onPaid(summary);
          else onError(syncing);
        } catch (reconcileErr) {
          onError(apiMessage(reconcileErr, syncing));
        }
      } finally {
        settle();
      }
    },
    modal: { ondismiss: settle },
  });
  rzp.on("payment.failed", (r) => {
    onError(r?.error?.description || messages?.failed || "Payment failed. Please try again.");
    settle();
  });
  rzp.open();
}
