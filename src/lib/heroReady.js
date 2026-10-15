/**
 * Resolves once the first home hero image has loaded (or failed, or there is no
 * hero image). Below-the-fold home images wait for it so they don't share the
 * connection with the hero on slow networks. Never holds anything back for
 * more than HERO_WAIT_MS (a safety net; normally the hero's load/error releases it).
 */
const HERO_WAIT_MS = 15000;

let resolveReady;
export const heroImageReady = new Promise((resolve) => {
  resolveReady = resolve;
});

export function markHeroImageReady() {
  resolveReady();
}

setTimeout(markHeroImageReady, HERO_WAIT_MS);
