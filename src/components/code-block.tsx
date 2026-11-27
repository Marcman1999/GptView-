"use client";

import { useState } from "react";

/** Code block with language label and copy button. Used for every fenced block. */
export function CodeBlock({ language, code, label }: { language: string; code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

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
    <div className="my-5 border-2 border-black">
      <div className="flex items-center justify-between border-b-2 border-black bg-black px-3 py-1.5 text-white">
        <span className="text-xs font-semibold uppercase tracking-widest">{label ?? (language || "code")}</span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Code copied" : "Copy code"}
          className="text-xs font-semibold uppercase tracking-widest underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-white"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-h-[60vh] overflow-auto bg-white p-4 text-sm leading-relaxed">
        <code className={language ? `language-${language}` : undefined}>{code}</code>
      </pre>
    </div>
  );
}
