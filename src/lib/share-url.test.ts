import { describe, expect, it } from "vitest";
import { isValidShareId, parseShareUrl } from "./share-url";

const ID = "6b0893b9-6660-83e9-88e8-90d58706e477";

describe("parseShareUrl", () => {
  it("accepts the primary test share link", () => {
    const r = parseShareUrl(`https://chatgpt.com/share/${ID}`);
    expect(r).toEqual({ ok: true, id: ID, canonicalUrl: `https://chatgpt.com/share/${ID}` });
  });

  it("accepts www and legacy chat.openai.com hosts", () => {
    expect(parseShareUrl(`https://www.chatgpt.com/share/${ID}`).ok).toBe(true);
    expect(parseShareUrl(`https://chat.openai.com/share/${ID}`).ok).toBe(true);
  });

  it("accepts a bare link without a scheme and surrounding whitespace", () => {
    const r = parseShareUrl(`   chatgpt.com/share/${ID}/  `);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.id).toBe(ID);
  });

  it("accepts upper-case IDs and normalises them to lower case", () => {
    const r = parseShareUrl(`https://chatgpt.com/share/${ID.toUpperCase()}`);
    expect(r.ok && r.id).toBe(ID);
  });

  it("ignores query strings and fragments", () => {
    expect(parseShareUrl(`https://chatgpt.com/share/${ID}?utm=x#top`).ok).toBe(true);
  });

  it("rejects an empty input", () => {
    expect(parseShareUrl("   ")).toMatchObject({ ok: false, reason: "empty" });
  });

  it("rejects text that is not a URL", () => {
    expect(parseShareUrl("https://")).toMatchObject({ ok: false });
    expect(parseShareUrl("hello world")).toMatchObject({ ok: false });
  });

  it("rejects non-web schemes", () => {
    expect(parseShareUrl(`ftp://chatgpt.com/share/${ID}`)).toMatchObject({ ok: false, reason: "not-url" });
  });

  it("rejects other websites, including look-alike hosts", () => {
    expect(parseShareUrl(`https://example.com/share/${ID}`)).toMatchObject({ ok: false, reason: "wrong-host" });
    expect(parseShareUrl(`https://chatgpt.com.evil.io/share/${ID}`)).toMatchObject({ ok: false, reason: "wrong-host" });
    expect(parseShareUrl(`https://evilchatgpt.com/share/${ID}`)).toMatchObject({ ok: false, reason: "wrong-host" });
  });

  it("rejects ChatGPT pages that are not share links", () => {
    expect(parseShareUrl("https://chatgpt.com/")).toMatchObject({ ok: false, reason: "not-share" });
    expect(parseShareUrl(`https://chatgpt.com/c/${ID}`)).toMatchObject({ ok: false, reason: "not-share" });
    expect(parseShareUrl(`https://chatgpt.com/share/${ID}/extra`)).toMatchObject({ ok: false, reason: "not-share" });
    expect(parseShareUrl("https://chatgpt.com/share/")).toMatchObject({ ok: false, reason: "not-share" });
  });

  it("rejects malformed share IDs", () => {
    expect(parseShareUrl("https://chatgpt.com/share/abc")).toMatchObject({ ok: false, reason: "bad-id" });
    expect(parseShareUrl(`https://chatgpt.com/share/${ID.slice(0, -1)}z`)).toMatchObject({ ok: false, reason: "bad-id" });
    expect(parseShareUrl(`https://chatgpt.com/share/${ID.replace(/-/g, "")}`)).toMatchObject({ ok: false, reason: "bad-id" });
    expect(parseShareUrl("https://chatgpt.com/share/%3Cscript%3E")).toMatchObject({ ok: false, reason: "bad-id" });
  });

  it("gives a user-readable message for every failure", () => {
    for (const input of ["", "nope", "https://example.com/x", "https://chatgpt.com/", "https://chatgpt.com/share/x"]) {
      const r = parseShareUrl(input);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message.length).toBeGreaterThan(10);
    }
  });
});

describe("isValidShareId", () => {
  it("validates UUID shape only", () => {
    expect(isValidShareId(ID)).toBe(true);
    expect(isValidShareId("not-a-uuid")).toBe(false);
  });
});
