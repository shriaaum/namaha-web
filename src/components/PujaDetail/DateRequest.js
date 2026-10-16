import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import axiosInstance from "../../lib/instance";
import "./DateRequest.css";

const pad = (n) => String(n).padStart(2, "0");
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * "Request a preferred date" button + modal. The puja date itself stays fixed;
 * this only records the customer's request so the admin can follow up (Admin → Follow Ups).
 */
export default function DateRequest({ puja }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const openModal = () => {
    let u = {};
    try {
      u = JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      u = {};
    }
    setName((n) => n || u.name || u.fullName || "");
    setPhone((p) => p || String(u.phone || u.mobile || "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""));
    setError("");
    setSuccess(false);
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const p = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    if (name.trim().length < 2 || !/^[6-9]\d{9}$/.test(p)) return setError(t("dateRequest.validation"));
    if (!date || date < todayStr()) return setError(t("dateRequest.dateInvalid"));
    setLoading(true);
    setError("");
    try {
      await axiosInstance.post("/leads/date-request", {
        name: name.trim(),
        phone: p,
        preferredDate: date,
        note: note.trim(),
        poojaId: puja?._id || puja?.id,
        itemTitle: puja?.name || puja?.title,
        pageUrl: window.location.href,
        language: i18n.language,
      });
      setSuccess(true);
      setDate("");
      setNote("");
    } catch {
      setError(t("dateRequest.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button type="button" className="dr-trigger" onClick={openModal}>
        📅 {t("dateRequest.button")}
      </button>
      {open && (
        <div className="dr-overlay" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <form className="dr-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-label={t("dateRequest.title")}>
            <button type="button" className="dr-close" onClick={() => setOpen(false)} aria-label={t("dateRequest.close")}>
              ×
            </button>
            {success ? (
              <p className="dr-success">{t("dateRequest.success")}</p>
            ) : (
              <>
                <h2>{t("dateRequest.title")}</h2>
                <p className="dr-hint">{t("dateRequest.hint", { date: puja?.displayDate || puja?.date || "" })}</p>
                <label>
                  {t("dateRequest.name")}
                  <input value={name} onChange={(e) => setName(e.target.value)} maxLength="50" required />
                </label>
                <label>
                  {t("dateRequest.mobile")}
                  <div className="dr-phone">
                    <span>+91</span>
                    <input
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                      maxLength="10"
                      required
                    />
                  </div>
                </label>
                <label>
                  {t("dateRequest.preferredDate")}
                  <input type="date" value={date} min={todayStr()} onChange={(e) => setDate(e.target.value)} required />
                </label>
                <label>
                  {t("dateRequest.note")}
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength="500" rows="3" />
                </label>
                {error && <small className="dr-error">{error}</small>}
                <button className="dr-submit" disabled={loading}>
                  {loading ? t("dateRequest.loading") : t("dateRequest.submit")}
                </button>
              </>
            )}
          </form>
        </div>
      )}
    </>
  );
}
