import { describe, expect, it } from "vitest";
import { fetchShareHtml } from "./fetch-share";
import { ShareError } from "./model";

const URL_ = "https://chatgpt.com/share/6ae00cb5-a448-83e9-a9cf-0d69b0be5f32";

function response(status: number, body = "<html>ok</html>", headers: Record<string, string> = {}) {
  return new Response(body, { status, headers });
}

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (err) {
    return err instanceof ShareError ? err.code : `OTHER:${String(err)}`;
  }
  return "OK";
}

describe("fetchShareHtml", () => {
  it("returns the body for a 200 response and sends a browser-like request", async () => {
    let seen: { url: string; init?: RequestInit } | null = null;
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      seen = { url, init };
      return response(200, "<html>page</html>");
    }) as typeof fetch;
    await expect(fetchShareHtml(URL_, { fetchImpl })).resolves.toBe("<html>page</html>");
    expect(seen!.url).toBe(URL_);
    expect(seen!.init?.redirect).toBe("manual");
    expect((seen!.init?.headers as Record<string, string>)["User-Agent"]).toContain("Mozilla");
  });

  it("maps 404 and 410 to NOT_FOUND and 403 to UNAVAILABLE", async () => {
    expect(await codeOf(fetchShareHtml(URL_, { fetchImpl: async () => response(404) }))).toBe("NOT_FOUND");
    expect(await codeOf(fetchShareHtml(URL_, { fetchImpl: async () => response(410) }))).toBe("NOT_FOUND");
    expect(await codeOf(fetchShareHtml(URL_, { fetchImpl: async () => response(403) }))).toBe("UNAVAILABLE");
  });

  it("maps other HTTP errors to FETCH_FAILED", async () => {
    expect(await codeOf(fetchShareHtml(URL_, { fetchImpl: async () => response(500) }))).toBe("FETCH_FAILED");
  });

  it("follows a same-origin redirect", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string) => {
      calls.push(url);
      if (calls.length === 1) return new Response(null, { status: 301, headers: { location: "/share/6ae00cb5-a448-83e9-a9cf-0d69b0be5f32?x=1" } });
      return response(200, "final");
    }) as typeof fetch;
    await expect(fetchShareHtml(URL_, { fetchImpl })).resolves.toBe("final");
    expect(calls[1]).toBe("https://chatgpt.com/share/6ae00cb5-a448-83e9-a9cf-0d69b0be5f32?x=1");
  });

  it("refuses cross-site redirects", async () => {
    const fetchImpl = (async () => new Response(null, { status: 302, headers: { location: "https://evil.example/x" } })) as typeof fetch;
    expect(await codeOf(fetchShareHtml(URL_, { fetchImpl }))).toBe("FETCH_FAILED");
  });

  it("refuses downgrade to http and redirects with credentials or ports", async () => {
    for (const location of ["http://chatgpt.com/share/x", "https://user:pw@chatgpt.com/share/x", "https://chatgpt.com:8443/share/x"]) {
      const fetchImpl = (async () => new Response(null, { status: 302, headers: { location } })) as typeof fetch;
      expect(await codeOf(fetchShareHtml(URL_, { fetchImpl })), location).toBe("FETCH_FAILED");
    }
  });

  it("stops after too many redirects", async () => {
    const fetchImpl = (async () => new Response(null, { status: 302, headers: { location: "/share/loop" } })) as typeof fetch;
    expect(await codeOf(fetchShareHtml(URL_, { fetchImpl }))).toBe("FETCH_FAILED");
  });

  it("rejects pages larger than the limit, by declared length and by streamed size", async () => {
    const declared = (async () => response(200, "x", { "content-length": "999999" })) as typeof fetch;
    expect(await codeOf(fetchShareHtml(URL_, { fetchImpl: declared, maxBytes: 100 }))).toBe("TOO_LARGE");

    const big = (async () => response(200, "x".repeat(500))) as typeof fetch;
    expect(await codeOf(fetchShareHtml(URL_, { fetchImpl: big, maxBytes: 100 }))).toBe("TOO_LARGE");
  });

  it("reports network failures and timeouts as FETCH_FAILED", async () => {
    const network = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    expect(await codeOf(fetchShareHtml(URL_, { fetchImpl: network }))).toBe("FETCH_FAILED");

    const slow = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      })) as typeof fetch;
    expect(await codeOf(fetchShareHtml(URL_, { fetchImpl: slow, timeoutMs: 20 }))).toBe("FETCH_FAILED");
  });
});
