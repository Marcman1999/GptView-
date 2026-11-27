import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ImageBlock } from "./image-block";
import { CodeBlock } from "./code-block";

const PNG = "data:image/png;base64,iVBORw0KGgo=";

afterEach(cleanup);

describe("ImageBlock", () => {
  it("shows an embedded image with alt text and a no-referrer policy", () => {
    const { container } = render(<ImageBlock src={PNG} alt="Diagram" width={200} height={100} />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe(PNG);
    expect(img?.getAttribute("alt")).toBe("Diagram");
    expect(img?.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(img?.getAttribute("loading")).toBe("lazy");
  });

  it("explains why a ChatGPT-hosted image is not shown", () => {
    render(<ImageBlock src="file-service://file-abc123" alt="Chart" />);
    expect(screen.getByTestId("image-placeholder").textContent).toContain("stored on ChatGPT's servers");
  });

  it("offers the original link only for https images that cannot be loaded", () => {
    render(<ImageBlock src="https://example.com/x.png" alt="x" hostedElsewhere="example.com" />);
    expect(screen.getByText("Open the original link").getAttribute("href")).toBe("https://example.com/x.png");
    expect(screen.getByTestId("image-placeholder").textContent).toContain("hosted outside ChatGPT");
  });

  it("falls back to the placeholder when the browser fails to load the image", () => {
    const { container } = render(<ImageBlock src={PNG} alt="Broken" />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByTestId("image-placeholder").textContent).toContain("couldn't be loaded");
  });

  it("never renders scripts or unsafe sources", () => {
    const { container } = render(<ImageBlock src="javascript:alert(1)" alt="x" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).not.toContain("javascript:");
  });
});

describe("SVG visuals in code blocks", () => {
  afterEach(cleanup);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>';

  it("shows the SVG as a visual by default and can switch to the source", () => {
    const { container } = render(<CodeBlock language="svg" code={svg} />);
    const img = container.querySelector("[data-testid=svg-visual] img");
    expect(img?.getAttribute("src")).toMatch(/^data:image\/svg\+xml;base64,/);
    fireEvent.click(screen.getByRole("button", { name: "Show code" }));
    expect(container.querySelector("[data-testid=svg-visual]")).toBeNull();
    expect(container.querySelector("pre code")?.textContent).toContain("<circle");
    fireEvent.click(screen.getByRole("button", { name: "Show visual" }));
    expect(container.querySelector("[data-testid=svg-visual]")).not.toBeNull();
  });

  it("keeps plain code as code when it is not an SVG document", () => {
    const { container } = render(<CodeBlock language="svg" code="<script>alert(1)</script>" />);
    expect(container.querySelector("[data-testid=svg-visual]")).toBeNull();
    expect(screen.queryByRole("button", { name: "Show code" })).toBeNull();
    expect(container.querySelector("script")).toBeNull();
  });
});
