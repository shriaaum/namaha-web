import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axiosInstance from "../../lib/instance";
import { payCartOrder, reconcileCartOrder, apiMessage } from "../../lib/cartPayment";
import { getRazorpayPublicKey } from "../../lib/razorpayConfig";
import { useCart } from "../../lib/cart";
import "./CartPage.css";

// Lets a customer who paid but closed the tab land on their confirmation next time.
const PENDING_ORDER_KEY = "shriaaum.cartPendingOrder";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const readSavedUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null") || {};
  } catch {
    return {};
  }
};

const readPending = () => {
  try {
    return JSON.parse(sessionStorage.getItem(PENDING_ORDER_KEY) || "null");
  } catch {
    return null;
  }
};

/** Only what the server needs to price a line; display fields stay local. */
const toRequestLine = (line, participants) => ({
  type: line.type,
  itemId: line.itemId,
  packageId: line.packageId,
  addons: line.addons || [],
  couponCode: line.couponCode || "",
  ...(participants ? { participants } : {}),
});

function CartPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, remove, update, clear } = useCart();

  const saved = useMemo(readSavedUser, []);
  const [form, setForm] = useState({
    name: saved.name || "",
    phone: String(saved.mobile || saved.phone || "").replace(/\D/g, "").slice(-10),
    email: saved.email || "",
  });
  const [people, setPeople] = useState({}); // { [lineKey]: { names: string[], gotra: string } }
  const [couponDraft, setCouponDraft] = useState({});
  const [quote, setQuote] = useState(null); // { lines, total, allValid }
  const [quoting, setQuoting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null); // confirmed order summary
  const payingRef = useRef(false);

  /* ---------------- pricing: always from the server ---------------- */
  const requestSignature = JSON.stringify(items.map((l) => toRequestLine(l)));
  useEffect(() => {
    if (!items.length) {
      setQuote(null);
      return undefined;
    }
    let cancelled = false;
    setQuoting(true);
    axiosInstance
      .post("/cart/quote", { items: JSON.parse(requestSignature) })
      .then((res) => !cancelled && setQuote(res.data))
      .catch(() => !cancelled && setError(t("cart.quoteFailed", "Could not refresh prices. Please try again.")))
      .finally(() => !cancelled && setQuoting(false));
    return () => {
      cancelled = true;
    };
    // `items` is represented by requestSignature; t is stable enough for an error string.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestSignature]);

  const lines = useMemo(
    () => items.map((item, index) => ({ item, q: quote?.lines?.[index] || null })),
    [items, quote]
  );

  const personsFor = (q) => (q?.type === "puja" ? Math.max(1, Number(q.persons) || 1) : 1);

  const setName = (key, index, count, value) =>
    setPeople((prev) => {
      const cur = prev[key] || { names: [], gotra: "" };
      const names = Array.from({ length: count }, (_, i) => cur.names[i] || "");
      names[index] = value;
      return { ...prev, [key]: { ...cur, names } };
    });
  const setGotra = (key, value) =>
    setPeople((prev) => ({ ...prev, [key]: { names: prev[key]?.names || [], gotra: value } }));

  /* ---------------- confirmation helpers ---------------- */
  const finish = useCallback(
    (summary) => {
      try {
        sessionStorage.removeItem(PENDING_ORDER_KEY);
      } catch {
        /* ignore */
      }
      clear();
      setDone(summary);
      window.scrollTo({ top: 0 });
    },
    [clear]
  );

  // Recovery: the customer paid, but the browser closed before the success screen.
  useEffect(() => {
    const pending = readPending();
    if (!pending?.cartOrderId) return;
    reconcileCartOrder(pending, 1)
      .then((summary) => summary?.status === "paid" && finish(summary))
      .catch(() => {});
  }, [finish]);

  /* ---------------- checkout ---------------- */
  const validate = () => {
    if (form.name.trim().length < 2) return t("cart.errName", "Please enter your name.");
    if (!/^[6-9]\d{9}$/.test(form.phone)) return t("cart.errPhone", "Please enter a valid 10-digit mobile number.");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return t("cart.errEmail", "Please enter a valid email.");
    for (const { item, q } of lines) {
      const count = personsFor(q);
      const names = people[item.key]?.names || [];
      if (Array.from({ length: count }, (_, i) => (names[i] || "").trim()).some((n) => !n)) {
        return t("cart.errParticipants", "Please enter participant names for {{title}}.", { title: q?.title || item.title });
      }
    }
    return "";
  };

  const handlePay = async () => {
    if (payingRef.current) return;
    setError("");
    if (!quote?.allValid) return setError(t("cart.errFixItems", "Please remove the unavailable items first."));
    const problem = validate();
    if (problem) return setError(problem);
    // Fail before any booking is created if this build has no Razorpay key.
    if (!getRazorpayPublicKey()) return setError(t("billing.errRazorpayKey", "Payments are temporarily unavailable."));

    payingRef.current = true;
    setPaying(true);
    try {
      const body = {
        devotee: { name: form.name.trim(), phone: form.phone, email: form.email.trim() },
        items: lines.map(({ item, q }) => {
          const count = personsFor(q);
          const entry = people[item.key] || { names: [], gotra: "" };
          return toRequestLine(
            item,
            Array.from({ length: count }, (_, i) => ({ name: (entry.names[i] || "").trim(), gotra: (entry.gotra || "").trim() }))
          );
        }),
      };
      const res = await axiosInstance.post("/cart/checkout", body);
      const order = res.data;
      try {
        sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify({ cartOrderId: order.cartOrderId, accessToken: order.accessToken }));
      } catch {
        /* ignore */
      }
      const release = () => {
        payingRef.current = false;
        setPaying(false);
      };
      await payCartOrder({
        order,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        description: t("cart.paymentDesc", "{{count}} items", { count: order.items.length }),
        messages: {
          noKey: t("billing.errRazorpayKey", "Payments are temporarily unavailable."),
          failed: t("billing.paymentFailed", "Payment failed. Please try again."),
          syncing: t("cart.errSyncing", "Your payment is being confirmed. Check My Bookings shortly."),
        },
        onPaid: finish,
        onError: setError,
        onSettled: release,
      });
    } catch (err) {
      setError(apiMessage(err, t("cart.errCheckout", "Unable to start payment. Please try again.")));
      payingRef.current = false;
      setPaying(false);
    }
  };

  /* ---------------- render ---------------- */
  if (done) {
    return (
      <main className="cart-page">
        <div className="cart-wrap cart-done">
          <div className="cart-done-icon" aria-hidden="true">✓</div>
          <h1>{t("cart.thankYou", "Payment successful")}</h1>
          <p className="cart-muted">
            {t("cart.doneSub", "Your bookings are confirmed. Invoices are sent to your WhatsApp.")}
          </p>
          <ul className="cart-done-list">
            {done.items.map((i) => (
              <li key={String(i.bookingId)}>
                <span>
                  <span className="cart-tag">{i.type === "chadhava" ? t("nav.chadhava", "Chadhava") : t("nav.puja", "Puja")}</span>{" "}
                  {i.title}
                </span>
                <strong>{inr(i.amount)}</strong>
              </li>
            ))}
          </ul>
          <div className="cart-total-row">
            <span>{t("cart.totalPaid", "Total paid")}</span>
            <strong>{inr(done.amount)}</strong>
          </div>
          {done.razorpayPaymentId && <p className="cart-muted">{t("cart.paymentId", "Payment ID")}: {done.razorpayPaymentId}</p>}
          <button type="button" className="cart-pay-btn" onClick={() => navigate("/my-bookings")}>
            {t("cart.viewBookings", "View my bookings")}
          </button>
        </div>
      </main>
    );
  }

  if (!items.length) {
    return (
      <main className="cart-page">
        <div className="cart-wrap cart-empty">
          <h1>{t("cart.title", "Your cart")}</h1>
          <p className="cart-muted">{t("cart.empty", "Your cart is empty. Add a puja or chadhava to pay for them together.")}</p>
          <div className="cart-empty-actions">
            <Link to="/puja" className="cart-pay-btn cart-link-btn">{t("nav.puja", "Puja")}</Link>
            <Link to="/chadhava" className="cart-pay-btn cart-link-btn cart-link-btn--alt">{t("nav.chadhava", "Chadhava")}</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <div className="cart-wrap">
        <h1>{t("cart.title", "Your cart")}</h1>

        <section className="cart-lines">
          {lines.map(({ item, q }) => {
            const count = personsFor(q);
            const entry = people[item.key] || { names: [], gotra: "" };
            const invalid = q && q.ok === false;
            return (
              <article key={item.key} className={`cart-line${invalid ? " cart-line--bad" : ""}`}>
                <div className="cart-line-head">
                  {(q?.image || item.image) && <img src={q?.image || item.image} alt="" className="cart-line-img" />}
                  <div className="cart-line-main">
                    <span className="cart-tag">{item.type === "chadhava" ? t("nav.chadhava", "Chadhava") : t("nav.puja", "Puja")}</span>
                    <h2>{q?.title || item.title}</h2>
                    {q?.packageName && <p className="cart-muted">{q.packageName}</p>}
                    {(q?.addons || []).map((a) => (
                      <p key={a.id} className="cart-muted cart-addon">
                        {a.name} × {a.quantity} <span>{inr(a.total)}</span>
                      </p>
                    ))}
                    {q?.discount > 0 && (
                      <p className="cart-discount">
                        {t("cart.coupon", "Coupon")} {q.couponCode}: −{inr(q.discount)}
                      </p>
                    )}
                    {invalid && <p className="cart-error">{q.error}</p>}
                  </div>
                  <div className="cart-line-side">
                    <strong>{q?.ok ? inr(q.amount) : quoting ? "…" : "—"}</strong>
                    <button type="button" className="cart-remove" onClick={() => remove(item.key)}>
                      {t("cart.remove", "Remove")}
                    </button>
                  </div>
                </div>

                {q?.ok && (
                  <div className="cart-people">
                    <p className="cart-people-title">
                      {count > 1
                        ? t("cart.participants", "Participant names ({{count}})", { count })
                        : t("cart.participant", "Participant name")}
                    </p>
                    <div className="cart-people-grid">
                      {Array.from({ length: count }, (_, i) => (
                        <input
                          key={i}
                          type="text"
                          maxLength={50}
                          placeholder={count > 1 ? `${t("cart.name", "Name")} ${i + 1}` : t("cart.name", "Name")}
                          value={entry.names[i] || ""}
                          onChange={(e) => setName(item.key, i, count, e.target.value)}
                        />
                      ))}
                      <input
                        type="text"
                        maxLength={50}
                        placeholder={t("cart.gotra", "Gotra (optional)")}
                        value={entry.gotra}
                        onChange={(e) => setGotra(item.key, e.target.value)}
                      />
                    </div>
                    {item.type === "puja" && (
                      <div className="cart-coupon">
                        <input
                          type="text"
                          placeholder={t("cart.couponPlaceholder", "Coupon code")}
                          value={couponDraft[item.key] ?? item.couponCode ?? ""}
                          onChange={(e) => setCouponDraft((p) => ({ ...p, [item.key]: e.target.value.toUpperCase() }))}
                        />
                        <button
                          type="button"
                          onClick={() => update(item.key, { couponCode: (couponDraft[item.key] ?? "").trim() })}
                        >
                          {t("cart.apply", "Apply")}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>

        <section className="cart-devotee">
          <h2>{t("cart.yourDetails", "Your details")}</h2>
          <div className="cart-people-grid">
            <input type="text" maxLength={50} placeholder={t("cart.fullName", "Full name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder={t("cart.phone", "WhatsApp number")}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
            />
            <input type="email" maxLength={100} placeholder={t("cart.emailOptional", "Email (optional)")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        </section>

        <div className="cart-summary">
          <div className="cart-total-row">
            <span>{t("cart.total", "Total")} ({items.length})</span>
            <strong>{quote?.allValid || quote?.total ? inr(quote.total) : "—"}</strong>
          </div>
          {error && <p className="cart-error" role="alert">{error}</p>}
          <button type="button" className="cart-pay-btn" disabled={paying || quoting || !quote?.allValid} onClick={handlePay}>
            {paying ? t("cart.processing", "Processing…") : `${t("cart.payNow", "Pay")} ${quote?.allValid ? inr(quote.total) : ""}`}
          </button>
          <p className="cart-muted cart-secure">{t("cart.secure", "One secure payment for all items.")}</p>
        </div>
      </div>
    </main>
  );
}

export default CartPage;
