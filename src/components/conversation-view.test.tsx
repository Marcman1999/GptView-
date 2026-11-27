import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { parseChatGptPage } from "@/lib/chatgpt/parser";
import { ConversationView } from "./conversation-view";

const ID = "6ae00cb5-a448-83e9-a9cf-0d69b0be5f32";
const html = readFileSync(path.join(__dirname, "../lib/chatgpt/fixtures/northbean-q3.html"), "utf8");

function renderFixture() {
  const conversation = parseChatGptPage(html, ID, `https://chatgpt.com/share/${ID}`);
  const { container } = render(<ConversationView conversation={conversation} />);
  return { conversation, container };
}

describe("ConversationView with the real share fixture", () => {
  it("renders every turn in order", () => {
    renderFixture();
    const items = Array.from(screen.getByTestId("conversation").children);
    expect(items.map((li) => li.getAttribute("data-role"))).toEqual(["user", "assistant", "user", "assistant"]);
  });

  it("renders the response's table, headings, and links as real elements, not Markdown text", () => {
    const { container } = renderFixture();
    const response = container.querySelector('[data-role="assistant"]') as HTMLElement;
    expect(response.querySelector("table")).not.toBeNull();
    expect(response.querySelectorAll("th").length).toBe(4);
    expect(response.querySelector("h2")?.textContent).toContain("Northbean");
    expect(response.textContent).not.toContain("| Region");
    expect(response.textContent).not.toContain("**");
  });

  it("renders LaTeX with KaTeX and leaves no raw delimiters", () => {
    const { container } = renderFixture();
    expect(container.querySelectorAll(".katex").length).toBeGreaterThan(0);
    // KaTeX keeps the TeX source in <annotation> for screen readers; check only what is visible.
    const visible = container.cloneNode(true) as HTMLElement;
    visible.querySelectorAll("annotation").forEach((node) => node.remove());
    expect(visible.textContent).not.toContain("\\[");
    expect(visible.textContent).not.toContain("\\frac");
    expect(visible.textContent).not.toContain("\\text{");
  });

  it("keeps money as text, not math", () => {
    const { container } = renderFixture();
    expect(container.textContent).toContain("$5.4 million");
    expect(container.textContent).toContain("$1,200,000");
  });

  it("shows fenced Python with a language label and a copy button", () => {
    const { container } = renderFixture();
    const copy = screen.getAllByRole("button", { name: "Copy code" });
    expect(copy.length).toBeGreaterThan(0);
    const pre = container.querySelector("pre code.language-python");
    expect(pre?.textContent).toContain("growth = (q3 - q2) / q2 * 100");
  });
});
