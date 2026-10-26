import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./CartPage.css";

/** Brief confirmation shown after "Add to cart"; hides itself. */
function CartAddedToast({ show, message, onClose }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!show) return undefined;
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [show, onClose]);

  if (!show) return null;
  return (
    <div className="cart-toast" role="status">
      <span>{message || t("cart.added", "Added to cart")}</span>
      <Link to="/cart">{t("cart.viewCart", "View cart")}</Link>
    </div>
  );
}

export default CartAddedToast;
