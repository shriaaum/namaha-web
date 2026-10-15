import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axiosInstance from "../../lib/instance";
import { loadScript } from "../../lib/loadScript";
import { localizePujaRecord } from "../../i18n/content";
import { translateCmsText } from "../../i18n/cmsText";
import Footer from "../Footer/Footer";
import "./BillingPage.css";

// Loaded only on this page (not globally in index.html).
const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

const CHADHAVA_PRASADAM_PRICE = 250;

function BillingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Always start Billing page at top (avoid opening scrolled down)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  // Warm up Razorpay while the user reviews the order; loadRazorpay awaits it anyway.
  useEffect(() => {
    loadScript(RAZORPAY_CHECKOUT_SRC).catch(() => {});
  }, []);

  // ✅ Destructure values passed from PujaDetail navigate state (no pandit/slot/location)
  const {
    puja,
    selectedChadhava,
    selectedPackage,
    image,
    addons: routeAddons = [],
    addonsTotal = 0,
    grandTotal,
    coupon,
    coupons: stateCoupons,
    mode: pujaMode,
  } = location.state || {};

  const isChadhavaFlow =
    String(pujaMode || "").toLowerCase() === "chadhava" ||
    String(selectedPackage?.id || "").toLowerCase() === "chadhava-offerings";

  // Support multiple coupons (array) and legacy single coupon
  const hasCoupons =
    (stateCoupons && stateCoupons.length > 0) || (coupon != null);

  const parseAmount = useCallback((value) => {
    if (!value) return 0;

    // remove ₹ , commas, spaces
    return Number(String(value).replace(/[₹,\s]/g, ""));
  }, []);

  /**
   * Meta Pixel expects `value` as a finite number in major currency units (INR), not a formatted string.
   * Missing/NaN values trigger "InitiateCheckout price missing or incorrect format" in Events Manager.
   */
  const normalizeMetaPixelValue = useCallback((value) => {
    if (value == null || value === "") return null;
    const n =
      typeof value === "number" && Number.isFinite(value)
        ? value
        : parseAmount(value);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * 100) / 100;
  }, [parseAmount]);

  const dispatchMetaPixelTrack = useCallback((eventName, payload, retries = 4) => {
    if (typeof window === "undefined") return;
    if (typeof window.fbq === "function") {
      try {
        window.fbq("track", eventName, payload);
      } catch (e) {
        console.warn("Meta Pixel track error", eventName, e);
      }
      return;
    }
    // fbevents.js is async; retry briefly so checkout events aren't dropped on slower loads.
    if (retries > 0) {
      window.setTimeout(() => {
        dispatchMetaPixelTrack(eventName, payload, retries - 1);
      }, 700);
    } else {
      console.warn("Meta Pixel unavailable after retries", eventName, payload);
    }
  }, []);

  const trackMetaPixelEvent = useCallback((eventName, params = {}) => {
    const payload = { ...params };
    if (payload.value != null) {
      const v = normalizeMetaPixelValue(payload.value);
      if (v != null) payload.value = v;
      else delete payload.value;
    }
    if (!payload.currency || typeof payload.currency !== "string") {
      payload.currency = "INR";
    }
    dispatchMetaPixelTrack(eventName, payload);
  }, [dispatchMetaPixelTrack, normalizeMetaPixelValue]);

  const packagePrice = parseAmount(selectedPackage?.price);

  /** Puja flow: optional add-ons chosen on this page (not on PujaDetail). */
  const [pujaAddonQuantities, setPujaAddonQuantities] = useState(() => {
    const q = {};
    (routeAddons || []).forEach((a) => {
      const id = a.id || a.name;
      if (id && Number(a.quantity) > 0) q[id] = Number(a.quantity);
    });
    return q;
  });

  const updatePujaAddonQuantity = useCallback((addonId, change) => {
    setPujaAddonQuantities((prev) => ({
      ...prev,
      [addonId]: Math.max(0, (prev[addonId] || 0) + change),
    }));
  }, []);

  const resolvedAddons = useMemo(() => {
    if (isChadhavaFlow) return routeAddons || [];
    const catalog = puja?.addOns || [];
    if (!catalog.length) return [];
    return catalog
      .map((addon, index) => {
        const addonId = addon.id || `addon-${index}`;
        const qty = pujaAddonQuantities[addonId] || 0;
        if (qty <= 0) return null;
        const unitPrice = parseAmount(addon.price);
        return {
          id: addon.id || addonId,
          // English name is saved in the booking; the UI shows getAddonDisplayName().
          name: addon.nameEn || addon.name,
          price: unitPrice,
          quantity: qty,
          total: unitPrice * qty,
        };
      })
      .filter(Boolean);
  }, [isChadhavaFlow, routeAddons, puja?.addOns, pujaAddonQuantities, parseAmount]);

  const computedAddonsTotal = useMemo(() => {
    if (isChadhavaFlow) {
      const addonsPrice = parseAmount(addonsTotal);
      if (addonsPrice > 0) return addonsPrice;
      return (resolvedAddons || []).reduce((sum, addon) => {
        const qty = Number(addon?.quantity || 0);
        const unitPrice = parseAmount(addon?.price);
        const lineTotal = parseAmount(addon?.total);
        return sum + (lineTotal > 0 ? lineTotal : unitPrice * qty);
      }, 0);
    }
    return resolvedAddons.reduce((sum, a) => sum + (a.total || 0), 0);
  }, [isChadhavaFlow, addonsTotal, resolvedAddons, parseAmount]);

  const passedGrandTotal = parseAmount(grandTotal);

  const [prasadam, setPrasadam] = useState(location.state?.prasadam ?? false);

  /** Chadhava flow: prasadam is a paid add-on (₹250); Puja flow: prasadam remains free. */
  const prasadamAmount = useMemo(
    () => (isChadhavaFlow && prasadam ? CHADHAVA_PRASADAM_PRICE : 0),
    [isChadhavaFlow, prasadam]
  );

  const subtotal = useMemo(() => {
    if (isChadhavaFlow) {
      const base = passedGrandTotal > 0 ? passedGrandTotal : packagePrice + computedAddonsTotal;
      return base + prasadamAmount;
    }
    return packagePrice + computedAddonsTotal;
  }, [isChadhavaFlow, passedGrandTotal, packagePrice, computedAddonsTotal, prasadamAmount]);
  // Display-only names, re-translated live from the English source on language change.
  const PACKAGE_LABEL_KEYS = {
    Individual: "pujaDetail.pkgIndividual",
    Couple: "pujaDetail.pkgCouple",
    Family: "pujaDetail.pkgFamily",
    "Joint Family": "pujaDetail.pkgJoint",
  };
  const pujaTitleEn = puja?.titleEn || puja?.title;
  const displayPujaTitle = useMemo(() => {
    if (!pujaTitleEn) return pujaTitleEn;
    if (isChadhavaFlow) return translateCmsText(pujaTitleEn, i18n.language);
    const localized = localizePujaRecord({ _id: puja?.id, name: pujaTitleEn }, i18n.language)?.name;
    return localized && localized !== pujaTitleEn ? localized : translateCmsText(pujaTitleEn, i18n.language);
  }, [isChadhavaFlow, puja?.id, pujaTitleEn, i18n.language]);
  const addonDisplayNames = useMemo(() => {
    const list = puja?.addOns || [];
    const english = list.map((a) => ({ _id: a.id, name: a.nameEn || a.name }));
    const localized = localizePujaRecord({ _id: puja?.id, addOns: english }, i18n.language)?.addOns || [];
    return new Map(
      list.map((a, index) => {
        const en = english[index].name;
        const viaRecord = localized[index]?.name;
        const label = viaRecord && viaRecord !== en ? viaRecord : translateCmsText(en, i18n.language);
        return [String(a.id || `addon-${index}`), label];
      })
    );
  }, [puja?.id, puja?.addOns, i18n.language]);
  const getAddonDisplayName = (addon, index) =>
    isChadhavaFlow
      ? translateCmsText(addon?.name, i18n.language)
      : addonDisplayNames.get(String(addon?.id || `addon-${index}`)) || addon?.name;
  const getPackageDisplayName = (pkg) =>
    PACKAGE_LABEL_KEYS[pkg?.name] ? t(PACKAGE_LABEL_KEYS[pkg.name]) : pkg?.name;

  const resolvedSelectedPackage = useMemo(
    () =>
      isChadhavaFlow
        ? {
            ...selectedPackage,
            name: selectedChadhava?.title || puja?.title || selectedPackage?.name,
          }
        : selectedPackage,
    [isChadhavaFlow, selectedPackage, selectedChadhava?.title, puja?.title]
  );


  const [appliedCoupon, setAppliedCoupon] = useState(location.state?.appliedCoupon ?? null);
  const [discountAmount, setDiscountAmount] = useState(location.state?.discountAmount ?? 0);
  const [finalAmount, setFinalAmount] = useState(location.state?.finalAmount ?? subtotal);
  const [couponError, setCouponError] = useState("");
  const [couponInput, setCouponInput] = useState(location.state?.couponInput ?? "");
  const [couponLoading, setCouponLoading] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "error" });
  const toastTimeoutRef = useRef(null);

  const showToast = useCallback((message, type = "error") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ show: true, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
      toastTimeoutRef.current = null;
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const couponApplied = appliedCoupon != null;
  const isSpecialCouponApplied = couponApplied && Boolean(appliedCoupon?.specialCoupon);
  const finalPayable = couponApplied ? finalAmount : Math.max(subtotal, 0);

  useEffect(() => {
    if (isSpecialCouponApplied && prasadam) setPrasadam(false);
  }, [isSpecialCouponApplied, prasadam]);

  // Sync finalAmount when subtotal changes and no coupon applied
  useEffect(() => {
    if (!couponApplied) {
      setFinalAmount(subtotal);
      setDiscountAmount(0);
    }
  }, [subtotal, couponApplied]);

  /** Calculate discount from coupon: percentage = subtotal × value/100; fixed = flat amount. No maxDiscountAmount. */
  const calcCouponDiscount = (coupon, amt) => {
    if (!coupon) return 0;
    const type = (coupon.discountType || "").toLowerCase();
    const val = Number(coupon.discountValue) || 0;

    if (type === "percentage") {
      return (amt * val) / 100;
    }
    if (type === "fixed" || type === "amount") {
      return Math.min(val, amt);
    }
    return 0;
  };

  const handleApplyCoupon = async () => {
    setCouponError("");
    const entered = (couponInput || "").trim();
    if (!entered) {
      setCouponError({ key: "billing.couponEmpty" });
      return;
    }

    const poojaId = puja?._id || puja?.id;
    if (!poojaId) {
      setCouponError({ key: "billing.couponPujaMissing" });
      return;
    }

    try {
      setCouponLoading(true);
      const res = await axiosInstance.post("/pooja/validate-coupon", {
        poojaId,
        couponCode: entered,
        subtotal,
      });
      const data = res.data;

      if (data.success && data.valid === true) {
        const couponObj = data.coupon ?? { code: entered, ...data.coupon };
        setAppliedCoupon(couponObj);
        const correctDiscount = calcCouponDiscount(couponObj, subtotal);
        setDiscountAmount(correctDiscount);
        setFinalAmount(Math.max(subtotal - correctDiscount, 0));
        setCouponError("");
      } else {
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setFinalAmount(subtotal);
        setCouponError(data.message ? { text: data.message } : { key: "billing.couponInvalid" });
      }
    } catch (err) {
      const serverMessage = err.response?.data?.message;
      setCouponError(serverMessage ? { text: serverMessage } : { key: "billing.couponValidateFailed" });
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setFinalAmount(subtotal);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setFinalAmount(subtotal);
    setCouponError("");
    setCouponInput("");
  };

  // ================= PARTICIPANT COUNT =================
  // Family = 4 forms, Joint Family = 6; use package.persons when available
  const getParticipantCount = () => {
    const pkg = selectedPackage;
    const persons = pkg?.persons;
    if (typeof persons === "number" && persons >= 1 && persons <= 20) return persons;
    const name = (pkg?.name ?? "").toLowerCase();
    if (name.includes("individual")) return 1;
    if (name.includes("joint")) return 6;
    if (name.includes("couple") || name.includes("partner") || name.includes("two person")) return 2;
    if (name.includes("family")) return 4;
    return 1;
  };

  const participantCount = getParticipantCount();

  // ================= DEVOTEE FORM =================
  const [form, setForm] = useState(
    (() => {
      const incoming = location.state?.form || {};
      const legacyAddress = incoming.address || "";
      return {
        name: incoming.name || "",
        email: incoming.email || "",
        phone: incoming.phone || "",
        streetAddress: incoming.streetAddress || legacyAddress || "",
        city: incoming.city || "",
        state: incoming.state || "",
        pincode: incoming.pincode || "",
      };
    })()
  );

  const composedAddress = useMemo(() => {
    const street = String(form.streetAddress || "").trim();
    const city = String(form.city || "").trim();
    const stateName = String(form.state || "").trim();
    const pincode = String(form.pincode || "").trim();
    return [street, city, stateName, pincode].filter(Boolean).join(", ");
  }, [form.streetAddress, form.city, form.state, form.pincode]);

  const getDevoteeDetailsPayload = useCallback(() => ({
    ...form,
    address: composedAddress,
  }), [form, composedAddress]);

  // ================= PARTICIPANTS =================
  const [participants, setParticipants] = useState(
    location.state?.participants ??
    Array.from({ length: participantCount }, () => ({
      name: "",
      gotra: "",
    }))
  );

  // When participant count from package changes, resize participants array to match
  useEffect(() => {
    if (participants.length === participantCount) return;
    setParticipants((prev) => {
      if (prev.length === participantCount) return prev;
      if (prev.length < participantCount) {
        return [
          ...prev,
          ...Array.from({ length: participantCount - prev.length }, () => ({ name: "", gotra: "" })),
        ];
      }
      return prev.slice(0, participantCount);
    });
  }, [participantCount, participants.length]);

  const [loading, setLoading] = useState(false);
  const [postPaymentLoading, setPostPaymentLoading] = useState(false);
  const PENDING_RAZORPAY_ORDER_KEY = "pendingRazorpayOrderId";
  const authToken = localStorage.getItem("token");
  const isLoggedInDevotee = Boolean(authToken);
  const bookingBasePath = isLoggedInDevotee
    ? "/bookings/booking"
    : "/bookings/guest/booking";
  const [pendingBookingId, setPendingBookingId] = useState(() => {
    try {
      return sessionStorage.getItem("pendingBookingId") || null;
    } catch {
      return null;
    }
  });
  const pendingSaveTimeoutRef = useRef(null);
  const pendingSaveInFlightRef = useRef(false);
  const pendingSavePromiseRef = useRef(null);
  const lastAutoSaveKeyRef = useRef(null);
  const paymentStartedRef = useRef(false);

  // Autosave when devotee form is filled. Name from form or Participant 1 (name field is hidden).
  const isFormValidForPending = useCallback(() => {
    const devoteeName = form.name?.trim() || participants[0]?.name?.trim();
    if (
      !devoteeName ||
      !form.phone ||
      !form.streetAddress?.trim() ||
      !form.city?.trim() ||
      !form.state?.trim() ||
      !/^\d{6}$/.test(String(form.pincode || ""))
    ) {
      return false;
    }
    if (!/^\d{10}$/.test(form.phone)) return false;
    if (!puja?.id && !puja?._id) return false;
    return true;
  }, [
    form.name,
    form.phone,
    form.streetAddress,
    form.city,
    form.state,
    form.pincode,
    participants,
    puja?.id,
    puja?._id
  ]);

  useEffect(() => {
    if (!isFormValidForPending() || loading) return;
    if (paymentStartedRef.current) return;
    if (pendingSaveInFlightRef.current) return;

    const devoteeName = form.name?.trim() || participants[0]?.name?.trim();
    const autoSaveKey = JSON.stringify({
      name: devoteeName,
      phone: form.phone,
      email: form.email,
      streetAddress: form.streetAddress,
      city: form.city,
      state: form.state,
      pincode: form.pincode,
      address: composedAddress,
      participants,
      prasadam,
      couponCode: appliedCoupon?.code || coupon?.code || null,
      discountAmount: couponApplied ? discountAmount : 0,
      selectedPackageId: selectedPackage?.id || selectedPackage?._id || null,
      addonsTotal: computedAddonsTotal,
      grandTotal: finalPayable,
    });
    // If we already auto-saved this exact data and we have an ID, don't spam backend.
    if (pendingBookingId && lastAutoSaveKeyRef.current === autoSaveKey) return;

    if (pendingSaveTimeoutRef.current) clearTimeout(pendingSaveTimeoutRef.current);
    pendingSaveTimeoutRef.current = setTimeout(() => {
      pendingSaveTimeoutRef.current = null;
      const payload = {
        poojaId: puja._id || puja.id,
        mode: pujaMode || "online",
        status: "pending",
        createOrder: false,
        ...(pendingBookingId && { bookingId: pendingBookingId }),
        coupon: appliedCoupon ?? coupon ?? null,
        couponCode: appliedCoupon?.code || coupon?.code || null,
        isCouponApplied: couponApplied,
        discountAmount: couponApplied ? discountAmount : 0,
        devoteeDetails: getDevoteeDetailsPayload(),
        participants,
        appliedCoupon: couponApplied && appliedCoupon ? appliedCoupon : null,
        grandTotal: finalPayable,
        selectedPackage: resolvedSelectedPackage,
        selectedChadhava: selectedChadhava || null,
        addons: resolvedAddons,
        addonsTotal: computedAddonsTotal,
        ...(prasadam && { prasadam: true, prasadamAmount }),
      };
      pendingSaveInFlightRef.current = true;
      const req = axiosInstance
        .post(bookingBasePath, payload, {
          withCredentials: true,
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        })
        .then((res) => {
          if (res.data?.success) {
            const id =
              res.data.bookingId ||
              res.data.booking?._id ||
              res.data.orderId ||
              res.data._id;
            if (id) {
              setPendingBookingId(id);
              try {
                sessionStorage.setItem("pendingBookingId", id);
              } catch {}
            }
            lastAutoSaveKeyRef.current = autoSaveKey;
            console.log("✅ Pending booking saved:", res.data);
          }
        })
        .catch((err) => {
          console.warn("⚠️ Pending save failed:", err.response?.data || err.message);
        })
        .finally(() => {
          pendingSaveInFlightRef.current = false;
          pendingSavePromiseRef.current = null;
        });
      pendingSavePromiseRef.current = req;
    }, 1500);

    return () => {
      if (pendingSaveTimeoutRef.current) clearTimeout(pendingSaveTimeoutRef.current);
    };
  }, [
    isFormValidForPending,
    pendingBookingId,
    loading,
    puja,
    pujaMode,
    appliedCoupon,
    coupon,
    couponApplied,
    discountAmount,
    form,
    participants,
    finalPayable,
    selectedPackage,
    resolvedSelectedPackage,
    selectedChadhava,
    computedAddonsTotal,
    resolvedAddons,
    prasadam,
    prasadamAmount,
    bookingBasePath,
    authToken,
    composedAddress,
    getDevoteeDetailsPayload,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Enforce 10-digit numeric phone input live
    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "");
      setForm((prev) => ({ ...prev, phone: digitsOnly.slice(0, 10) }));
      return;
    }

    if (name === "pincode") {
      const digitsOnly = value.replace(/\D/g, "");
      setForm((prev) => ({ ...prev, pincode: digitsOnly.slice(0, 6) }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleParticipantChange = (index, field, value) => {
    const updated = [...participants];
    updated[index][field] = value;
    setParticipants(updated);
  };

  // ================= PAYMENT =================
  const handlePayment = async () => {
    paymentStartedRef.current = true;
    if (pendingSaveTimeoutRef.current) {
      clearTimeout(pendingSaveTimeoutRef.current);
      pendingSaveTimeoutRef.current = null;
    }
    // If an auto-save is in-flight and we don't yet have bookingId, wait for it (best-effort)
    if (!pendingBookingId && pendingSavePromiseRef.current) {
      try {
        await pendingSavePromiseRef.current;
      } catch {
        // ignore; Pay click can still create a pending booking + order
      }
    }

    // Validate required fields (Name hidden; Phone + full address fields required)
    if (
      !form.phone ||
      !form.streetAddress?.trim() ||
      !form.city?.trim() ||
      !form.state?.trim() ||
      !String(form.pincode || "").trim()
    ) {
      showToast(t("billing.errFillRequired"));
      paymentStartedRef.current = false;
      return;
    }

    // Phone: must be exactly 10 digits
    if (!/^\d{10}$/.test(form.phone)) {
      showToast(t("billing.errPhone"));
      paymentStartedRef.current = false;
      return;
    }
    if (!/^\d{6}$/.test(String(form.pincode || ""))) {
      showToast(t("billing.errPincode"));
      paymentStartedRef.current = false;
      return;
    }

    // Email: if provided, must contain "@" in a basic valid pattern
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      showToast(t("billing.errEmail"));
      paymentStartedRef.current = false;
      return;
    }
    const missingParticipantNames = participants
      .map((p, i) => (p.name?.trim() ? null : i + 1))
      .filter(Boolean);
    if (missingParticipantNames.length > 0) {
      showToast(t("billing.errParticipantNames", { list: missingParticipantNames.join(", ") }));
      paymentStartedRef.current = false;
      return;
    }

    if (!puja?.id) {
      showToast(t("billing.errPujaMissing"));
      navigate(-1);
      paymentStartedRef.current = false;
      return;
    }

    try {
      setLoading(true);

      const payload = {
        poojaId: puja._id || puja.id,
        mode: pujaMode || "online",
        status: "pending",
        createOrder: true,
        ...(pendingBookingId && { bookingId: pendingBookingId }),

        coupon: appliedCoupon ?? coupon ?? null,
        couponCode: appliedCoupon?.code || coupon?.code || null,
        isCouponApplied: couponApplied,
        discountAmount: couponApplied ? discountAmount : 0,

        devoteeDetails: {
          ...getDevoteeDetailsPayload(),
          name: form.name?.trim() || participants[0]?.name?.trim() || "",
        },
        participants: participants,
        appliedCoupon: couponApplied && appliedCoupon ? appliedCoupon : null,

        grandTotal: finalPayable,
        selectedPackage: resolvedSelectedPackage,
        selectedChadhava: selectedChadhava || null,
        addons: resolvedAddons,
        addonsTotal: computedAddonsTotal,

        ...(prasadam && { prasadam: true, prasadamAmount }),
      };

      const res = await axiosInstance.post(bookingBasePath, payload, {
        withCredentials: true,
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });


      const orderId =
        res.data.razorpayOrderId || res.data.orderId || res.data.order_id;
      // Backend responses vary across flows:
      // - `amount` is often rupees in this API
      // - `order.amount` / `amountPaise` style fields are paise
      // Normalize to paise before opening Razorpay.
      const backendAmountPaiseDirect = Number(
        res.data.amountPaise ||
          res.data.orderAmountPaise ||
          res.data.razorpayAmountPaise ||
          res.data.razorpay_order_amount ||
          res.data?.order?.amount ||
          0
      );
      const backendAmountRupees = parseAmount(
        res.data.amount || res.data.orderAmount || res.data.razorpayAmount || 0
      );
      const backendOrderAmountPaise =
        Number.isFinite(backendAmountPaiseDirect) && backendAmountPaiseDirect > 0
          ? Math.round(backendAmountPaiseDirect)
          : Number.isFinite(backendAmountRupees) && backendAmountRupees > 0
            ? Math.round(backendAmountRupees * 100)
            : null;
      if (res.data.success && orderId) {
        await loadRazorpay(
          orderId,
          finalPayable,
          backendOrderAmountPaise
        );
      } else {
        showToast(res.data.message || t("billing.errCreateOrder"));
      }
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || "Payment failed";

      console.error("❌ Payment error:", {
        status,
        message,
        data: err.response?.data,
      });

      if (status === 401) {
        alert(err.response?.data?.message || t("billing.paymentFailed"));
        return;
      }

      if (status === 409) {
        showToast(t("billing.errBookingConflict"));
        navigate(-1);
        return;
      }

      showToast(err.response?.data?.message || t("billing.paymentFailed"));
    } finally {
      setLoading(false);
    }
  };

  // ================= RAZORPAY =================
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const PAYMENT_SUCCESS_PROCESSING_DELAY_MS = 2000;

  const setPendingRazorpayOrderId = (orderId) => {
    try {
      if (orderId) sessionStorage.setItem(PENDING_RAZORPAY_ORDER_KEY, orderId);
    } catch {}
  };

  const clearPendingRazorpayOrderId = () => {
    try {
      sessionStorage.removeItem(PENDING_RAZORPAY_ORDER_KEY);
    } catch {}
  };

  const getPendingRazorpayOrderId = () => {
    try {
      return sessionStorage.getItem(PENDING_RAZORPAY_ORDER_KEY) || null;
    } catch {
      return null;
    }
  };

  const extractFinalOrderId = (data, fallbackOrderId) =>
    data?.bookingId ||
    data?.booking?._id ||
    data?.orderId ||
    data?.order_id ||
    fallbackOrderId;

  const buildPaymentPayload = (orderId, paymentResponse = null) => ({
    razorpay_order_id: orderId,
    ...(paymentResponse?.razorpay_payment_id
      ? { razorpay_payment_id: paymentResponse.razorpay_payment_id }
      : {}),
    ...(paymentResponse?.razorpay_signature
      ? { razorpay_signature: paymentResponse.razorpay_signature }
      : {}),
    status: "success",
    ...(pendingBookingId && { bookingId: pendingBookingId }),
    devoteeDetails: {
      name: form.name?.trim() || participants[0]?.name?.trim() || "",
      email: form.email || "",
      phone: form.phone,
      address: composedAddress || "",
    },
    participants: participants.map((p) => ({
      name: p.name || "",
      gotra: p.gotra || "",
    })),
    coupon: couponApplied && appliedCoupon ? appliedCoupon : (couponApplied && coupon ? coupon : null),
    couponCode: couponApplied && (appliedCoupon?.code || coupon?.code) ? (appliedCoupon?.code || coupon?.code) : null,
    isCouponApplied: couponApplied,
    discountAmount: couponApplied ? discountAmount : 0,
    poojaId: puja?._id || puja?.id,
    date:
      selectedPackage?.date ||
      puja?.date ||
      (puja?.eventDate
        ? new Date(puja.eventDate).toLocaleDateString("en-IN")
        : null),
    grandTotal: finalPayable,
    puja,
    selectedPackage,
    image: image || null,
    addons: resolvedAddons,
    addonsTotal: computedAddonsTotal,
    prasadam,
    prasadamAmount,
  });

  const handlePostPaymentSuccess = async ({ finalOrderId, payload }) => {
    if (finalOrderId) {
      const invoicePdfUrl = `https://api.shriaaum.com/api/invoice-pdf/${finalOrderId}`;
      await sendInvoiceToBackend({
        phone: form.phone,
        name: form.name,
        email: form.email || "",
        amount: finalPayable,
        orderId: finalOrderId,
        pdfUrl: invoicePdfUrl,
      });
    }

    const purchaseValue = normalizeMetaPixelValue(finalPayable);
    const purchaseContentId = String(
      puja?._id || puja?.id || finalOrderId || "purchase"
    );
    if (purchaseValue != null) {
      trackMetaPixelEvent("Purchase", {
        value: purchaseValue,
        currency: "INR",
        content_type: "product",
        content_ids: [purchaseContentId],
        contents: [
          {
            id: purchaseContentId,
            quantity: 1,
            item_price: purchaseValue,
          },
        ],
      });
    }

    const invoice = {
      orderId: finalOrderId,
      invoiceNo: `INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${String(finalOrderId).replace(/[^a-zA-Z0-9]/g, "").slice(-4) || "001"}`,
      invoiceDate: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
      devoteeDetails: payload.devoteeDetails,
      participants: payload.participants,
      pujaName: pujaTitleEn,
      pujaDate: payload.date,
      packageName: selectedPackage?.name,
      packagePrice: selectedPackage?.price,
      addons: resolvedAddons || [],
      addonsTotal: computedAddonsTotal,
      prasadam,
      prasadamAmount,
      coupon: payload.coupon,
      couponCode: payload.couponCode,
      discountAmount: payload.discountAmount || discountAmount,
      grandTotal: payload.grandTotal,
    };
    setInvoiceData(invoice);
    setShowInvoiceModal(true);
    setPendingBookingId(null);
    clearPendingRazorpayOrderId();
  };

  const reconcileRazorpayWithRetry = async ({ orderId, token }) => {
    const retryDelaysMs = [10000, 10000];
    for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
      try {
        const reconcileRes = await axiosInstance.post(
          `${bookingBasePath}/reconcile-razorpay`,
          { razorpay_order_id: orderId },
          {
            withCredentials: true,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        return reconcileRes?.data;
      } catch (reconcileErr) {
        const status = reconcileErr?.response?.status;
        if (status === 409 && attempt < retryDelaysMs.length) {
          await wait(retryDelaysMs[attempt]);
          continue;
        }
        throw reconcileErr;
      }
    }
    return null;
  };

  useEffect(() => {
    if (!puja?.id && !puja?._id) return;
    const pendingOrderId = getPendingRazorpayOrderId();
    if (!pendingOrderId) return;

    let cancelled = false;
    (async () => {
      try {
        setPostPaymentLoading(true);
        const reconciledData = await reconcileRazorpayWithRetry({
          orderId: pendingOrderId,
          token: authToken,
        });
        if (cancelled) return;
        const finalOrderId = extractFinalOrderId(reconciledData, pendingOrderId);
        const payload = buildPaymentPayload(pendingOrderId);
        await handlePostPaymentSuccess({ finalOrderId, payload });
      } catch (reconcileErr) {
        if (cancelled) return;
        const reconcileStatus = reconcileErr?.response?.status;
        if (reconcileStatus !== 409) {
          clearPendingRazorpayOrderId();
        }
      } finally {
        if (!cancelled) setPostPaymentLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Session recovery: only re-check when puja identity is available. Adding form/payment
    // helpers as deps would re-run reconcile on every keystroke and duplicate side effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional narrow deps for recovery
  }, [puja?.id, puja?._id]);

  const loadRazorpay = async (orderId, amount, backendOrderAmountPaise = null) => {
    if (!window.Razorpay) {
      try {
        await loadScript(RAZORPAY_CHECKOUT_SRC);
      } catch (err) {
        console.error(err);
      }
    }
    if (!window.Razorpay) {
      showToast(t("billing.errRazorpaySdk"));
      return;
    }

    const razorpayKey = process.env.REACT_APP_RAZORPAY_KEY_ID;

    if (!razorpayKey) {
      showToast(t("billing.errRazorpayKey"));
      return;
    }
    if (!orderId || typeof orderId !== "string" || !orderId.startsWith("order_")) {
      console.error("Invalid order_id from backend:", orderId);
      showToast(t("billing.errInvalidOrder"));
      return;
    }
    setPendingRazorpayOrderId(orderId);

    const normalizedRupees = normalizeMetaPixelValue(amount);
    const fallbackPaise = Number.isFinite(normalizedRupees)
      ? Math.round(normalizedRupees * 100)
      : 0;
    const orderAmountPaise =
      Number.isFinite(backendOrderAmountPaise) && backendOrderAmountPaise > 0
        ? Math.round(backendOrderAmountPaise)
        : fallbackPaise;
    const checkoutValue =
      orderAmountPaise > 0 ? Math.round(orderAmountPaise) / 100 : null;

    if (
      Number.isFinite(backendOrderAmountPaise) &&
      backendOrderAmountPaise > 0 &&
      fallbackPaise > 0 &&
      Math.round(backendOrderAmountPaise) !== fallbackPaise
    ) {
      console.warn(
        "Razorpay amount mismatch: backend order amount differs from frontend total",
        {
          backendOrderAmountPaise,
          frontendAmountPaise: fallbackPaise,
          orderId,
        }
      );
    }

    // Meta Pixel: InitiateCheckout — send numeric rupee value + ISO currency.
    if (checkoutValue != null) {
      trackMetaPixelEvent("InitiateCheckout", {
        value: checkoutValue,
        currency: "INR",
      });
    } else {
      console.warn("Meta Pixel InitiateCheckout skipped: invalid checkout amount", amount);
    }

    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY_ID,
      amount: orderAmountPaise, // always integer paise; prefer backend order amount
      currency: "INR",
      order_id: orderId,
      name: "Shri Aaum",
      description: `${pujaTitleEn} - ${selectedPackage.name}`,

      prefill: {
        name: form.name,
        email: form.email || "",
        contact: form.phone,
      },

      theme: { color: "#f96b26" },

      // POST /api/bookings/{booking|guest/booking}/confirm-razorpay — role-aware endpoint.
      // Full URL = baseURL + `${bookingBasePath}/confirm-razorpay`
      handler: async function (response) {
        // Payment finalization safety net:
        // 1) Try confirm endpoint first.
        // 2) If confirm is non-success OR throws (timeout/network/backend), fallback to reconcile.
        // 3) Reconcile checks by razorpay_order_id and retries on 409 to handle capture delays.
        // This avoids "payment succeeded but booking not finalized" during transient failures.
        // ✅ STRICT guard — exit immediately if payment data is missing
        if (
          !response?.razorpay_payment_id ||
          !response?.razorpay_signature ||
          !response?.razorpay_order_id
        ) {
          console.warn("⚠️ Incomplete Razorpay response, ignoring:", response);
          paymentStartedRef.current = false;
          setLoading(false);
          setPostPaymentLoading(false);
          return;
        }
        setPostPaymentLoading(true);
        // Small post-success delay helps backend/payment provider state settle
        // before first confirm call, while loader keeps user informed.
        await wait(PAYMENT_SUCCESS_PROCESSING_DELAY_MS);
        const payload = buildPaymentPayload(orderId, response);
        try {
          const confirmRes = await axiosInstance.post(
            `${bookingBasePath}/confirm-razorpay`,
            payload,
            {
              withCredentials: true,
              headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
            }
          );

          const confirmIsSuccessful =
            confirmRes?.status === 200 && confirmRes?.data?.success !== false;

          if (!confirmIsSuccessful) {
            throw new Error(
              confirmRes?.data?.message || "Confirm API returned non-success response."
            );
          }

          const finalOrderId = extractFinalOrderId(confirmRes?.data, orderId);
          await handlePostPaymentSuccess({ finalOrderId, payload });
        } catch (err) {
          console.warn(
            "Confirm payment failed/non-success; trying reconcile fallback:",
            err
          );
          try {
            const reconciledData = await reconcileRazorpayWithRetry({
              orderId,
              token: authToken,
            });
            const finalOrderId = extractFinalOrderId(reconciledData, orderId);
            await handlePostPaymentSuccess({ finalOrderId, payload });
            return;
          } catch (reconcileErr) {
            const reconcileStatus = reconcileErr?.response?.status;
            if (reconcileStatus === 409) {
              showToast(t("billing.errPaymentSyncing"));
            } else if (reconcileStatus === 404) {
              showToast(t("billing.errBookingNotFound"));
            } else {
              showToast(
                reconcileErr?.response?.data?.message ||
                  t("billing.errReconcileFailed")
              );
            }
            console.error("Reconcile payment error:", reconcileErr);
          }
        } finally {
          setPostPaymentLoading(false);
        }
      },

      modal: {
        ondismiss: function () {
          paymentStartedRef.current = false;
          setLoading(false);
          setPostPaymentLoading(false);
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (response) {
      console.error("❌ Razorpay payment failed:", response.error);
      const msg = response.error?.description || response.error?.reason || "Payment failed.";
      if (response.error?.code === "BAD_REQUEST_ERROR" && msg.includes("id") && msg.includes("not exist")) {
        showToast(t("billing.errKeyMismatch"));
      } else {
        alert(
          t("billing.paymentFailedReason", {
            reason:
              response.error?.description ||
              response.error?.reason ||
              t("billing.paymentFailed"),
          })
        );
      }
    });
    rzp.open();
  };

  const handleDownloadInvoice = () => {
    if (!invoiceData) return;

    const {
      orderId,
      invoiceNo,
      invoiceDate,
      devoteeDetails,
      pujaName,
      pujaDate,
      packageName,
      packagePrice,
      addons,
      prasadam,
      prasadamAmount,
      coupon,
      couponCode,
      discountAmount,
      grandTotal,
    } = invoiceData;

    // Payment Summary rows: Puja package + addons
    const packagePriceVal = String(packagePrice || 0).replace(/[₹,\s]/g, "") || "0";
    const pkgRow = `<tr><td style="padding:8px 12px; border-bottom:1px solid #e5e7eb;">${pujaName} (${packageName || "-"})</td><td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; text-align:center;">1</td><td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; text-align:right;">₹${packagePriceVal}</td></tr>`;

    const addonsRows =
      addons && addons.length
        ? addons
            .map(
              (a) =>
                `<tr><td style="padding:8px 12px; border-bottom:1px solid #e5e7eb;">${a.name || "-"}</td><td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; text-align:center;">${a.quantity || 1}</td><td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; text-align:right;">₹${a.total || a.price || 0}</td></tr>`
            )
            .join("")
        : "";

    const prasadamRow =
      prasadam && (prasadamAmount || 0) > 0
        ? `<tr><td style="padding:8px 12px; border-bottom:1px solid #e5e7eb;">Prasadam</td><td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; text-align:center;">1</td><td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; text-align:right;">₹${prasadamAmount}</td></tr>`
        : "";

    const couponRow =
      coupon && couponCode && (discountAmount || 0) > 0
        ? `<tr><td colspan="2" style="padding:8px 12px; border-bottom:1px solid #e5e7eb;">Discount (${couponCode})</td><td style="padding:8px 12px; border-bottom:1px solid #e5e7eb; text-align:right;">-₹${discountAmount || 0}</td></tr>`
        : "";

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${invoiceNo || orderId || "Puja Booking"}</title>
          <meta charset="UTF-8" />
          <style>
            * { box-sizing: border-box; }
            body { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; margin: 0; padding: 32px; color: #1f2937; font-size: 13px; line-height: 1.5; }
            .invoice { max-width: 700px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #ea580c; padding-bottom: 16px; margin-bottom: 24px; }
            .brand { font-size: 22px; font-weight: 700; color: #1f2937; margin: 0 0 4px; letter-spacing: 0.5px; }
            .tagline { font-size: 12px; color: #6b7280; margin: 0 0 8px; }
            .contact { font-size: 11px; color: #6b7280; }
            .invoice-title { font-size: 20px; font-weight: 700; text-align: center; margin: 20px 0; color: #1f2937; }
            .meta-row { display: flex; flex-wrap: wrap; gap: 24px 32px; margin-bottom: 20px; font-size: 12px; }
            .meta-row span { display: block; }
            .meta-row strong { color: #374151; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; padding-bottom: 4px; }
            .section-content { font-size: 13px; }
            .section-content p { margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { text-align: left; padding: 10px 12px; background: #f9fafb; font-weight: 600; color: #374151; border: 1px solid #e5e7eb; }
            td { padding: 8px 12px; border: 1px solid #e5e7eb; }
            .total-row { font-weight: 700; background: #fef3c7; }
            .notes { margin-top: 24px; padding: 12px; background: #f9fafb; border-radius: 8px; font-size: 12px; color: #4b5563; }
            .footer { margin-top: 28px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
            @media print { body { padding: 16px; } .invoice { max-width: 100%; } }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="header">
              <h1 class="brand">SHRI AAUM</h1>
              <p class="tagline">Sacred Ritual Booking Platform</p>
              <p class="contact">Website: www.shriaaum.com | Email: bhakta@shriaaum.com</p>
            </div>

            <h2 class="invoice-title">INVOICE</h2>

            <div class="meta-row">
              <span><strong>Invoice No:</strong> ${invoiceNo || orderId || "-"}</span>
              <span><strong>Invoice Date:</strong> ${invoiceDate || new Date().toLocaleDateString("en-IN")}</span>
              <span><strong>Payment Status:</strong> Paid</span>
            </div>

            <div class="section">
              <div class="section-title">Devotee Details</div>
              <div class="section-content">
                <p><strong>Name:</strong> ${devoteeDetails?.name || "-"}</p>
                <p><strong>Phone:</strong> ${devoteeDetails?.phone || "-"}</p>
                <p><strong>Email:</strong> ${devoteeDetails?.email || "N/A"}</p>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Booking Details</div>
              <div class="section-content">
                <p><strong>Booking ID:</strong> ${orderId || "-"}</p>
                <p><strong>Service:</strong> Temple Ritual / Pooja</p>
                <p><strong>Temple Date:</strong> ${pujaDate || "-"}</p>
                <p><strong>Booking Mode:</strong> Online</p>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Payment Summary</div>
              <table>
                <thead>
                  <tr><th>Description</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Price</th></tr>
                </thead>
                <tbody>
                  ${pkgRow}
                  ${addonsRows}
                  ${prasadamRow}
                  ${couponRow}
                </tbody>
              </table>
              <p style="margin-top:12px; text-align:right; font-weight:700; font-size:14px;">Total Paid: ₹${grandTotal}</p>
            </div>

            <div class="notes">
              <strong>Notes:</strong><br/>
              This invoice confirms your booking for the selected ritual service. Prasadam dispatch and ritual updates will be shared via WhatsApp or email.
            </div>

            <div class="footer">
              Thank you for booking with Shri AAUM. May divine blessings be with you.
            </div>
          </div>
        </body>
      </html>
    `);

    win.document.close();
    win.focus();
    win.print();
  };

  const handleCloseInvoice = () => {
    setShowInvoiceModal(false);
    navigate("/");
  };

  // Guard: if accessed directly without state
  if (!puja) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2>{t("billing.invalidAccess")}</h2>
        <p>{t("billing.selectPuja")}</p>
        <button onClick={() => navigate("/puja")}>{t("billing.backToList")}</button>
      </div>
    );
  }

  // ================= SEND INVOICE PDF VIA WHATSAPP (Twilio backend) =================
  // Uses POST /api/send-pdf-whatsapp – sends existing PDF URL via Twilio
  const sendInvoiceToBackend = async ({
    phone,
    name,
    amount,
    orderId,
    pdfUrl,
  }) => {
    if (!phone || !pdfUrl || !orderId) {
      console.warn("Skipping WhatsApp invoice send, missing data:", {
        phone,
        pdfUrl,
        orderId,
      });
      return;
    }

    // Format phone for Twilio: 91xxxxxxxxxx
    const phoneNumber = /^91\d{10}$/.test(phone) ? phone : `91${phone}`;

    const message = [
      `Namaste ${name || ""}!`,
      `Your puja invoice (Order: ${orderId})`,
      amount != null ? `Amount: ₹${amount}` : null,
    ]
      .filter(Boolean)
      .join(". ");

    try {
      const res = await axiosInstance.post("/send-pdf-whatsapp", {
        phoneNumber,
        pdfUrl,
        orderId,
        message,
      });

      const data = res.data;

      if (data.success) {
        showToast(t("billing.invoiceWhatsapp"), "success");
      } else {
        console.error("❌ Failed sending WhatsApp PDF:", data.message);
      }
    } catch (err) {
      console.error("❌ Error sending WhatsApp PDF:", err);
    }
  };

  return (
    <>
    {toast.show && (
      <div className={`billing-toast billing-toast-${toast.type}`} role="alert">
        {toast.message}
      </div>
    )}
    {postPaymentLoading && (
      <div className="billing-post-payment-overlay" role="status" aria-live="polite">
        <div className="billing-post-payment-spinner" aria-hidden="true" />
        <p className="billing-post-payment-text">{t("billing.postPaymentWait")}</p>
      </div>
    )}
    {showInvoiceModal && invoiceData && (
      <div className="billing-invoice-backdrop">
        <div className="billing-invoice-modal">
          <h2 className="billing-invoice-title">{t("billing.paymentSuccess")}</h2>
          <p className="billing-invoice-subtitle">
            {t("billing.bookingSuccessMessage")}
          </p>

          <div className="billing-invoice-section">
            <h3>{t("billing.invoiceSummary")}</h3>
            <p><strong>{t("billing.labelPuja")}:</strong> {invoiceData.pujaName}</p>
            <p><strong>{t("billing.labelDate")}:</strong> {invoiceData.pujaDate || "-"}</p>
            <p><strong>{t("billing.labelPackage")}:</strong> {invoiceData.packageName} ({invoiceData.packagePrice})</p>
            {invoiceData.prasadam && invoiceData.prasadamAmount > 0 && (
              <p><strong>{t("billing.prasadam")}:</strong> ₹{invoiceData.prasadamAmount}</p>
            )}
            <p><strong>{t("billing.grandTotal")}:</strong> ₹{invoiceData.grandTotal}</p>
          </div>

          <div className="billing-invoice-section">
            <h3>{t("billing.devoteeDetails")}</h3>
            <p><strong>{t("billing.labelName")}:</strong> {invoiceData.devoteeDetails?.name || "-"}</p>
            <p><strong>{t("billing.labelPhone")}:</strong> {invoiceData.devoteeDetails?.phone || "-"}</p>
            <p><strong>{t("billing.email")}:</strong> {invoiceData.devoteeDetails?.email || "-"}</p>
          </div>

          <div className="billing-invoice-section billing-invoice-actions">
            <button
              type="button"
              className="billing-invoice-btn billing-invoice-btn-primary"
              onClick={handleDownloadInvoice}
            >
              {t("billing.downloadInvoice")}
            </button>
            <button
              type="button"
              className="billing-invoice-btn billing-invoice-btn-secondary"
              onClick={handleCloseInvoice}
            >
              {t("billing.close")}
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="billing-container">
      {/* LEFT IMAGE + MESSAGE */}
      <div className="billing-left">
        <div className="billing-left-inner">
          <div className="billing-left-image-wrap">
            <img
              src={image || "https://via.placeholder.com/600x800"}
              alt={displayPujaTitle}
            />
          </div>
          <div className="billing-left-message">
            <p className="billing-left-message-title">{t("billing.completeBookingTitle")}</p>
            <p className="billing-left-message-text">
              {t("billing.completeBookingText")}
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT CONTENT */}
      <div className="billing-right">
        <h2>{t("billing.details")}</h2>

        {/* SUMMARY */}
        {/* SUMMARY */}
        <div className="billing-summary">
          <h3>{displayPujaTitle}</h3>
          {isChadhavaFlow && selectedChadhava && (
            <div className="billing-selected-chadhava">
              <p>
                <b>{t("billing.selectedChadhava")}:</b> {translateCmsText(selectedChadhava.title, i18n.language) || displayPujaTitle}
              </p>
              {selectedChadhava.date && (
                <p>
                  <b>{t("billing.chadhavaDate")}:</b> {selectedChadhava.date}
                </p>
              )}
            </div>
          )}
          <p>
            <b>{isChadhavaFlow ? t("billing.labelType") : t("billing.labelPackage")}:</b>{" "}
            {isChadhavaFlow
              ? (translateCmsText(selectedChadhava?.title, i18n.language) || displayPujaTitle || selectedPackage?.name)
              : getPackageDisplayName(selectedPackage)}
          </p>
          <p>
            <b>{isChadhavaFlow ? t("billing.offeringsAmount") : t("billing.packageAmount")}:</b> {selectedPackage.price}
          </p>

          {/* Puja: choose add-ons on billing (quantities) */}
          {!isChadhavaFlow && puja?.addOns?.length > 0 && (
            <div className="billing-addons-picker">
              <h4 className="billing-addons-picker-title">{t("billing.addonsOptional")}</h4>
              <p className="billing-addons-picker-hint">
                {t("billing.addonsHint")}
              </p>
              <div className="billing-addons-picker-list">
                {puja.addOns.map((addon, index) => {
                  const addonId = addon.id || `addon-${index}`;
                  const qty = pujaAddonQuantities[addonId] || 0;
                  return (
                    <div key={addonId} className="billing-addon-row">
                      <div className="billing-addon-row-info">
                        <span className="billing-addon-name" title={getAddonDisplayName(addon, index)}>
                          {getAddonDisplayName(addon, index)}
                        </span>
                        <span className="billing-addon-unit">{addon.price}</span>
                      </div>
                      <div className="billing-addon-qty">
                        <button
                          type="button"
                          className="billing-qty-btn"
                          onClick={() => updatePujaAddonQuantity(addonId, -1)}
                          aria-label={t("billing.decreaseQuantity")}
                        >
                          −
                        </button>
                        <span className="billing-qty-val">{qty}</span>
                        <button
                          type="button"
                          className="billing-qty-btn"
                          onClick={() => updatePujaAddonQuantity(addonId, 1)}
                          aria-label={t("billing.increaseQuantity")}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ADDONS SUMMARY (selected lines) */}
          {resolvedAddons && resolvedAddons.length > 0 && (
            <div className="addons-summary">
              <h4>{t("billing.addonsWithCount", { n: resolvedAddons.length })}</h4>
              {resolvedAddons.map((addon, index) => (
                <div key={addon.id || index} className="addon-row">
                  <span>
                    {isChadhavaFlow
                      ? translateCmsText(addon.name, i18n.language)
                      : (addonDisplayNames.get(String(addon.id)) || addon.name)} × {addon.quantity} (₹{parseAmount(addon.price)})
                  </span>
                  {!isChadhavaFlow && (
                    <span className="addon-price">₹{addon.total}</span>
                  )}
                </div>
              ))}
              <div className="addons-total-row">
                <span className="addons-total-label">{t("billing.addonsTotal")}:</span>
                <span className="addons-total-price">₹{computedAddonsTotal}</span>
              </div>
            </div>
          )}

          {/* COUPON: user enters code; backend validates via validate-coupon API */}
          {hasCoupons && (
            <div className="billing-coupon-section">
              {!couponApplied ? (
                <>
                  <div className="billing-coupon-row">
                    <span className="billing-coupon-label">{t("billing.coupon")}:</span>
                    <input
                      type="text"
                      className="billing-coupon-input"
                      placeholder={t("billing.couponPlaceholder")}
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      disabled={couponLoading}
                    />
                    <button
                      type="button"
                      className="billing-coupon-apply-btn"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading}
                    >
                      {couponLoading ? t("billing.checking") : t("billing.apply")}
                    </button>
                  </div>
                  {couponError && (
                    <p className="billing-coupon-error">
                      {couponError.key ? t(couponError.key) : couponError.text}
                    </p>
                  )}
                </>
              ) : (
                <div className="discount-row billing-coupon-applied">
                  <span>{t("billing.couponApplied", { code: appliedCoupon?.code })}</span>
                  <span className="discount-price">- ₹{discountAmount}</span>
                  <button
                    type="button"
                    className="billing-coupon-remove"
                    onClick={handleRemoveCoupon}
                  >
                    {t("billing.remove")}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Prasadam: free for Puja, ₹250 add-on for Chadhava */}
          <label className="billing-prasadam-option">
            <input
              type="checkbox"
              checked={prasadam}
              disabled={isSpecialCouponApplied}
              onChange={(e) => setPrasadam(e.target.checked)}
            />
            <span>
              {isChadhavaFlow
                ? t("billing.prasadamPaid", { price: CHADHAVA_PRASADAM_PRICE })
                : t("billing.prasadamFree")}
            </span>
          </label>
          {isSpecialCouponApplied ? (
            <p className="billing-prasadam-note">
              {isChadhavaFlow
                ? t("billing.prasadamNotAvailable")
                : t("billing.prasadamNotFree")}
            </p>
          ) : null}

          {prasadamAmount > 0 && (
            <div className="addons-total-row">
              <span className="addons-total-label">{t("billing.prasadam")}:</span>
              <span className="addons-total-price">₹{prasadamAmount}</span>
            </div>
          )}

          {/* ✅ GRAND TOTAL */}
          <div className="grand-total-row">
            <span className="grand-total-label">{t("billing.grandTotal")}:</span>
            <span className="grand-total-price">₹{finalPayable}</span>
          </div>
        </div>

        {/* PARTICIPANTS */}
        <div className="participants-section">
          <h3>{t("billing.participantDetails")}</h3>

          {participants.map((p, index) => (
            <div key={index} className="participant-card">
              <h4>{t("billing.participantN", { n: index + 1 })}</h4>

              <input
                placeholder={t("billing.participantNamePlaceholder")}
                value={p.name}
                onChange={(e) =>
                  handleParticipantChange(index, "name", e.target.value)
                }
                required
              />
              <input
                placeholder={t("billing.gotra")}
                value={p.gotra}
                onChange={(e) =>
                  handleParticipantChange(index, "gotra", e.target.value)
                }
              />
            </div>
          ))}
        </div>

        {/* DEVOTEE FORM */}
        <div className="billing-form">
          <input
            name="name"
            placeholder={t("billing.name")}
            value={form.name}
            onChange={handleChange}
            style={{ display: "none" }}
            aria-hidden="true"
          />
          <input
            type="email"
            name="email"
            placeholder={t("billing.email")}
            value={form.email}
            onChange={handleChange}
          />
          <input
            type="tel"
            name="phone"
            placeholder={t("billing.phone")}
            value={form.phone}
            onChange={handleChange}
            maxLength={10}
            pattern="\d{10}"
          />
          <input
            name="streetAddress"
            placeholder={t("billing.address")}
            value={form.streetAddress}
            onChange={handleChange}
            required
          />
          <input
            name="city"
            placeholder={t("billing.city")}
            value={form.city}
            onChange={handleChange}
            required
          />
          <input
            name="state"
            placeholder={t("billing.state")}
            value={form.state}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="pincode"
            placeholder={t("billing.pincode")}
            value={form.pincode}
            onChange={handleChange}
            maxLength={6}
            pattern="\d{6}"
            required
          />
        </div>

        <button
          onClick={handlePayment}
          disabled={loading}
          className="pay-button pay-button-desktop"
        >
          {loading ? t("billing.processing") : t("billing.pay", { amount: finalPayable })}
        </button>
      </div>
    </div>

    {/* Mobile sticky bottom bar — white background, matches PujaDetail sticky CTA style */}
    <div className="billing-mobile-sticky-cta">
      <button
        onClick={handlePayment}
        disabled={loading}
        className="pay-button pay-button-mobile"
      >
        {loading ? t("billing.processing") : t("billing.pay", { amount: finalPayable })}
      </button>
    </div>

    <Footer />
  </>
  );
}

export default BillingPage;