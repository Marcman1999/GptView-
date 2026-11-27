import type { InlineCode, Paragraph, PhrasingContent, Root, Text } from "mdast";
import { visit, SKIP } from "unist-util-visit";

/**
 * ChatGPT writes math as \( … \) (inline), \[ … \] or $$ … $$ (display), and money as
 * "$5.4 million". Markdown would mangle backslash-delimited math and treat "$…$" pairs
 * as formulas, so math is pulled out before Markdown parsing and returned to the tree
 * as placeholders. Code blocks and code spans are never touched.
 */

export interface MathSource {
  source: string;
  display: boolean;
}

const INLINE_OPEN = "\uE100";
const INLINE_CLOSE = "\uE101";
const BLOCK_OPEN = "\uE102";
const BLOCK_CLOSE = "\uE103";
const PLACEHOLDER = /\uE100(\d+)\uE101|\uE102(\d+)\uE103/g;

export function prepareMath(source: string): { text: string; math: MathSource[] } {
  const math: MathSource[] = [];
  const store = (value: string, display: boolean) => {
    math.push({ source: value.trim(), display });
    return math.length - 1;
  };

  // Process line groups that are not fenced code, leaving code spans untouched.
  const lines = source.split("\n");
  const result: string[] = [];
  let buffer: string[] = [];
  let inFence: string | null = null;
  const flush = () => {
    if (buffer.length === 0) return;
    result.push(transformProse(buffer.join("\n"), store));
    buffer = [];
  };
  for (const line of lines) {
    const m = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (inFence !== null) {
      result.push(line);
      if (m && m[1].startsWith(inFence) && line.trim() === m[1]) inFence = null;
      continue;
    }
    if (m) {
      flush();
      inFence = m[1];
      result.push(line);
      continue;
    }
    buffer.push(line);
  }
  flush();

  return { text: result.join("\n"), math };
}

function transformProse(text: string, store: (value: string, display: boolean) => number): string {
  // Odd indexes are code spans: keep them exactly as written.
  const parts = text.split(/(`[^`\n]*`)/);
  return parts
    .map((part, i) => (i % 2 === 1 ? part : transformSegment(part, store)))
    .join("");
}

const DELIMITED =
  /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(?<![\\\w$])\$([^\s$\d][^$\n]*?|[^\s$\d])\$(?![\w$])/g;

/** One pass, so placeholder numbers follow the order of the text. */
function transformSegment(text: string, store: (value: string, display: boolean) => number): string {
  return text.replace(DELIMITED, (whole, dollarBlock?: string, bracketBlock?: string, paren?: string, dollar?: string) => {
    if (dollarBlock !== undefined) return blockPlaceholder(store(dollarBlock, true));
    if (bracketBlock !== undefined) return blockPlaceholder(store(bracketBlock, true));
    if (paren !== undefined) return `${INLINE_OPEN}${store(paren, false)}${INLINE_CLOSE}`;
    if (dollar !== undefined && looksLikeMath(dollar)) return `${INLINE_OPEN}${store(dollar, false)}${INLINE_CLOSE}`;
    return whole;
  });
}

function blockPlaceholder(index: number): string {
  return `\n\n${BLOCK_OPEN}${index}${BLOCK_CLOSE}\n\n`;
}

/** Avoid turning prices and prose into formulas: require a math-like character or a single letter. */
function looksLikeMath(body: string): boolean {
  if (/\s$/.test(body) || /^\s/.test(body)) return false;
  if (/^[A-Za-z]$/.test(body)) return true;
  return /[\\^_{}=+\-*/<>|]/.test(body) && body.length <= 200;
}

/** Remark plugin that turns placeholders back into KaTeX-ready nodes. */
export function remarkChatGptMath(math: MathSource[]) {
  return (tree: Root) => {
    visit(tree, "paragraph", (node: Paragraph, index, parent) => {
      if (index === undefined || !parent) return;
      const only = node.children.length === 1 && node.children[0].type === "text" ? (node.children[0] as Text).value.trim() : null;
      const match = only ? /^\uE102(\d+)\uE103$/.exec(only) : null;
      if (!match) return;
      const item = math[Number(match[1])];
      if (!item) return;
      const wrapper: Paragraph = {
        type: "paragraph",
        children: [displayNode(item.source)],
        data: { hName: "div", hProperties: { className: ["math-block"] } },
      };
      parent.children[index] = wrapper;
      return SKIP;
    });

    visit(tree, "text", (node: Text, index, parent) => {
      if (index === undefined || !parent) return;
      if (!PLACEHOLDER.test(node.value)) {
        PLACEHOLDER.lastIndex = 0;
        return;
      }
      PLACEHOLDER.lastIndex = 0;
      const pieces: PhrasingContent[] = [];
      let last = 0;
      for (const m of node.value.matchAll(PLACEHOLDER)) {
        const start = m.index ?? 0;
        if (start > last) pieces.push({ type: "text", value: node.value.slice(last, start) });
        const idx = Number(m[1] ?? m[2]);
        const item = math[idx];
        if (item) pieces.push(item.display ? displayNode(item.source) : inlineNode(item.source));
        else pieces.push({ type: "text", value: m[0] });
        last = start + m[0].length;
      }
      if (last < node.value.length) pieces.push({ type: "text", value: node.value.slice(last) });
      parent.children.splice(index, 1, ...pieces);
      return [SKIP, index + pieces.length];
    });
  };
}

function inlineNode(value: string): InlineCode {
  return { type: "inlineCode", value, data: { hProperties: { className: ["math-inline"] } } };
}

function displayNode(value: string): InlineCode {
  return { type: "inlineCode", value, data: { hProperties: { className: ["math-display"] } } };
}

