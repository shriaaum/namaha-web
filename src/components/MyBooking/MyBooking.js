import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import axiosInstance from "../../lib/instance";
import { translateBookedText, translateCmsText } from "../../i18n/cmsText";
import { getDateLocale } from "../../i18n/content";
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

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.get("/bookings/my-bookings", {
        params: {}
      });

      const data = response.data;
      const list = data?.bookings ?? data?.data ?? (Array.isArray(data) ? data : []);
      setBookings(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError(err.response?.data?.message || tRef.current("myBookings.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

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
      packageName: translateCmsText(selectedPkg?.name ?? categoryName, i18n.language) ?? t("myBookings.notAvailable"),
      date: b.date,
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

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <p>{t("myBookings.empty")}</p>
      ) : (
        <div className="bookings-grid">
          {bookings.map((booking) => {
            const d = getBookingDisplayData(booking);
            return (
              <div key={d.id || booking._id} className="booking-card">
                <div className={`status-badge ${getStatusBadgeClass(booking.status)}`}>
                  {getStatusText(booking.status)}
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
