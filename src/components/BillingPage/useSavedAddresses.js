import { useCallback, useEffect, useState } from "react";
import axiosInstance from "../../lib/instance";

const sameAddress = (a, f) =>
  String(a.streetAddress || "").trim().toLowerCase() === String(f.streetAddress || "").trim().toLowerCase() &&
  String(a.pincode || "") === String(f.pincode || "");

/**
 * Address book for the logged-in devotee. Loads saved addresses, lets the billing form
 * pick one, and saves a newly typed address for next time.
 *
 * @param {boolean} enabled   only fetch when the user is logged in and needs an address
 * @param {object}  form      current billing form values
 * @param {function} onFill   called with an address to prefill the billing form
 */
export default function useSavedAddresses({ enabled, form, onFill }) {
  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [saveForLater, setSaveForLater] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || loaded) return;
    let cancelled = false;
    axiosInstance
      .get("/auth/addresses")
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.addresses || [];
        setAddresses(list);
        setLoaded(true);
        // Prefill the default address only when the form has no address typed yet.
        if (list.length && !String(form.streetAddress || "").trim()) {
          const def = list.find((a) => a.isDefault) || list[0];
          setSelectedId(def._id);
          onFill(def);
        }
      })
      .catch(() => setLoaded(true)); // address book is a convenience; never block billing
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, loaded]);

  const select = useCallback(
    (addr) => {
      setSelectedId(addr._id);
      onFill(addr);
    },
    [onFill]
  );

  const startNew = useCallback(() => {
    setSelectedId(null);
    onFill({ streetAddress: "", city: "", state: "", pincode: "" });
  }, [onFill]);

  const remove = useCallback(async (id) => {
    try {
      const res = await axiosInstance.delete(`/auth/addresses/${id}`);
      setAddresses(res.data?.addresses || []);
      setSelectedId((cur) => (cur === id ? null : cur));
    } catch {
      /* ignore */
    }
  }, []);

  const makeDefault = useCallback(async (id) => {
    try {
      const res = await axiosInstance.patch(`/auth/addresses/${id}/default`);
      setAddresses(res.data?.addresses || []);
    } catch {
      /* ignore */
    }
  }, []);

  /** Call once the typed address has passed validation and payment is starting. */
  const saveCurrent = useCallback(async () => {
    if (!enabled || !saveForLater || selectedId) return;
    if (addresses.some((a) => sameAddress(a, form))) return;
    try {
      const res = await axiosInstance.post("/auth/addresses", {
        streetAddress: form.streetAddress,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
      });
      setAddresses(res.data?.addresses || []);
    } catch {
      /* saving is best-effort; do not block payment */
    }
  }, [enabled, saveForLater, selectedId, addresses, form]);

  return {
    addresses,
    selectedId,
    clearSelection: () => setSelectedId(null),
    select,
    startNew,
    remove,
    makeDefault,
    saveForLater,
    setSaveForLater,
    saveCurrent,
  };
}
