import { describe, expect, it } from "vitest";
import { resolveImageSrc, svgDataUrl, MAX_SVG_CHARS } from "./image-src";

const PNG = "data:image/png;base64,iVBORw0KGgo=";

describe("resolveImageSrc", () => {
  it("allows embedded raster images", () => {
    expect(resolveImageSrc(PNG)).toBe(PNG);
    expect(resolveImageSrc("data:image/jpeg;base64,/9j/4AAQ")).not.toBeNull();
  });

  it("rejects embedded SVG, scripts and other data types", () => {
    expect(resolveImageSrc("data:image/svg+xml;base64,PHN2Zz4=")).toBeNull();
    expect(resolveImageSrc("data:text/html;base64,PGgxPg==")).toBeNull();
    expect(resolveImageSrc("data:image/png;base64,<script>")).toBeNull();
  });

  it("allows https images only from known ChatGPT hosts", () => {
    expect(
      resolveImageSrc("https://files.oaiusercontent.com/file-abc.png"),
    ).toBe("https://files.oaiusercontent.com/file-abc.png");
    expect(resolveImageSrc("https://chatgpt.com/images/x.webp")).not.toBeNull();
    expect(resolveImageSrc("https://example.com/chart.png")).toBeNull();
    expect(resolveImageSrc("https://chatgpt.com.evil.test/x.png")).toBeNull();
  });

  it("rejects non-https, credentials, remote SVG and unresolvable pointers", () => {
    expect(resolveImageSrc("http://chatgpt.com/x.png")).toBeNull();
    expect(resolveImageSrc("javascript:alert(1)")).toBeNull();
    expect(resolveImageSrc("https://user:pw@chatgpt.com/x.png")).toBeNull();
    expect(resolveImageSrc("https://chatgpt.com/x.svg")).toBeNull();
    expect(resolveImageSrc("file-service://file-abc123")).toBeNull();
    expect(resolveImageSrc("sediment://file_0001")).toBeNull();
    expect(resolveImageSrc("")).toBeNull();
    expect(resolveImageSrc(undefined)).toBeNull();
  });
});

describe("svgDataUrl", () => {
  it("turns an SVG document into an image data URL", () => {
    const url = svgDataUrl(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="5" height="5"/></svg>',
    );
    expect(url).toMatch(/^data:image\/svg\+xml;base64,/);
    const decoded = atob(url!.split(",")[1]);
    expect(decoded).toContain("<rect");
  });

  it("handles non-ASCII text", () => {
    const url = svgDataUrl(
      '<svg xmlns="http://www.w3.org/2000/svg"><text>速度 ✓</text></svg>',
    );
    expect(
      new TextDecoder().decode(
        Uint8Array.from(atob(url!.split(",")[1]), (c) => c.charCodeAt(0)),
      ),
    ).toContain("速度 ✓");
  });

  it("rejects non-SVG code and oversized input", () => {
    expect(svgDataUrl("const x = 1;")).toBeNull();
    expect(svgDataUrl("<div>not svg</div>")).toBeNull();
    expect(
      svgDataUrl("<svg>" + "a".repeat(MAX_SVG_CHARS) + "</svg>"),
    ).toBeNull();
    expect(svgDataUrl("   ")).toBeNull();
  });
});
