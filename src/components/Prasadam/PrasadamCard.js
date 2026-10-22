import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axiosInstance from "../../lib/instance";
import { localizeRecord } from "../../i18n/content";
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
  return localizeRecord(product, i18n.language);
}

/**
 * "Buy Prasadam" card shown on the home page and on puja / chadhava detail pages.
 * @param {"home"|"puja"|"chadhava"} source where the card is shown (stored with the order)
 */
export default function PrasadamCard({ source = "home" }) {
  const { t } = useTranslation();
  const product = usePrasadamProduct();
  if (!product || !product.isActive) return null;

  return (
    <section className={`prs-card-section prs-card-section--${source}`}>
      <div className="prs-card">
        <div className="prs-card-media">
          {product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" /> : <span aria-hidden="true">🍬</span>}
        </div>
        <div className="prs-card-body">
          <h3>{product.name}</h3>
          <p className="prs-card-desc">{product.description}</p>
          <div className="prs-card-foot">
            <span className="prs-card-price">₹{product.price}</span>
            <Link className="prs-card-btn" to={`/prasadam?from=${source}`}>
              {t("prasadamShop.buyNow")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
