import { useCallback, useEffect, useState } from "react";

/**
 * Unified cart (puja + chadhava), kept in localStorage so guests can use it too.
 * It stores only WHAT was picked (ids + quantities) plus a title/image for instant display.
 * Prices are never stored: /cart/quote re-prices every line on the server.
 *
 * Line shape: { key, type: "puja"|"chadhava", itemId, packageId?, addons: [{id, quantity}],
 *               couponCode?, title, image }
 */
const STORAGE_KEY = "shriaaum.cart.v1";
const CHANGE_EVENT = "shriaaum:cart-changed";
export const MAX_CART_LINES = 10;

const readCart = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((l) => l && l.key && l.type && l.itemId) : [];
  } catch {
    return [];
  }
};

const writeCart = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable (private mode / quota): the cart simply won't persist */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const cartLineKey = (type, itemId, packageId) =>
  type === "puja" ? `puja:${itemId}:${packageId}` : `chadhava:${itemId}`;

/** Adds or replaces a line (same puja+package or same chadhava is one line). Returns false when the cart is full. */
export const addToCart = (line) => {
  const items = readCart();
  const key = cartLineKey(line.type, line.itemId, line.packageId);
  const next = { ...line, key };
  const index = items.findIndex((l) => l.key === key);
  if (index >= 0) items[index] = { ...items[index], ...next };
  else if (items.length >= MAX_CART_LINES) return false;
  else items.push(next);
  writeCart(items);
  return true;
};

export const removeFromCart = (key) => writeCart(readCart().filter((l) => l.key !== key));

export const updateCartLine = (key, patch) =>
  writeCart(readCart().map((l) => (l.key === key ? { ...l, ...patch } : l)));

export const clearCart = () => writeCart([]);

export const useCart = () => {
  const [items, setItems] = useState(readCart);

  useEffect(() => {
    const sync = () => setItems(readCart());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync); // other tabs
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const remove = useCallback((key) => removeFromCart(key), []);
  const update = useCallback((key, patch) => updateCartLine(key, patch), []);
  const clear = useCallback(() => clearCart(), []);

  return { items, count: items.length, remove, update, clear };
};
