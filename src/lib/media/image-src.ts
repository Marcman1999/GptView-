/**
 * Decides which image and SVG sources the reader may load. Anything else is shown as
 * an honest placeholder. Images are never fetched by the server; the browser loads only
 * embedded data images or https images from known ChatGPT image hosts.
 */

/** Largest embedded image accepted (characters of base64 text, roughly 3 MB of bytes). */
export const MAX_IMAGE_CHARS = 4_000_000;
/** Largest inline SVG accepted as a visual. */
export const MAX_SVG_CHARS = 200_000;

const DATA_IMAGE = /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+=*$/i;
const ALLOWED_IMAGE_HOST =
  /(^|\.)(chatgpt\.com|oaiusercontent\.com|openai\.com)$/i;

export function resolveImageSrc(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (value === "" || value.length > MAX_IMAGE_CHARS) return null;
  if (DATA_IMAGE.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  if (!ALLOWED_IMAGE_HOST.test(url.hostname)) return null;
  // SVG from remote hosts is not loaded; inline SVG is handled by svgDataUrl.
  if (/\.svg$/i.test(url.pathname)) return null;
  return url.href;
}

/** Turns an SVG document into an image data URL. Scripts and external references do not run in <img>. */
export function svgDataUrl(source: string): string | null {
  const svg = source.trim();
  if (svg === "" || svg.length > MAX_SVG_CHARS) return null;
  if (!/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(svg))
    return null;

  const bytes = new TextEncoder().encode(svg);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}
