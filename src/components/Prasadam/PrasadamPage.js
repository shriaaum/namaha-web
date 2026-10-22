import React, { useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axiosInstance from "../../lib/instance";
import { loadScript } from "../../lib/loadScript";
import { getRazorpayPublicKey } from "../../lib/razorpayConfig";
import SavedAddresses from "../BillingPage/SavedAddresses";
import useSavedAddresses from "../BillingPage/useSavedAddresses";
import { usePrasadamProduct } from "./PrasadamCard";
import "./Prasadam.css";

const RAZORPAY_SRC = "https://checkout.razorpay.com/v1/checkout.js";

const initialForm = () => {
  let u = {};
  try {
    u = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    u = {};
  }
  return {
    name: u.name || u.fullName || "",
    phone: String(u.phone || u.mobile || "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""),
    email: u.email || "",
    streetAddress: "",
    city: "",
    state: "",
    pincode: "",
  };
};

/** Standalone Prasadam purchase: quantity + delivery address + Razorpay. */
export default function PrasadamPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const product = usePrasadamProduct();
  const [qty, setQty] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);

  const isLoggedIn = Boolean(localStorage.getItem("token"));
  const fillAddress = useCallback(
    (a) =>
      setForm((prev) => ({
        ...prev,
        streetAddress: a.streetAddress || "",
        city: a.city || "",
        state: a.state || "",
        pincode: a.pincode || "",
      })),
    []
  );
  const book = useSavedAddresses({ enabled: isLoggedIn, form, onFill: fillAddress });

  const onChange = (e) => {
    const { name, value } = e.target;
    if (["streetAddress", "city", "state", "pincode"].includes(name)) book.clearSelection();
    if (name === "phone") return setForm((p) => ({ ...p, phone: value.replace(/\D/g, "").slice(0, 10) }));
    if (name === "pincode") return setForm((p) => ({ ...p, pincode: value.replace(/\D/g, "").slice(0, 6) }));
    setForm((p) => ({ ...p, [name]: value }));
  };

  if (done) {
    return (
      <div className="prs-page">
        <div className="prs-box prs-done">
          <h1>🙏 {t("prasadamShop.successTitle")}</h1>
          <p>{t("prasadamShop.successText")}</p>
          <p className="prs-muted">
            {t("prasadamShop.orderRef")}: {done}
          </p>
          <Link className="prs-card-btn" to="/">
            {t("prasadamShop.backHome")}
          </Link>
        </div>
      </div>
    );
  }

  if (!product) return <div className="prs-page"><div className="prs-box">…</div></div>;
  if (!product.isActive) return <div className="prs-page"><div className="prs-box">{t("prasadamShop.unavailable")}</div></div>;

  const total = product.price * qty;

  const pay = async (e) => {
    e.preventDefault();
    setError("");
    if (form.name.trim().length < 2) return setError(t("prasadamShop.errName"));
    if (!/^[6-9]\d{9}$/.test(form.phone)) return setError(t("prasadamShop.errPhone"));
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError(t("prasadamShop.errEmail"));
    if (!form.streetAddress.trim() || !form.city.trim() || !form.state.trim() || !/^\d{6}$/.test(form.pincode)) {
      return setError(t("prasadamShop.errAddress"));
    }
    // Validate build-time checkout configuration before creating an order.
    const key = getRazorpayPublicKey();
    if (!key) return setError(t("billing.errRazorpayKey"));

    setLoading(true);
    try {
      const res = await axiosInstance.post("/prasadam/orders", {
        ...form,
        quantity: qty,
        sourcePage: params.get("from") || "direct",
      });
      const { razorpayOrderId, amountPaise } = res.data;
      if (!window.Razorpay) await loadScript(RAZORPAY_SRC);
      if (!window.Razorpay || !key) throw new Error("razorpay-unavailable");

      book.saveCurrent(); // remember a newly typed address (best-effort)

      new window.Razorpay({
        key,
        amount: amountPaise,
        currency: "INR",
        order_id: razorpayOrderId,
        name: "Shri Aaum",
        description: `${product.name} × ${qty}`,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        theme: { color: "#f96b26" },
        modal: { ondismiss: () => setLoading(false) },
        handler: async (response) => {
          try {
            const v = await axiosInstance.post("/prasadam/orders/verify", response);
            setDone(String(v.data?.orderId || razorpayOrderId).slice(-8).toUpperCase());
          } catch {
            setError(t("prasadamShop.errVerify"));
          } finally {
            setLoading(false);
          }
        },
      }).open();
    } catch (err) {
      setError(err.response?.data?.message || t("prasadamShop.errGeneric"));
      setLoading(false);
    }
  };

  return (
    <div className="prs-page">
      <form className="prs-box" onSubmit={pay}>
        <h1>{t("prasadamShop.title")}</h1>

        <div className="prs-product">
          <div className="prs-card-media prs-card-media--sm">
            {product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : <span aria-hidden="true">🍬</span>}
          </div>
          <div>
            <h2>{product.name}</h2>
            <p className="prs-muted">{product.description}</p>
            <strong>₹{product.price}</strong>
            {product.imageUrl === "/prasadam-laddu.jpg" && (
              <small className="prs-credit">Photo: Planetvyom / Wikimedia Commons, CC BY-SA 4.0</small>
            )}
          </div>
        </div>

        <div className="prs-qty">
          <span>{t("prasadamShop.quantity")}</span>
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="-">−</button>
          <b>{qty}</b>
          <button type="button" onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="+">+</button>
        </div>

        <h3>{t("prasadamShop.details")}</h3>
        <input name="name" placeholder={t("prasadamShop.name")} value={form.name} onChange={onChange} maxLength={50} required />
        <input name="phone" type="tel" placeholder={t("prasadamShop.phone")} value={form.phone} onChange={onChange} maxLength={10} required />
        <input name="email" type="email" placeholder={t("prasadamShop.email")} value={form.email} onChange={onChange} />

        <h3>{t("prasadamShop.address")}</h3>
        {isLoggedIn && <SavedAddresses book={book} />}
        <input name="streetAddress" placeholder={t("billing.address")} value={form.streetAddress} onChange={onChange} required />
        <input name="city" placeholder={t("billing.city")} value={form.city} onChange={onChange} required />
        <input name="state" placeholder={t("billing.state")} value={form.state} onChange={onChange} required />
        <input name="pincode" placeholder={t("billing.pincode")} value={form.pincode} onChange={onChange} maxLength={6} required />
        {isLoggedIn && !book.selectedId && (
          <label className="sa-save">
            <input type="checkbox" checked={book.saveForLater} onChange={(e) => book.setSaveForLater(e.target.checked)} />
            {t("savedAddress.saveLater")}
          </label>
        )}

        {error && <p className="prs-error">{error}</p>}
        <button className="prs-pay" disabled={loading}>
          {loading ? t("prasadamShop.processing") : t("prasadamShop.pay", { amount: total })}
        </button>
      </form>
    </div>
  );
}
