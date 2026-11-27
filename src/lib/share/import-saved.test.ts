import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseSavedPage } from "./import-saved";

const fixture = readFileSync(join(__dirname, "../chatgpt/fixtures/northbean-q3.html"), "utf8");

describe("parseSavedPage", () => {
  it("reads a saved share page in the browser-side path", () => {
    const result = parseSavedPage(fixture);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.conversation.title).toBe("Q3销售报告撰写");
      expect(result.conversation.turns.length).toBe(4);
    }
  });

  it("rejects empty input with a clear message", () => {
    expect(parseSavedPage("   ")).toMatchObject({ ok: false });
  });

  it("rejects an unrelated page without throwing", () => {
    const result = parseSavedPage("<html><body>hello</body></html>");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/couldn't find|doesn't look/);
  });
});
