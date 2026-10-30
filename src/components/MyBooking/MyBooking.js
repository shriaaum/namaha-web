import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import axiosInstance from "../../lib/instance";
import { payCartOrder, apiMessage } from "../../lib/cartPayment";
import { getRazorpayPublicKey } from "../../lib/razorpayConfig";
import { translateBookedText, translateCmsText } from "../../i18n/cmsText";
import { getDateLocale } from "../../i18n/content";
import { localizeApiError } from "../../i18n/apiErrors";
import { localizePackageName } from "../../i18n/packageNames";
import i18nInstance from "../../i18n";
import BookingDetailsModal from "../BookingDetailsModal/BookingDetailsModal";
import "./MyBooking.css";

function MyBookings() {
  const { t, i18n } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Payment retry: which booking is being paid, and the last outcome to show the user.
  const [retryingId, setRetryingId] = useState(null);
  const [notice, setNotice] = useState(null); // { type: "success" | "error", text }

  // `silent` refreshes the list in place (after a payment) without the full-page spinner.
  const fetchBookings = useCallback(async ({ silent } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      const response = await axiosInstance.get("/bookings/my-bookings", {
        params: {}
      });

      const data = response.data;
      const list = data?.bookings ?? data?.data ?? (Array.isArray(data) ? data : []);
      setBookings(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError(localizeApiError(err, tRef.current("myBookings.loadFailed"), tRef.current, i18nInstance.language));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Payment status shown to the user. Unpaid bookings must not look like an ordinary "Pending" booking.
  const getPaymentState = (b) => {
    const raw = String(b.paymentStatus || "").toLowerCase();
    if (raw === "success") return "success";
    if (raw === "failed") return "failed";
    if (raw === "refunded") return "refunded";
    return "pending";
  };

  // Mirrors the server rules: only unpaid, un-slotted (no pandit) bookings can be retried here.
  const canRetryPayment = (b) =>
    ["pending", "failed"].includes(getPaymentState(b)) &&
    ["pending", "initiated"].includes(b.status) &&
    !b.panditId &&
    !(b.slots && b.slots.length);

  const handleRetryPayment = async (booking) => {
    const bookingId = booking._id ?? booking.id;
    if (retryingId) return;
    setNotice(null);
    if (!getRazorpayPublicKey()) {
      setNotice({ type: "error", text: t("billing.errRazorpayKey") });
      return;
    }
    setRetryingId(bookingId);
    try {
      const res = await axiosInstance.post("/cart/retry", { bookingId });
      if (res.data?.alreadyPaid) {
        // Razorpay had already taken the money; the server just finalised the booking.
        setNotice({ type: "success", text: t("myBookings.paymentReceived") });
        await fetchBookings({ silent: true });
        setRetryingId(null);
        return;
      }
      await payCartOrder({
        order: res.data,
        prefill: {
          name: booking.devoteeDetails?.name || "",
          email: booking.devoteeDetails?.email || "",
          contact: booking.devoteeDetails?.phone || "",
        },
        description: getBookingDisplayData(booking).name,
        messages: {
          noKey: t("billing.errRazorpayKey"),
          failed: t("billing.paymentFailed"),
          syncing: t("cart.errSyncing"),
        },
        onPaid: () => {
          setNotice({ type: "success", text: t("myBookings.paymentReceived") });
          fetchBookings({ silent: true });
        },
        onError: (text) => setNotice({ type: "error", text }),
        onSettled: () => setRetryingId(null),
      });
    } catch (err) {
      setNotice({ type: "error", text: apiMessage(err, t("myBookings.retryFailed")) });
      setRetryingId(null);
    }
  };

  const handleViewBooking = (bookingId) => {
    setSelectedBookingId(bookingId);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedBookingId(null);
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      pending: "status-pending",
      panditAccepted: "status-accepted",
      inProgress: "status-ongoing",
      completed: "status-completed",
      expired: "status-expired",
      cancelled: "status-cancelled",
      panditRejected: "status-rejected"
    };
    return statusMap[status] || "status-default";
  };

  const getStatusText = (status) => {
    const keyMap = {
      pending: "myBookings.statusPending",
      panditAccepted: "myBookings.statusAccepted",
      inProgress: "myBookings.statusOngoing",
      completed: "myBookings.statusCompleted",
      expired: "myBookings.statusExpired",
      cancelled: "myBookings.statusCancelled",
      panditRejected: "myBookings.statusRejected",
    };
    return keyMap[status] ? t(keyMap[status]) : status;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    if (dateStr.includes("/")) {
      const [day, month, year] = dateStr.split("/");
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString(getDateLocale(i18n.language), {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString(getDateLocale(i18n.language), {
      ...(String(dateStr).includes("T") ? { timeZone: "Asia/Kolkata" } : {}),
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getBookingDisplayData = (b) => {
    const pooja = b.poojaId ?? b.pooja;
    const pujaObj = typeof pooja === "object" ? pooja : null;
    const selectedPkg = b.bookingSnapshot?.selectedPackage ?? b.selectedPackage ?? b.package;
    const category = pujaObj?.category;
    const categoryName = typeof category === "object" ? category?.category ?? category?.name : null;
    return {
      id: b._id ?? b.id,
      name: pujaObj?.title
        ? translateBookedText(pujaObj.title, pujaObj, "title", i18n.language)
        : pujaObj?.name
          ? translateBookedText(pujaObj.name, pujaObj, "name", i18n.language)
          : t("myBookings.fallbackTitle"),
      packageName: (selectedPkg?.name
        ? localizePackageName(selectedPkg.name, t, i18n.language, (name) => translateCmsText(name, i18n.language))
        : translateCmsText(categoryName, i18n.language)) ?? t("myBookings.notAvailable"),
      // Puja/chadhava date as booked (API snapshot), not `date`, which on older bookings is the day it was made.
      date: b.itemEventDate || b.eventDate || b.date,
      slotStart: b.slots?.[0]?.start,
      duration: b.duration ?? selectedPkg?.duration ?? "—",
      price: b.price ?? b.bookingSnapshot?.grandTotal ?? b.grandTotal ?? b.payment?.amount ?? 0,
      mode: b.mode ?? "online",
    };
  };

  if (loading) {
    return (
      <div className="bookings-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>{t("myBookings.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bookings-container">
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={fetchBookings}>{t("common.tryAgain")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bookings-container">
      <div className="bookings-header">
        <h1>{t("nav.myBookings")}</h1>
        <p className="bookings-count">
          {t("myBookings.count", { count: bookings.length })}
        </p>
      </div>

      {notice && (
        <div className={`payment-notice payment-notice--${notice.type}`} role="status">
          {notice.text}
        </div>
      )}

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <p>{t("myBookings.empty")}</p>
      ) : (
        <div className="bookings-grid">
          {bookings.map((booking) => {
            const d = getBookingDisplayData(booking);
            const payState = getPaymentState(booking);
            const unpaid = payState === "pending" || payState === "failed";
            return (
              <div key={d.id || booking._id} className="booking-card">
                {/* Unpaid bookings show their payment state instead of the booking status. */}
                <div className={`status-badge ${unpaid ? (payState === "failed" ? "status-expired" : "status-pending") : getStatusBadgeClass(booking.status)}`}>
                  {unpaid
                    ? t(payState === "failed" ? "myBookings.payBadgeFailed" : "myBookings.payBadgePending")
                    : getStatusText(booking.status)}
                </div>

                <div className="booking-content">
                  <h3 className="puja-name">{d.name}</h3>
                  <p className="puja-deity">{t("myBookings.packageLabel", { name: d.packageName })}</p>

                  <div className="booking-datetime">
                    <div className="datetime-item">
                      <span className="icon">📅</span>
                      <span>{formatDate(d.date)}</span>
                    </div>
                    {d.slotStart && (
                      <div className="datetime-item">
                        <span className="icon">🕐</span>
                        <span>{d.slotStart}</span>
                      </div>
                    )}
                    {d.duration && d.duration !== "—" && (
                      <div className="datetime-item">
                        <span className="icon">⏱️</span>
                        <span>{d.duration}</span>
                      </div>
                    )}
                  </div>

                  <div className={`mode-badge ${d.mode === "online" ? "mode-online" : "mode-offline"}`}>
                    {d.mode === "online" ? `🖥️ ${t("myBookings.modeOnline")}` : `📍 ${t("myBookings.modeOffline")}`}
                  </div>

                  <div className="booking-price">
                    ₹ {Number(d.price).toLocaleString("en-IN")}
                  </div>

                  <div className={`payment-pill payment-pill--${payState}`}>
                    {t("myBookings.paymentStatusLabel", {
                      status: t(
                        {
                          success: "myBookings.paymentSuccess",
                          pending: "myBookings.paymentPending",
                          failed: "myBookings.paymentFailed",
                          refunded: "myBookings.paymentRefunded",
                        }[payState]
                      ),
                    })}
                  </div>

                  {canRetryPayment(booking) && (
                    <button
                      className="retry-btn"
                      disabled={Boolean(retryingId)}
                      onClick={() => handleRetryPayment(booking)}
                    >
                      {retryingId === (booking._id ?? booking.id) ? t("myBookings.retrying") : t("myBookings.retryPayment")}
                    </button>
                  )}

                  <button
                    className="view-btn"
                    onClick={() => handleViewBooking(d.id || booking._id)}
                  >
                    {t("common.viewDetails")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <BookingDetailsModal
          bookingId={selectedBookingId}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default MyBookings;
