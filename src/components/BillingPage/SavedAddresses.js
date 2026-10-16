import React from "react";
import { useTranslation } from "react-i18next";
import "./SavedAddresses.css";

/** Saved-address picker shown above the delivery address fields on the billing page. */
export default function SavedAddresses({ book }) {
  const { t } = useTranslation();
  if (!book.addresses.length) return null;

  return (
    <div className="sa-wrap">
      <p className="sa-title">{t("savedAddress.title")}</p>
      <div className="sa-list">
        {book.addresses.map((a) => (
          <div key={a._id} className={`sa-card ${book.selectedId === a._id ? "sa-card--active" : ""}`}>
            <button type="button" className="sa-pick" onClick={() => book.select(a)}>
              <span className="sa-radio" aria-hidden="true" />
              <span className="sa-text">
                {a.isDefault && <em className="sa-badge">{t("savedAddress.default")}</em>}
                <strong>{a.streetAddress}</strong>
                <span>
                  {[a.city, a.state, a.pincode].filter(Boolean).join(", ")}
                </span>
              </span>
            </button>
            <div className="sa-actions">
              {!a.isDefault && (
                <button type="button" onClick={() => book.makeDefault(a._id)}>
                  {t("savedAddress.makeDefault")}
                </button>
              )}
              <button type="button" onClick={() => book.remove(a._id)}>
                {t("savedAddress.delete")}
              </button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="sa-new" onClick={book.startNew}>
        + {t("savedAddress.addNew")}
      </button>
    </div>
  );
}
