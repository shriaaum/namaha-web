import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import axiosInstance from "../../lib/instance";
import "./Prasadam.css";

const fmt = (d, locale) =>
  d ? new Date(d).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "";

/** Public order tracking: order reference + phone -> Delhivery status and scan timeline. */
export default function TrackOrder() {
  const { t, i18n } = useTranslation();
  const [waybill, setWaybill] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    const awb = waybill.trim();
    if (!/^[A-Za-z0-9-]{6,30}$/.test(awb)) return setError(t("trackOrder.errWaybill"));
    setLoading(true);
    try {
      const res = await axiosInstance.post("/prasadam/orders/track", { waybill: awb });
      setResult(res.data);
    } catch (err) {
      setError(err?.response?.status === 404 ? t("trackOrder.notFound") : t("trackOrder.errGeneric"));
    } finally {
      setLoading(false);
    }
  };

  const o = result?.order;
  const tr = result?.tracking;
  const locale = i18n.language;

  return (
    <div className="prs-page">
      <div className="prs-box">
        <h1>{t("trackOrder.title")}</h1>
        <p className="prs-muted">{t("trackOrder.subtitle")}</p>

        <form onSubmit={submit}>
          <input
            name="waybill"
            placeholder={t("trackOrder.waybill")}
            value={waybill}
            onChange={(e) => setWaybill(e.target.value.replace(/\s/g, "").slice(0, 30))}
            autoComplete="off"
            required
          />
          {error && <p className="prs-error">{error}</p>}
          <button className="prs-pay" disabled={loading}>
            {loading ? t("trackOrder.checking") : t("trackOrder.track")}
          </button>
        </form>

        {result && (
          <div className="trk-result">
            {o && (
              <>
                <h3>{o.itemName} × {o.quantity}</h3>
                <p className="prs-muted">
                  {t("trackOrder.orderedOn")}: {fmt(o.orderedAt, locale)}
                </p>
              </>
            )}
            <p className="trk-status">
              {[o && t(`trackOrder.status.${o.status}`, { defaultValue: o.status }), tr?.status].filter(Boolean).join(" · ")}
            </p>
            <p className="prs-muted">
              {o?.courier || "Delhivery"}: {o?.waybill || waybill}
            </p>
            {tr?.statusLocation && <p className="prs-muted">{tr.statusLocation}</p>}
            {tr?.expectedDeliveryDate && !o?.deliveredAt && tr.status !== "Delivered" && (
              <p className="prs-muted">
                {t("trackOrder.expected")}: {fmt(tr.expectedDeliveryDate, locale)}
              </p>
            )}
            {(o?.deliveredAt || tr?.status === "Delivered") && (
              <p className="prs-muted">
                {t("trackOrder.deliveredOn")}: {fmt(o?.deliveredAt || tr.statusDateTime, locale)}
              </p>
            )}
            {result.trackingUnavailable && <p className="prs-muted">{t("trackOrder.unavailable")}</p>}

            {tr?.scans?.length > 0 && (
              <ol className="trk-timeline">
                {tr.scans.map((s, i) => (
                  <li key={i}>
                    <b>{s.status}</b>
                    <span>{[s.instructions, s.location].filter(Boolean).join(" · ")}</span>
                    <small>{fmt(s.dateTime, locale)}</small>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
