import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axiosInstance from "../../lib/instance";
import { localizeRecord } from "../../i18n/content";
import { translateCmsText } from "../../i18n/cmsText";
import "./Prasadam.css";

let productCache = null;

/** Fetches the standalone Prasadam product once per page load (shared by every card). */
export function usePrasadamProduct() {
  const { i18n } = useTranslation();
  const [product, setProduct] = useState(productCache);
  useEffect(() => {
    if (productCache) return;
    let cancelled = false;
    axiosInstance
      .get("/prasadam/product")
      .then((res) => {
        productCache = res.data?.product || null;
        if (!cancelled) setProduct(productCache);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return withDisplayText(product, i18n.language);
}

/**
 * `name`/`description` stay as stored (English): the name is sent to Razorpay.
 * Screen text uses `displayName`/`displayDescription`: CMS translations first,
 * then the reviewed dictionary, then English.
 */
export function withDisplayText(product, language) {
  if (!product) return product;
  const localized = localizeRecord(product, language) || product;
  const display = (english, translated) => (translated && translated !== english ? translated : translateCmsText(english, language));
  return {
    ...product,
    displayName: display(product.name, localized.name),
    displayDescription: display(product.description, localized.description),
  };
}

/**
 * "Buy Prasadam" card shown on the home page and on puja / chadhava detail pages.
 * @param {"home"|"puja"|"chadhava"} source where the card is shown (stored with the order)
 * @param {boolean} isSelected whether the prasadam is currently added to the page's cart
 * @param {() => void} onToggle called when clicking buy/remove in in-page cart mode
 * @param {boolean} disabled whether adding is blocked
 */
export default function PrasadamCard({
  source = "home",
  isSelected = false,
  onToggle,
  disabled = false,
}) {
  const { t } = useTranslation();
  const product = usePrasadamProduct();
  if (!product || !product.isActive) return null;

  const isInPageCart = source === "chadhava" || typeof onToggle === "function";

  return (
    <section className={`prs-card-section prs-card-section--${source}`}>
      <div className={`prs-card ${isSelected ? "prs-card--selected" : ""}`}>
        <div className="prs-card-media">
          {product.imageUrl ? <img src={product.imageUrl} alt={product.displayName} loading="lazy" /> : <span aria-hidden="true">🍬</span>}
        </div>
        <div className="prs-card-body">
          <h3>{product.displayName}</h3>
          <p className="prs-card-desc">{product.displayDescription}</p>
          <div className="prs-card-foot">
            <div className="prs-card-pricing">
              <span className="prs-card-price">₹{product.price}</span>
              {isSelected && (
                <span className="prs-card-badge">✓ {t("common.added", "Added")}</span>
              )}
            </div>
            {isInPageCart ? (
              <button
                type="button"
                className={`prs-card-btn ${isSelected ? "prs-card-btn--selected" : ""}`}
                disabled={disabled}
                onClick={onToggle}
              >
                {isSelected ? t("billing.remove", "Remove") : t("prasadamShop.buyNow")}
              </button>
            ) : (
              <Link className="prs-card-btn" to={`/prasadam?from=${source}`}>
                {t("prasadamShop.buyNow")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
