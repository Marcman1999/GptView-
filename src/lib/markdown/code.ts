import type { ReactNode } from "react";

/** Helper for markdown `pre` elements: extracts language and text from the child <code>. */
export function codeFromChildren(children: ReactNode): { language: string; code: string } {
  const child = Array.isArray(children) ? children[0] : children;
  if (child && typeof child === "object" && "props" in child) {
    const props = (child as { props: { className?: string; children?: ReactNode } }).props;
    const language = /language-([\w+#.-]+)/.exec(props.className ?? "")?.[1] ?? "";
    const code = flatten(props.children).replace(/\n$/, "");
    return { language, code };
  }
  return { language: "", code: flatten(children).replace(/\n$/, "") };
}

function flatten(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flatten).join("");
  return "";
}
