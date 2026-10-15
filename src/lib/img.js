/**
 * Right-sized remote images.
 *
 * - Cloudinary URLs get an on-the-fly `f_auto,q_auto,w_<width>` transformation.
 * - S3 URLs use the WebP variants the API generates at upload time
 *   (`variants: { "400": url, "640": url, ... }`), when the record has them.
 * - Anything else falls back to the original URL.
 */

const CLOUDINARY_UPLOAD = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/;

const isCloudinary = (url) => CLOUDINARY_UPLOAD.test(url);

const cloudinaryAt = (url, width) =>
  url.replace(CLOUDINARY_UPLOAD, (_, base, rest) => `${base}f_auto,q_auto,c_limit,w_${width}/${rest}`);

// Widths the API generates (namaha-api src/utils/imageVariants.js), never upscaled.
const VARIANT_STEPS = [400, 640, 960, 1280];

const variantWidths = (variants) =>
  variants && typeof variants === "object"
    ? Object.keys(variants)
        .map(Number)
        .filter((w) => Number.isFinite(w) && variants[w])
        .sort((a, b) => a - b)
    : [];

/** Smallest variant ≥ width, else the largest one available. */
const pickVariant = (variants, width) => {
  const widths = variantWidths(variants);
  if (!widths.length) return null;
  const w = widths.find((x) => x >= width) ?? widths[widths.length - 1];
  return variants[w];
};

/** URL of `url` resized to roughly `width` CSS-pixel-independent px. */
export function optimizedImage(url, width, variants) {
  if (!url || typeof url !== "string") return url || "";
  if (isCloudinary(url)) return cloudinaryAt(url, width);
  return pickVariant(variants, width) || url;
}

/**
 * `srcSet` string for the given candidate widths, or undefined when the image
 * can't be resized (so the browser just uses `src`).
 */
export function optimizedSrcSet(url, widths, variants) {
  if (!url || typeof url !== "string") return undefined;
  if (isCloudinary(url)) return widths.map((w) => `${cloudinaryAt(url, w)} ${w}w`).join(", ");
  const available = variantWidths(variants);
  if (!available.length) return undefined;
  // Use the real variant widths so the browser's choice is accurate.
  const candidates = available.map((w) => `${variants[w]} ${w}w`);
  // Variants stop below the next step only when the original is narrower than that
  // step, so the original is then a small, full-quality candidate for high-density
  // screens (no sharpness lost versus serving the original).
  const next = VARIANT_STEPS.find((w) => w > available[available.length - 1]);
  if (next) candidates.push(`${url} ${next}w`);
  return candidates.join(", ");
}

// Puja / Chadhava card banners: 1 column on phones, 2 on tablets, 4 on desktop.
const CARD_SIZES = "(max-width: 600px) 92vw, (max-width: 1024px) 46vw, 25vw";

/** src/srcSet/sizes for a 2:1 card banner (spread onto the <img>). */
export function cardImageProps(url, variants) {
  return {
    src: optimizedImage(url, 400, variants),
    srcSet: optimizedSrcSet(url, [400, 800], variants),
    sizes: CARD_SIZES,
  };
}
