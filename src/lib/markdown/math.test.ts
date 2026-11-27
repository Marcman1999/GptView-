import { describe, expect, it } from "vitest";
import { prepareMath } from "./math";

describe("prepareMath", () => {
  it("leaves money alone", () => {
    const { text, math } = prepareMath("Revenue was $5.4 million, up from $4.5 million and $1,200,000 | $1,380,000.");
    expect(text).toBe("Revenue was $5.4 million, up from $4.5 million and $1,200,000 | $1,380,000.");
    expect(math).toHaveLength(0);
  });

  it("extracts \\( \\) inline and \\[ \\] display math", () => {
    const { text, math } = prepareMath("Growth is \\(\\frac{a}{b}\\) and:\n\n\\[\n\\text{G}=\\frac{x-y}{y}\n\\]");
    expect(math.map((m) => [m.display, m.source])).toEqual([
      [false, "\\frac{a}{b}"],
      [true, "\\text{G}=\\frac{x-y}{y}"],
    ]);
    expect(text).not.toContain("\\frac");
  });

  it("extracts $$ display math and single-dollar math that looks like math", () => {
    const { math } = prepareMath("$$E=mc^2$$ and the variable $x$ or $\\alpha+1$.");
    expect(math.map((m) => [m.display, m.source])).toEqual([
      [true, "E=mc^2"],
      [false, "x"],
      [false, "\\alpha+1"],
    ]);
  });

  it("does not touch code blocks or inline code", () => {
    const src = "Use `\\(x\\)` here.\n\n```python\nprice = \"$5\" + \"\\(x\\)\"\n```\n\nAfter \\(y\\).";
    const { text, math } = prepareMath(src);
    expect(text).toContain('price = "$5" + "\\(x\\)"');
    expect(text).toContain("`\\(x\\)`");
    expect(math.map((m) => m.source)).toEqual(["y"]);
  });
});
