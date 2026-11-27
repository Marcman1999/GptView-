import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { loadShare } from "./load-share";

const ID = "6ae00cb5-a448-83e9-a9cf-0d69b0be5f32";
const northbean = readFileSync(path.join(__dirname, "../chatgpt/fixtures/northbean-q3.html"), "utf8");
const deleted = readFileSync(path.join(__dirname, "../chatgpt/fixtures/deleted.html"), "utf8");

const fixtureFetch = (body: string) => (async () => new Response(body, { status: 200 })) as typeof fetch;

describe("loadShare", () => {
  it("returns a conversation for a valid share, using the canonical source URL", async () => {
    const seen: string[] = [];
    const result = await loadShare(ID.toUpperCase(), {
      fetchImpl: (async (url: string) => {
        seen.push(url);
        return new Response(northbean, { status: 200 });
      }) as typeof fetch,
    });
    expect(seen).toEqual([`https://chatgpt.com/share/${ID}`]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.conversation.turns.length).toBe(4);
      expect(result.conversation.shareId).toBe(ID);
    }
  });

  it("rejects malformed IDs without touching the network", async () => {
    const fetchImpl = vi.fn(fixtureFetch(northbean));
    const result = await loadShare("not-an-id", { fetchImpl });
    expect(result).toMatchObject({ ok: false, code: "INVALID_URL" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports a deleted share with a clear NOT_FOUND message", async () => {
    const result = await loadShare(ID, { fetchImpl: fixtureFetch(deleted) });
    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
    if (!result.ok) expect(result.message.length).toBeGreaterThan(20);
  });

  it("reports an unrecognised page as PARSE_FAILED", async () => {
    const result = await loadShare(ID, { fetchImpl: fixtureFetch("<html>maintenance</html>") });
    expect(result).toMatchObject({ ok: false, code: "PARSE_FAILED" });
  });

  it("reports network failures as FETCH_FAILED and never throws", async () => {
    const result = await loadShare(ID, {
      fetchImpl: (async () => {
        throw new TypeError("offline");
      }) as typeof fetch,
    });
    expect(result).toMatchObject({ ok: false, code: "FETCH_FAILED" });
  });
});
