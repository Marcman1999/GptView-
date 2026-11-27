/**
 * Provider-neutral model of a shared conversation. The reader renders this shape,
 * so provider-specific parsing stays in src/lib/chatgpt.
 */

export type Role = "user" | "assistant";

export type Block =
  | { kind: "markdown"; text: string }
  | { kind: "code"; language: string; code: string; label?: string }
  | { kind: "reasoning"; text: string }
  | { kind: "image"; pointer: string; alt: string; width: number | null; height: number | null }
  /** Content we recognise but cannot reproduce yet. `text` keeps any readable fallback. */
  | { kind: "unsupported"; contentType: string; note: string; text: string };

export interface Turn {
  id: string;
  role: Role;
  /** ISO timestamp, or null when the share does not include one. */
  createdAt: string | null;
  model: string | null;
  blocks: Block[];
}

export interface ConversationStats {
  /** Turns shown in the reader. */
  turns: number;
  /** Assistant responses shown (what the response panel lists). */
  responses: number;
  /** Internal or hidden messages that are intentionally not shown. */
  hiddenMessages: number;
  /** Blocks the reader can't reproduce yet; shown as notes, never silently dropped. */
  unsupportedBlocks: number;
  images: number;
}

export interface Conversation {
  shareId: string;
  title: string;
  sourceUrl: string;
  createdAt: string | null;
  updatedAt: string | null;
  turns: Turn[];
  stats: ConversationStats;
}

export type ShareErrorCode =
  | "INVALID_URL"
  | "NOT_FOUND"
  | "UNAVAILABLE"
  | "FETCH_FAILED"
  | "TOO_LARGE"
  | "PARSE_FAILED";

export class ShareError extends Error {
  readonly code: ShareErrorCode;
  constructor(code: ShareErrorCode, message: string) {
    super(message);
    this.name = "ShareError";
    this.code = code;
  }
}

export type LoadResult =
  | { ok: true; conversation: Conversation }
  | { ok: false; code: ShareErrorCode; message: string };
