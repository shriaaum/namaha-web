import axiosInstance from "./instance";

/**
 * Critical-path data requested before React renders, so the hero banner
 * request overlaps with JS download/parse instead of waiting for Home to mount.
 *
 * public/index.html starts the request during HTML parsing
 * (`window.__heroBannerPrefetch`); if that didn't happen, start it here at
 * module load. Each promise is consumed once; later mounts (e.g. navigating
 * back to "/") refetch normally.
 */
const fromHtml = typeof window !== "undefined" ? window.__heroBannerPrefetch : null;

let heroBannerPromise =
  fromHtml ||
  (typeof window !== "undefined" && window.location.pathname === "/"
    ? axiosInstance.get("/hero-banner").then((res) => res?.data)
    : null);

if (heroBannerPromise) {
  // If the early request fails, fall back to a normal axios request.
  heroBannerPromise = heroBannerPromise.catch(() =>
    axiosInstance.get("/hero-banner").then((res) => res?.data)
  );
  // Avoid an "unhandled rejection" warning if Home never consumes it.
  heroBannerPromise.catch(() => {});
}

export function takeHeroBannerPrefetch() {
  const p = heroBannerPromise;
  heroBannerPromise = null;
  if (typeof window !== "undefined") window.__heroBannerPrefetch = null;
  return p;
}
