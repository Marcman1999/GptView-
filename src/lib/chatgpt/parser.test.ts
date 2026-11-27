import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseChatGptPage, cleanAssistantMarkdown } from "./parser";
import { ShareError } from "@/lib/share/model";

const ID = "6ae00cb5-a448-83e9-a9cf-0d69b0be5f32";
const URL_ = `https://chatgpt.com/share/${ID}`;
const northbeanHtml = readFileSync(path.join(__dirname, "fixtures/northbean-q3.html"), "utf8");
const deletedHtml = readFileSync(path.join(__dirname, "fixtures/deleted.html"), "utf8");

/** Wrap a conversation object the same way the legacy __NEXT_DATA__ payload did. */
function pageWith(serverResponse: unknown): string {
  const json = JSON.stringify({ props: { pageProps: { serverResponse } } });
  return `<html><body><script id="__NEXT_DATA__" type="application/json">${json}</script></body></html>`;
}

function msg(id: string, role: "user" | "assistant" | "system", content: unknown, extra: Record<string, unknown> = {}) {
  return {
    id,
    author: { role },
    create_time: 1793067718.1,
    content,
    channel: role === "assistant" ? "final" : null,
    recipient: "all",
    metadata: {},
    ...extra,
  };
}

function node(id: string, message: unknown, parent: string | null, children: string[] = []) {
  return { id, message, parent, children };
}

describe("northbean fixture (real share page)", () => {
  const convo = parseChatGptPage(northbeanHtml, ID, URL_);
  const flat = (turnIndex: number) =>
    convo.turns[turnIndex].blocks.map((b) => (b.kind === "markdown" || b.kind === "reasoning" ? b.text : "")).join("\n");

  it("reads the title, ids, and timestamps", () => {
    expect(convo.title).toBe("Q3销售报告撰写");
    expect(convo.shareId).toBe(ID);
    expect(convo.sourceUrl).toBe(URL_);
    expect(convo.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("keeps the visible turns in order: user, response, user, response", () => {
    expect(convo.turns.map((t) => t.role)).toEqual(["user", "assistant", "user", "assistant"]);
    expect(flat(0)).toMatch(/^Write a short Q3 sales report for a fictional coffee chain called Northbean/);
    expect(flat(2)).toMatch(/^Add a second section/);
  });

  it("drops hidden system context and status-only items, and counts them", () => {
    expect(convo.stats.turns).toBe(4);
    expect(convo.stats.responses).toBe(2);
    expect(convo.stats.hiddenMessages).toBeGreaterThan(0);
    expect(convo.stats.unsupportedBlocks).toBe(0);
  });

  it("keeps the response's Markdown table, LaTeX, and code without the source wrappers", () => {
    const response = flat(1);
    expect(response).toContain("| Region | Q2 Revenue | Q3 Revenue | Growth |");
    expect(response).toContain("\\[");
    expect(response).toContain("```python");
    expect(response).not.toMatch(/<CodeBlock|<\/CodeBlock/);
    expect(response).not.toMatch(/[\uE200-\uE2FF]/);
  });

  it("records the model slug on responses only", () => {
    expect(convo.turns[1].model).toBe("gpt-6-thinking");
    expect(convo.turns[0].model).toBeNull();
  });
});

describe("deleted share page", () => {
  it("is reported as unavailable with a clear message, not a crash", () => {
    let caught: unknown = null;
    try {
      parseChatGptPage(deletedHtml, ID, URL_);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ShareError);
    expect((caught as ShareError).code).toBe("NOT_FOUND");
    expect((caught as ShareError).message).toMatch(/no longer available/);
  });
});

describe("parser edge cases", () => {
  it("reports a page with no conversation data as a parse failure", () => {
    expect(() => parseChatGptPage("<html><body>hello</body></html>", ID, URL_)).toThrow(
      expect.objectContaining({ code: "PARSE_FAILED" }),
    );
  });

  it("uses the message order from linear_conversation and ignores abandoned branches", () => {
    const data = {
      title: "Branches",
      mapping: {
        root: node("root", null, null, ["u1"]),
        u1: node("u1", msg("u1", "user", { content_type: "text", parts: ["Question"] }), "root", ["a-old", "a-new"]),
        "a-old": node("a-old", msg("a-old", "assistant", { content_type: "text", parts: ["Old draft"] }), "u1"),
        "a-new": node("a-new", msg("a-new", "assistant", { content_type: "text", parts: ["Final answer"] }), "u1"),
      },
      current_node: "a-new",
      linear_conversation: [
        { id: "u1", message: msg("u1", "user", { content_type: "text", parts: ["Question"] }), parent: "root", children: [] },
        { id: "a-new", message: msg("a-new", "assistant", { content_type: "text", parts: ["Final answer"] }), parent: "u1", children: [] },
      ],
    };
    const convo = parseChatGptPage(pageWith({ type: "data", data }), ID, URL_);
    const text = convo.turns.map((t) => (t.blocks[0].kind === "markdown" ? t.blocks[0].text : "")).join("|");
    expect(text).toBe("Question|Final answer");
  });

  it("walks the mapping from current_node when linear_conversation is absent", () => {
    const data = {
      title: "Mapping only",
      current_node: "a2",
      mapping: {
        r: node("r", null, null, ["u1"]),
        u1: node("u1", msg("u1", "user", { content_type: "text", parts: ["Hi"] }), "r", ["a1"]),
        a1: node("a1", msg("a1", "assistant", { content_type: "text", parts: ["Hello"] }), "u1", ["a2"]),
        a2: node("a2", msg("a2", "assistant", { content_type: "text", parts: ["Hello again"] }), "a1"),
        stray: node("stray", msg("stray", "assistant", { content_type: "text", parts: ["Not on screen"] }), "u1"),
      },
    };
    const convo = parseChatGptPage(pageWith({ type: "data", data }), ID, URL_);
    expect(convo.turns).toHaveLength(2);
    expect(JSON.stringify(convo)).not.toContain("Not on screen");
  });

  it("merges consecutive assistant messages into one response and keeps code and images", () => {
    const data = {
      title: "Mixed",
      linear_conversation: [
        { id: "u", message: msg("u", "user", { content_type: "text", parts: ["Show me"] }), parent: null, children: [] },
        {
          id: "a1",
          message: msg("a1", "assistant", {
            content_type: "multimodal_text",
            parts: [
              "Here is a picture:",
              { content_type: "image_asset_pointer", asset_pointer: "file-service://file-abc", width: 800, height: 600 },
              "And some code.",
            ],
          }),
          parent: "u",
          children: [],
        },
        {
          id: "a2",
          message: msg("a2", "assistant", { content_type: "code", language: "python", text: "print(1)" }),
          parent: "a1",
          children: [],
        },
        {
          id: "a3",
          message: msg("a3", "assistant", { content_type: "execution_output", text: "1" }),
          parent: "a2",
          children: [],
        },
      ],
    };
    const convo = parseChatGptPage(pageWith({ type: "data", data }), ID, URL_);
    expect(convo.turns.map((t) => t.role)).toEqual(["user", "assistant"]);
    const blocks = convo.turns[1].blocks;
    expect(blocks.map((b) => b.kind)).toEqual(["markdown", "image", "markdown", "code", "code"]);
    expect(blocks[1]).toMatchObject({ kind: "image", pointer: "file-service://file-abc", width: 800, height: 600 });
    expect(blocks[3]).toMatchObject({ kind: "code", language: "python", code: "print(1)" });
    expect(blocks[4]).toMatchObject({ kind: "code", label: "Output" });
    expect(convo.stats.images).toBe(1);
  });

  it("keeps reasoning separate and marks unknown content types as unsupported with their text", () => {
    const data = {
      title: "Extras",
      linear_conversation: [
        { id: "u", message: msg("u", "user", { content_type: "text", parts: ["Q"] }), parent: null, children: [] },
        {
          id: "a",
          message: msg("a", "assistant", {
            content_type: "thoughts",
            thoughts: [{ summary: "s", content: "Thinking it through" }],
          }),
          parent: "u",
          children: [],
        },
        {
          id: "b",
          message: msg("b", "assistant", { content_type: "tether_quote", text: "Quoted source", title: "T" }),
          parent: "a",
          children: [],
        },
      ],
    };
    const convo = parseChatGptPage(pageWith({ type: "data", data }), ID, URL_);
    const kinds = convo.turns[1].blocks.map((b) => b.kind);
    expect(kinds).toEqual(["reasoning", "unsupported"]);
    expect(convo.turns[1].blocks[1]).toMatchObject({ kind: "unsupported", contentType: "tether_quote", text: "Quoted source" });
    expect(convo.stats.unsupportedBlocks).toBe(1);
  });

  it("hides system messages, hidden messages, tool-channel messages, and recap status lines", () => {
    const data = {
      title: "Hidden",
      linear_conversation: [
        { id: "s", message: msg("s", "system", { content_type: "text", parts: ["Secret rules"] }), parent: null, children: [] },
        {
          id: "h",
          message: msg("h", "user", { content_type: "text", parts: ["Hidden user note"] }, { metadata: { is_visually_hidden_from_conversation: true } }),
          parent: "s",
          children: [],
        },
        {
          id: "c",
          message: msg("c", "assistant", { content_type: "text", parts: ["Tool chatter"] }, { channel: "commentary" }),
          parent: "h",
          children: [],
        },
        {
          id: "r",
          message: msg("r", "assistant", { content_type: "reasoning_recap", content: "Worked for a few seconds" }),
          parent: "c",
          children: [],
        },
        { id: "u", message: msg("u", "user", { content_type: "text", parts: ["Visible question"] }), parent: "r", children: [] },
      ],
    };
    const convo = parseChatGptPage(pageWith({ type: "data", data }), ID, URL_);
    expect(convo.turns).toHaveLength(1);
    expect(JSON.stringify(convo)).not.toMatch(/Secret rules|Hidden user note|Tool chatter|Worked for/);
    expect(convo.stats.hiddenMessages).toBe(3);
  });

  it("shows a note for interactive components that are not code blocks", () => {
    const data = {
      title: "Interactive",
      linear_conversation: [
        {
          id: "a",
          message: msg("a", "assistant", { content_type: "text", parts: ["Try the slider"] }, { metadata: { genui_components: [{ type: "slider" }] } }),
          parent: null,
          children: [],
        },
      ],
    };
    const convo = parseChatGptPage(pageWith({ type: "data", data }), ID, URL_);
    expect(convo.turns[0].blocks.map((b) => b.kind)).toEqual(["markdown", "unsupported"]);
  });

  it("maps an error payload to NOT_FOUND and a conversation with nothing visible to UNAVAILABLE", () => {
    expect(() => parseChatGptPage(pageWith({ type: "error", error: "gone" }), ID, URL_)).toThrow(
      expect.objectContaining({ code: "NOT_FOUND" }),
    );
    const empty = { title: "Empty", linear_conversation: [] };
    expect(() => parseChatGptPage(pageWith({ type: "data", data: empty }), ID, URL_)).toThrow(
      expect.objectContaining({ code: "UNAVAILABLE" }),
    );
  });

  it("falls back to 'Untitled chat' when there is no title", () => {
    const data = { linear_conversation: [{ id: "u", message: msg("u", "user", { content_type: "text", parts: ["Hi"] }), parent: null, children: [] }] };
    expect(parseChatGptPage(pageWith({ type: "data", data }), ID, URL_).title).toBe("Untitled chat");
  });
});

describe("cleanAssistantMarkdown", () => {
  it("replaces citation markers and reference matches with their alt text", () => {
    const text = "Water boils at 100 °C【3†source】 and that is final.\uE200cite\uE201 Done.";
    const out = cleanAssistantMarkdown(text, {
      content_references: [{ matched_text: "that is final.", alt: "that is final [1]" }],
    });
    expect(out).toBe("Water boils at 100 °C and that is final [1] Done.");
  });

  it("turns CodeBlock wrappers into fenced code with the language", () => {
    const out = cleanAssistantMarkdown('<CodeBlock language="python">\nprint("x")\n</CodeBlock>');
    expect(out).toBe('```python\nprint("x")\n```');
  });
});
