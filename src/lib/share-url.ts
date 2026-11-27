/**
 * Validation for public ChatGPT share links.
 *
 * Accepts links such as
 *   https://chatgpt.com/share/<uuid>
 *   https://www.chatgpt.com/share/<uuid>
 *   https://chat.openai.com/share/<uuid>
 * and also a bare "chatgpt.com/share/<uuid>" (https is assumed).
 */

export const SHARE_HOSTS = ["chatgpt.com", "www.chatgpt.com", "chat.openai.com"] as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ShareUrlResult =
  | { ok: true; id: string; canonicalUrl: string }
  | { ok: false; reason: ShareUrlErrorReason; message: string };

export type ShareUrlErrorReason = "empty" | "not-url" | "wrong-host" | "not-share" | "bad-id";

export function isValidShareId(id: string): boolean {
  return UUID_PATTERN.test(id);
}

export function parseShareUrl(raw: string): ShareUrlResult {
  const input = raw.trim();
  if (input.length === 0) {
    return { ok: false, reason: "empty", message: "Paste a ChatGPT share link to continue." };
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return {
      ok: false,
      reason: "not-url",
      message: "That doesn't look like a link. Copy the full address from ChatGPT's Share menu.",
    };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, reason: "not-url", message: "Only web (https) links are supported." };
  }

  const host = url.hostname.toLowerCase();
  if (!(SHARE_HOSTS as readonly string[]).includes(host)) {
    return {
      ok: false,
      reason: "wrong-host",
      message: "Gpt View only reads ChatGPT share links (chatgpt.com/share/...).",
    };
  }

  const match = /^\/share\/([^/]+)\/?$/.exec(url.pathname);
  if (!match) {
    return {
      ok: false,
      reason: "not-share",
      message: "This ChatGPT link isn't a share link. Use Share → Copy link in ChatGPT.",
    };
  }

  const id = match[1];
  if (!isValidShareId(id)) {
    return {
      ok: false,
      reason: "bad-id",
      message: "The share ID in this link looks incomplete or wrong. Check that you copied the whole link.",
    };
  }

  const canonicalId = id.toLowerCase();
  return {
    ok: true,
    id: canonicalId,
    canonicalUrl: `https://chatgpt.com/share/${canonicalId}`,
  };
}
