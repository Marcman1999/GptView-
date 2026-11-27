import { parseChatGptPage } from "@/lib/chatgpt/parser";
import { ShareError, type Conversation } from "./model";

/** Largest saved page accepted by the import path (matches the server fetch cap). */
export const MAX_SAVED_BYTES = 5 * 1024 * 1024;

export type SavedPageResult = { ok: true; conversation: Conversation } | { ok: false; message: string };

/**
 * Parse a ChatGPT share page the user saved themselves. Runs in the browser, so the
 * page never leaves the device. Returns a message instead of throwing.
 */
export function parseSavedPage(html: string, label = "saved-page"): SavedPageResult {
  if (html.trim() === "") {
    return { ok: false, message: "The file is empty. Save the share page again and choose it here." };
  }
  if (new Blob([html]).size > MAX_SAVED_BYTES) {
    return { ok: false, message: "That file is larger than 5 MB, so it can't be read here." };
  }
  try {
    return { ok: true, conversation: parseChatGptPage(html, label, label) };
  } catch (err) {
    if (err instanceof ShareError) return { ok: false, message: err.message };
    return { ok: false, message: "This file doesn't look like a saved ChatGPT share page." };
  }
}
