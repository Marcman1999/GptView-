import { ShareError, type Block, type Conversation, type Role, type Turn, type ConversationStats } from "@/lib/share/model";
import { decodeTurboStreamFromHtml } from "./turbo-stream";

/**
 * Turns a ChatGPT share page into a Conversation.
 *
 * Visible order comes from `linear_conversation` (or the mapping walked back from
 * `current_node`), so abandoned branches and regenerated drafts are not shown.
 * Hidden system messages, internal channels, and status-only items are skipped
 * and counted in `stats`. Anything else that cannot be reproduced becomes an
 * "unsupported" block so the reader can say so.
 */

type Rec = Record<string, unknown>;

export function parseChatGptPage(html: string, shareId: string, sourceUrl: string): Conversation {
  const data = locateConversation(html);
  const title = typeof data.title === "string" && data.title.trim() !== "" ? data.title.trim() : "Untitled chat";

  const nodes = orderedNodes(data);
  const stats: ConversationStats = { turns: 0, responses: 0, hiddenMessages: 0, unsupportedBlocks: 0, images: 0 };
  const turns: Turn[] = [];

  for (const node of nodes) {
    const message = asRecord(asRecord(node)?.message);
    if (!message) continue;

    const role = asRecord(message.author)?.role;
    if (role !== "user" && role !== "assistant") {
      stats.hiddenMessages++;
      continue;
    }
    const metadata = asRecord(message.metadata) ?? {};
    if (truthy(metadata.is_visually_hidden_from_conversation)) {
      stats.hiddenMessages++;
      continue;
    }
    const channel = message.channel;
    if (role === "assistant" && typeof channel === "string" && channel !== "" && channel !== "final") {
      stats.hiddenMessages++;
      continue;
    }
    const recipient = message.recipient;
    if (typeof recipient === "string" && recipient !== "" && recipient !== "all") {
      stats.hiddenMessages++;
      continue;
    }

    const blocks = messageBlocks(message, role, metadata, stats);
    if (blocks.length === 0) continue;

    const id = typeof message.id === "string" ? message.id : `turn-${turns.length}`;
    const last = turns[turns.length - 1];
    if (last && last.role === role) {
      last.blocks.push(...blocks);
      continue;
    }
    turns.push({
      id,
      role,
      createdAt: toIso(message.create_time),
      model: role === "assistant" ? stringOrNull(metadata.model_slug) : null,
      blocks,
    });
  }

  if (turns.length === 0) {
    throw new ShareError("UNAVAILABLE", "This shared chat has no visible messages.");
  }

  stats.turns = turns.length;
  stats.responses = turns.filter((t) => t.role === "assistant").length;

  return {
    shareId,
    title,
    sourceUrl,
    createdAt: toIso(data.create_time),
    updatedAt: toIso(data.update_time),
    turns,
    stats,
  };
}

/** Find the conversation record inside the decoded page payload. */
export function locateConversation(html: string): Rec {
  let root: unknown = null;
  try {
    root = decodeTurboStreamFromHtml(html);
  } catch {
    root = null;
  }

  const rootRecord = asRecord(root);
  const loaderData = asRecord(rootRecord?.loaderData);
  let serverResponse: Rec | null = null;
  if (loaderData) {
    for (const routeData of Object.values(loaderData)) {
      const found = asRecord(asRecord(routeData)?.serverResponse);
      if (found) {
        serverResponse = found;
        break;
      }
    }
  }

  // Legacy pages embedded the same object in __NEXT_DATA__.
  if (!serverResponse) {
    const next = /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
    if (next?.[1]) {
      try {
        const parsed = asRecord(JSON.parse(next[1]));
        serverResponse = asRecord(asRecord(asRecord(parsed?.props)?.pageProps)?.serverResponse);
      } catch {
        serverResponse = null;
      }
    }
  }

  if (!serverResponse) {
    throw new ShareError("PARSE_FAILED", "We couldn't find the conversation in this page. ChatGPT may have changed its share format.");
  }

  if (serverResponse.type === "error") {
    throw new ShareError("NOT_FOUND", "This share link is no longer available. The owner may have deleted it or stopped sharing.");
  }

  const data = asRecord(serverResponse.data) ?? (asRecord(serverResponse.mapping) ? serverResponse : null);
  if (!data) {
    throw new ShareError("PARSE_FAILED", "The conversation data in this page is incomplete.");
  }
  return data;
}

function orderedNodes(data: Rec): unknown[] {
  if (Array.isArray(data.linear_conversation) && data.linear_conversation.length > 0) {
    return data.linear_conversation;
  }
  const mapping = asRecord(data.mapping);
  if (!mapping) return [];

  let current: unknown = data.current_node;
  if (typeof current !== "string" || !has(mapping, current)) {
    current = undefined;
    for (const [id, node] of Object.entries(mapping)) {
      if (asRecord(node) && isEmpty(asRecord(node)?.children)) current = id;
    }
  }

  const chain: unknown[] = [];
  const seen = new Set<string>();
  let id: unknown = current;
  while (typeof id === "string" && has(mapping, id) && !seen.has(id)) {
    seen.add(id);
    chain.push(mapping[id]);
    id = asRecord(mapping[id])?.parent;
  }
  return chain.reverse();
}

function messageBlocks(message: Rec, role: Role, metadata: Rec, stats: ConversationStats): Block[] {
  const content = asRecord(message.content) ?? {};
  const type = content.content_type;
  const blocks: Block[] = [];

  switch (type) {
    case "text":
    case "multimodal_text": {
      const parts = Array.isArray(content.parts) ? content.parts : typeof content.parts === "string" ? [content.parts] : [];
      let text = "";
      const flush = () => {
        const cleaned = role === "assistant" ? cleanAssistantMarkdown(text, metadata) : normalizeNewlines(text).trim();
        if (cleaned !== "") blocks.push({ kind: "markdown", text: cleaned });
        text = "";
      };
      for (const part of parts) {
        if (typeof part === "string") {
          text += text === "" ? part : `\n\n${part}`;
          continue;
        }
        const record = asRecord(part);
        if (!record) continue;
        if (record.content_type === "image_asset_pointer") {
          flush();
          const pointer = typeof record.asset_pointer === "string" ? record.asset_pointer : "";
          blocks.push({
            kind: "image",
            pointer,
            alt: typeof record.alt === "string" ? record.alt : "Image from the shared chat",
            width: numberOrNull(record.width),
            height: numberOrNull(record.height),
          });
          stats.images++;
        } else if (typeof record.text === "string") {
          text += text === "" ? record.text : `\n\n${record.text}`;
        } else {
          flush();
          blocks.push(unsupported(String(record.content_type ?? "part"), "This part of the message can't be shown yet.", ""));
        }
      }
      flush();
      break;
    }
    case "code":
      blocks.push({
        kind: "code",
        language: stringOrNull(content.language) ?? "text",
        code: typeof content.text === "string" ? content.text : "",
      });
      break;
    case "execution_output":
      blocks.push({ kind: "code", language: "text", code: stringOrNull(content.text) ?? "", label: "Output" });
      break;
    case "thoughts": {
      const thoughts = Array.isArray(content.thoughts) ? content.thoughts : [];
      const text = thoughts
        .map((t) => stringOrNull(asRecord(t)?.content) ?? "")
        .filter((t) => t !== "")
        .join("\n\n");
      if (text !== "") blocks.push({ kind: "reasoning", text });
      break;
    }
    case "reasoning_recap":
    case "model_editable_context":
    case "user_editable_context":
      // Status and internal context, not part of the conversation text.
      break;
    default:
      blocks.push(unsupported(String(type ?? "unknown"), "This kind of content can't be reproduced yet.", fallbackText(content)));
  }

  // Code-block widgets duplicate fenced code already present in the text, so only
  // other component types count as content we can't reproduce.
  const components = Array.isArray(metadata.genui_components) ? metadata.genui_components : [];
  const extra = components.filter((c) => asRecord(c)?.type !== "code_block");
  if (extra.length > 0) {
    blocks.push(unsupported("genui", "This response included interactive components that can't be reproduced yet.", ""));
  }

  for (const block of blocks) if (block.kind === "unsupported") stats.unsupportedBlocks++;
  return blocks;
}

function unsupported(contentType: string, note: string, text: string): Block {
  return { kind: "unsupported", contentType, note, text };
}

function fallbackText(content: Rec): string {
  if (typeof content.text === "string") return content.text;
  if (Array.isArray(content.parts)) {
    return content.parts.filter((p): p is string => typeof p === "string").join("\n\n");
  }
  return "";
}

/** Keep assistant Markdown. Strip ChatGPT-only wrappers and citation markers. */
export function cleanAssistantMarkdown(text: string, metadata: Rec = {}): string {
  let cleaned = normalizeNewlines(text);
  cleaned = cleaned.replace(/<CodeBlock\b([^>]*)>\n?([\s\S]*?)\n?<\/CodeBlock>/g, (_full, attrs: string, code: string) => {
    const lang = /\blanguage\s*=\s*["']([A-Za-z0-9_+#.-]*)["']/.exec(attrs)?.[1] ?? "";
    let fence = "```";
    while (code.includes(fence)) fence += "`";
    return `${fence}${lang}\n${code}\n${fence}`;
  });

  cleaned = cleaned.replace(/\uE200[^\uE201]*\uE201/gu, "");
  cleaned = cleaned.replace(/[\uE200-\uE2FF]/gu, "");
  cleaned = cleaned.replace(/【\d+(?::\d+)?†[^】]*】/gu, "");

  if (Array.isArray(metadata.content_references)) {
    for (const ref of metadata.content_references) {
      const record = asRecord(ref);
      const matched = record?.matched_text;
      if (typeof matched !== "string" || matched.trim() === "") continue;
      const alt = typeof record?.alt === "string" ? record.alt : "";
      cleaned = cleaned.split(matched).join(alt);
    }
  }
  return cleaned.trim();
}

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function toIso(seconds: unknown): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

function asRecord(value: unknown): Rec | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Rec) : null;
}

function has(mapping: Rec, id: string): boolean {
  return Object.prototype.hasOwnProperty.call(mapping, id) && mapping[id] != null;
}

function truthy(value: unknown): boolean {
  return !isEmpty(value);
}

/** PHP-style emptiness: null, false, 0, "", "0", [], {}. */
function isEmpty(value: unknown): boolean {
  if (value == null || value === false || value === 0 || value === "" || value === "0") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
