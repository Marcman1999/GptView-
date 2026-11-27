import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Markdown } from "./markdown";

describe("Markdown safety", () => {
  it("does not render raw HTML or script tags from the shared content", () => {
    const { container } = render(<Markdown text={'Hello <script>alert(1)</script> <img src=x onerror=alert(1)> world'} />);
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("blocks javascript: links and opens external links safely", () => {
    const { container } = render(
      <Markdown text={"[bad](javascript:alert(1)) and [good](https://example.com/x)"} />,
    );
    const links = Array.from(container.querySelectorAll("a"));
    expect(links.find((a) => a.textContent === "bad")?.getAttribute("href")).not.toMatch(/^javascript:/i);
    const good = links.find((a) => a.textContent === "good");
    expect(good?.getAttribute("target")).toBe("_blank");
    expect(good?.getAttribute("rel")).toContain("noopener");
  });

  it("replaces remote images with an honest placeholder instead of loading them", () => {
    const { container } = render(<Markdown text={"![chart](https://example.com/chart.png)"} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("Image not shown yet: chart");
  });

  it("renders display math written as \\[ \\] on its own block", () => {
    const { container } = render(<Markdown text={"Formula:\n\n\\[\nx^2+1\n\\]"} />);
    expect(container.querySelector(".math-block .katex-display")).not.toBeNull();
  });
});
