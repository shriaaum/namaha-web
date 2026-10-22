import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import axiosInstance from "../../lib/instance";
import { translateBookedText, translateCmsText } from "../../i18n/cmsText";
import { getDateLocale } from "../../i18n/content";
import "./BookingDetailsModal.css";

const STATUS_KEYS = {
  pending: "myBookings.statusPending",
  panditAccepted: "myBookings.statusAccepted",
  inProgress: "myBookings.statusOngoing",
  completed: "myBookings.statusCompleted",
  expired: "myBookings.statusExpired",
  cancelled: "myBookings.statusCancelled",
  panditRejected: "myBookings.statusRejected",
};
const PAYMENT_STATUS_KEYS = {
  success: "myBookings.paymentSuccess",
  paid: "myBookings.paymentSuccess",
  captured: "myBookings.paymentSuccess",
  pending: "myBookings.paymentPending",
  failed: "myBookings.paymentFailed",
};
const MODE_KEYS = { online: "myBookings.modeOnline", offline: "myBookings.modeOffline", hybrid: "myBookings.modeHybrid" };

function BookingDetailsModal({ bookingId, onClose }) {
  const { t, i18n } = useTranslation();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoiceUrl, setInvoiceUrl] = useState(null);

  const fetchBookingDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get(`/bookings/booking-details/${bookingId}`);

      const apiBooking = response.data.booking;
      const apiDetails = response.data.bookingDetails;
      const details = apiDetails || apiBooking || response.data;

      setBooking(details);
      setInvoiceUrl(
        apiBooking?.invoicePdfUrl ||
          apiDetails?.invoicePdfUrl ||
          details?.invoicePdfUrl ||
          null
      );
    } catch (err) {
      console.error("Error fetching booking details:", err);
      setError(err.response?.data?.message || t("myBookings.detailsLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [bookingId, t]);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId, fetchBookingDetails]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const parts = dateStr.split("/");
    if (parts.length !== 3) return dateStr;
    const [day, month, year] = parts;
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString(getDateLocale(i18n.language), {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "#ffc107",
      panditAccepted: "#17a2b8",
      inProgress: "#28a745",
      completed: "#28a745",
      expired: "#dc3545",
      cancelled: "#6c757d",
      panditRejected: "#dc3545"
    };
    return colors[status] || "#6c757d";
  };

  // Close modal on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Close modal on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target.className === "modal-backdrop") {
      onClose();
    }
  };

  if (!bookingId) return null;

  const normalizedStatus = STATUS_KEYS[booking?.status]
    ? t(STATUS_KEYS[booking.status])
    : booking?.status?.charAt(0).toUpperCase() + booking?.status?.slice(1) || "";
  const linkedPooja = booking?.poojaId && typeof booking.poojaId === "object" ? booking.poojaId : booking?.pooja;
  const translateText = (english, field = "name") => translateBookedText(english, linkedPooja, field, i18n.language);
  const modeText = (mode) => (MODE_KEYS[mode] ? t(MODE_KEYS[mode]) : mode);

  const displayOrderId =
    booking?.razorpayOrderId ||
    booking?.payment?.orderId ||
    booking?.payment?.order_id ||
    "-";

  const displayPaymentId =
    booking?.razorpayPaymentId ||
    booking?.payment?.transactionId ||
    booking?.payment?.paymentId ||
    "-";

  const rawPaymentStatus = booking?.paymentStatus || booking?.payment?.status || "-";
  const displayPaymentStatus = PAYMENT_STATUS_KEYS[String(rawPaymentStatus).toLowerCase()]
    ? t(PAYMENT_STATUS_KEYS[String(rawPaymentStatus).toLowerCase()])
    : rawPaymentStatus;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        {/* Close Button */}
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        {loading ? (
          <div className="modal-loading">
            <div className="spinner"></div>
            <p>{t("myBookings.detailsLoading")}</p>
          </div>
        ) : error ? (
          <div className="modal-error">
            <p>❌ {error}</p>
            <button onClick={fetchBookingDetails}>{t("common.retry")}</button>
          </div>
        ) : booking ? (
          <div className="modal-body">
            {/* Header */}
            <div className="modal-header">
              <h2>
                {translateText(booking.bookingSnapshot?.puja?.title) ||
                  translateText(booking.pooja?.name) ||
                  translateText(booking.pooja?.title, "title") ||
                  t("myBookings.fallbackTitle")}
              </h2>
              <span 
                className="modal-status-badge"
                style={{ backgroundColor: getStatusColor(booking.status) }}
              >
                {normalizedStatus}
              </span>
            </div>

            {/* Booking ID */}
            {/* <div className="booking-id">
              <span>Booking ID:</span>
              <code>{booking.bookingId}</code>
            </div> */}

            {/* Main Info Grid */}
            <div className="info-grid">
              {/* Puja & Date */}
              <div className="info-card">
                <h3>📅 {t("myBookings.pujaAndDate")}</h3>
                <p className="info-value">{formatDate(booking.date)}</p>
                <p className="info-label">
                  {translateText(booking.bookingSnapshot?.puja?.templeName, "templeName") ||
                    booking.bookingSnapshot?.puja?.location}
                </p>
                <p className="info-label">
                  {t("myBookings.modeLabel", {
                    mode: modeText(booking.bookingSnapshot?.puja?.mode || booking.pooja?.mode) || "-",
                  })}
                </p>
              </div>

              {/* Package Details */}
              <div className="info-card">
                <h3>📦 {t("myBookings.packageTitle")}</h3>
                <p className="info-value">
                  {translateCmsText(booking.bookingSnapshot?.selectedPackage?.name, i18n.language) || "-"}
                </p>
                <p className="info-label">
                  {t("myBookings.priceLabel", {
                    amount: booking.bookingSnapshot?.selectedPackage?.price ?? booking.price,
                  })}
                </p>
                {booking.bookingSnapshot?.selectedPackage?.persons && (
                  <p className="info-label">
                    {t("myBookings.personsLabel", { n: booking.bookingSnapshot.selectedPackage.persons })}
                  </p>
                )}
              </div>

              {/* Price & Payment Status */}
              <div className="info-card">
                <h3>💰 {t("myBookings.priceTitle")}</h3>
                <p className="info-value">
                  ₹
                  {(booking.bookingSnapshot?.grandTotal ?? booking.price)?.toLocaleString(
                    "en-IN"
                  )}
                </p>
                <p className="info-label">
                  {t("myBookings.paymentStatusLabel", { status: displayPaymentStatus })}
                </p>
              </div>

              {/* Payment Details */}
              <div className="info-card">
                <h3>💳 {t("myBookings.paymentTitle")}</h3>
                <p className="info-label">
                  {t("myBookings.orderIdLabel", { id: displayOrderId })}
                </p>
                <p className="info-label">
                  {t("myBookings.paymentIdLabel", { id: displayPaymentId })}
                </p>
                <p className="info-label">
                  {t("myBookings.statusLabel", { status: displayPaymentStatus })}
                </p>
                {invoiceUrl && (
                  <p className="info-label">
                    <a
                      href={invoiceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("myBookings.viewInvoice")}
                    </a>
                  </p>
                )}
              </div>
            </div>

            {/* Devotee Details */}
            {booking.devoteeDetails && (
              <div className="section-card">
                <h3>👥 {t("myBookings.devoteeDetails")}</h3>
                <div className="detail-row">
                  <span>{t("myBookings.nameLabel")}</span>
                  <span>{booking.devoteeDetails.name}</span>
                </div>
                <div className="detail-row">
                  <span>{t("myBookings.mobileLabel")}</span>
                  <span>{booking.devoteeDetails.phone}</span>
                </div>
                {booking.devoteeDetails.email && (
                  <div className="detail-row">
                    <span>{t("myBookings.emailLabel")}</span>
                    <span>{booking.devoteeDetails.email}</span>
                  </div>
                )}
                {booking.devoteeDetails.gotra && (
                  <div className="detail-row">
                    <span>{t("myBookings.gotraLabel")}</span>
                    <span>{booking.devoteeDetails.gotra}</span>
                  </div>
                )}
                {booking.devoteeDetails.address && (
                  <div className="detail-row">
                    <span>{t("myBookings.addressLabel")}</span>
                    <span>{booking.devoteeDetails.address}</span>
                  </div>
                )}
              </div>
            )}

            {/* Participant Details */}
            {booking.participants && booking.participants.length > 0 && (
              <div className="section-card">
                <h3>🧑‍🤝‍🧑 {t("myBookings.participantDetails")}</h3>
                {booking.participants.map((p, index) => (
                  <div key={p._id || index} className="detail-row">
                    <span>
                      {index + 1}. {p.name || "-"}
                    </span>
                    <span>
                      {p.nakshatra && `${t("myBookings.nakshatraValue", { value: p.nakshatra })} `}
                      {p.gotra && `| ${t("myBookings.gotraValue", { value: p.gotra })}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Puja Details */}
            {booking.bookingSnapshot?.puja && (
              <div className="section-card">
                <h3>🕉️ {t("myBookings.pujaDetails")}</h3>
                <div className="detail-row">
                  <span>{t("myBookings.templeLabel")}</span>
                  <span>{translateText(booking.bookingSnapshot.puja.templeName, "templeName")}</span>
                </div>
                <div className="detail-row">
                  <span>{t("myBookings.dateLabel")}</span>
                  <span>{booking.bookingSnapshot.puja.date}</span>
                </div>
                <div className="detail-row">
                  <span>{t("myBookings.durationLabel")}</span>
                  <span>{booking.bookingSnapshot.puja.duration}</span>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="timestamps">
              <p>{t("myBookings.createdLabel", { date: new Date(booking.createdAt).toLocaleString(getDateLocale(i18n.language)) })}</p>
              <p>{t("myBookings.updatedLabel", { date: new Date(booking.updatedAt).toLocaleString(getDateLocale(i18n.language)) })}</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default BookingDetailsModal;