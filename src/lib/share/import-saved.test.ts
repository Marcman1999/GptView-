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

describe("parseSavedPage with visuals", () => {
  const PNG_1PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8"/></svg>';

  function savedPage(parts: unknown[], code: string) {
    const data = {
      title: "Visuals test",
      linear_conversation: [
        { message: { id: "u1", author: { role: "user" }, content: { content_type: "text", parts: ["Show me a picture"] }, metadata: {} } },
        {
          message: {
            id: "a1",
            author: { role: "assistant" },
            content: { content_type: "multimodal_text", parts },
            metadata: {},
          },
        },
        {
          message: {
            id: "a2",
            author: { role: "assistant" },
            content: { content_type: "code", language: "svg", text: code },
            metadata: {},
          },
        },
      ],
    };
    const payload = JSON.stringify({ props: { pageProps: { serverResponse: { type: "data", data } } } });
    return `<html><body><script id="__NEXT_DATA__" type="application/json">${payload}</script></body></html>`;
  }

  it("keeps an embedded image and an SVG code block as visual blocks", () => {
    const html = savedPage(
      [
        { content_type: "image_asset_pointer", asset_pointer: PNG_1PX, alt: "A dot", width: 1, height: 1 },
        { content_type: "image_asset_pointer", asset_pointer: "file-service://file-remote", alt: "Remote" },
      ],
      SVG,
    );
    const result = parseSavedPage(html);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const blocks = result.conversation.turns.flatMap((t) => t.blocks);
    expect(blocks.filter((b) => b.kind === "image")).toHaveLength(2);
    expect(result.conversation.stats.images).toBe(2);
    expect(blocks).toContainEqual(expect.objectContaining({ kind: "code", language: "svg", code: SVG }));
  });
});
