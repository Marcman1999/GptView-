import "server-only";
import { ShareError } from "./model";

/**
 * Server-side GET of a public share page. Only https chatgpt.com is contacted;
 * same-origin redirects are followed, cross-origin redirects are refused, and
 * responses are size-capped and time-limited.
 */

export const SHARE_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
export const DEFAULT_TIMEOUT_MS = 15_000;
export const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export interface FetchShareOptions {
  timeoutMs?: number;
  maxBytes?: number;
  fetchImpl?: typeof fetch;
}

export async function fetchShareHtml(url: string, opts: FetchShareOptions = {}): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const doFetch = opts.fetchImpl ?? globalThis.fetch;
  const startOrigin = new URL(url).origin;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("timeout", "TimeoutError")), timeoutMs);

  try {
    let current = url;
    for (let redirects = 0; ; redirects++) {
      let response: Response;
      try {
        response = await doFetch(current, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "User-Agent": SHARE_USER_AGENT,
            Accept: "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
      } catch (err) {
        if (isAbort(err)) throw new ShareError("FETCH_FAILED", "ChatGPT took too long to respond. Try again in a moment.");
        throw new ShareError("FETCH_FAILED", "Couldn't reach ChatGPT. Check your connection and try again.");
      }

      if (REDIRECT_STATUSES.has(response.status)) {
        await cancel(response);
        if (redirects >= MAX_REDIRECTS) throw new ShareError("FETCH_FAILED", "This share link redirects too many times.");
        const location = response.headers.get("location");
        if (!location) throw new ShareError("FETCH_FAILED", "ChatGPT sent an incomplete redirect.");
        const next = new URL(location, current);
        if (next.username || next.password || next.port) {
          throw new ShareError("FETCH_FAILED", "ChatGPT redirected to an unexpected address.");
        }
        if (next.protocol !== "https:" || next.origin !== startOrigin) {
          throw new ShareError("FETCH_FAILED", "ChatGPT redirected to a different site, so Gpt View stopped.");
        }
        current = next.href;
        continue;
      }

      if (response.status === 404 || response.status === 410) {
        await cancel(response);
        throw new ShareError("NOT_FOUND", "This share link doesn't exist or was deleted by its owner.");
      }
      if (response.status === 403) {
        await cancel(response);
        throw new ShareError("UNAVAILABLE", "ChatGPT isn't letting Gpt View open this share right now.");
      }
      if (response.status !== 200) {
        await cancel(response);
        throw new ShareError("FETCH_FAILED", `ChatGPT returned an unexpected response (HTTP ${response.status}).`);
      }
      return await readLimited(response, maxBytes);
    }
  } finally {
    clearTimeout(timer);
  }
}

function isAbort(err: unknown): boolean {
  const name = (err as { name?: string } | null)?.name;
  return name === "TimeoutError" || name === "AbortError";
}

async function cancel(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => undefined);
}

const TOO_LARGE = "This share page is larger than Gpt View can read.";

async function readLimited(response: Response, maxBytes: number): Promise<string> {
  const declared = response.headers.get("content-length");
  if (declared !== null && /^\d+$/.test(declared) && Number(declared) > maxBytes) {
    await cancel(response);
    throw new ShareError("TOO_LARGE", TOO_LARGE);
  }
  if (!response.body) {
    const text = await response.text();
    if (Buffer.byteLength(text) > maxBytes) throw new ShareError("TOO_LARGE", TOO_LARGE);
    return text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new ShareError("TOO_LARGE", TOO_LARGE);
      }
      chunks.push(value);
    }
  } catch (err) {
    if (err instanceof ShareError) throw err;
    throw new ShareError("FETCH_FAILED", "The connection to ChatGPT was interrupted. Try again.");
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c.buffer, c.byteOffset, c.byteLength))).toString("utf8");
}
