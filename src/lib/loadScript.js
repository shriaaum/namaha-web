const cache = new Map();

/** Inject a <script> once and resolve when it has loaded. Failed loads can be retried. */
export function loadScript(src) {
  if (cache.has(src)) return cache.get(src);
  const promise = new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => {
      cache.delete(src);
      el.remove();
      reject(new Error(`Failed to load ${src}`));
    };
    document.body.appendChild(el);
  });
  cache.set(src, promise);
  return promise;
}
