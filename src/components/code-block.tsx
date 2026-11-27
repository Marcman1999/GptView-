"use client";

import { useState } from "react";
import { svgDataUrl } from "@/lib/media/image-src";

/** Code block with language label and copy button. Used for every fenced block. */
export function CodeBlock({ language, code, label }: { language: string; code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const visual = language.toLowerCase() === "svg" ? svgDataUrl(code) : null;
  const [showVisual, setShowVisual] = useState(true);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="my-5 border-2 border-ink">
      <div className="flex items-center justify-between border-b-2 border-ink bg-ink px-3 py-1.5 text-paper">
        <span className="text-xs font-semibold uppercase tracking-widest">{label ?? (language || "code")}</span>
        <div className="flex items-center gap-4">
          {visual ? (
            <button
              type="button"
              onClick={() => setShowVisual((v) => !v)}
              aria-pressed={!showVisual}
              className="text-xs font-semibold uppercase tracking-widest underline-offset-4 hover:underline"
            >
              {showVisual ? "Show code" : "Show visual"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? "Code copied" : "Copy code"}
            className="text-xs font-semibold uppercase tracking-widest underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-paper"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      {visual && showVisual ? (
        <figure className="flex justify-center overflow-auto bg-paper p-4" data-testid="svg-visual">
          {/* An SVG image cannot run scripts or load external content, so the shared markup stays inert. */}
          {/* Source is validated in src/lib/media/image-src.ts; next/image cannot load data URLs or arbitrary hosts. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={visual} alt={`${label ?? "SVG"} visual from the shared chat`} className="h-auto max-w-full" />
        </figure>
      ) : (
        <pre className="max-h-[60vh] overflow-auto bg-paper p-4 text-sm leading-relaxed">
          <code className={language ? `language-${language}` : undefined}>{code}</code>
        </pre>
      )}
    </div>
  );
}
