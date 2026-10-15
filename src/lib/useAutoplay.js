import { useEffect, useRef } from "react";

/**
 * Calls `onTick` every `intervalMs` while the element in `ref` is on screen and
 * the tab is visible. The first tick waits `startDelayMs` (defaults to the interval).
 * Pass `enabled = false` to stop it entirely.
 */
export function useAutoplay(ref, onTick, intervalMs, { enabled = true, startDelayMs } = {}) {
  const tickRef = useRef(onTick);
  tickRef.current = onTick;

  useEffect(() => {
    if (!enabled) return undefined;
    const el = ref.current;
    let onScreen = true;
    let timer = null;
    let started = false;

    const stop = () => {
      clearTimeout(timer);
      timer = null;
    };
    const schedule = () => {
      stop();
      if (!onScreen || document.visibilityState === "hidden") return;
      const delay = started ? intervalMs : startDelayMs ?? intervalMs;
      timer = setTimeout(() => {
        started = true;
        tickRef.current();
        schedule();
      }, delay);
    };

    const onVisibility = () => schedule();
    document.addEventListener("visibilitychange", onVisibility);

    let observer = null;
    if (el && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        schedule();
      });
      observer.observe(el);
    }

    schedule();
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      observer?.disconnect();
    };
  }, [ref, intervalMs, enabled, startDelayMs]);
}
