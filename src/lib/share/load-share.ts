import { shareUrlForId, isValidShareId } from "@/lib/share-url";
import { parseChatGptPage } from "@/lib/chatgpt/parser";
import { fetchShareHtml, type FetchShareOptions } from "./fetch-share";
import { ShareError, type LoadResult } from "./model";

/**
 * Load and parse a public share by its ID. Never throws: every failure becomes a
 * `{ ok: false }` result with a code and a message the reader can show.
 */
export async function loadShare(shareId: string, opts: FetchShareOptions = {}): Promise<LoadResult> {
  const id = shareId.toLowerCase();
  if (!isValidShareId(id)) {
    return { ok: false, code: "INVALID_URL", message: "This share link isn't valid." };
  }

  const sourceUrl = shareUrlForId(id);
  try {
    const html = await fetchShareHtml(sourceUrl, opts);
    const conversation = parseChatGptPage(html, id, sourceUrl);
    return { ok: true, conversation };
  } catch (err) {
    if (err instanceof ShareError) return { ok: false, code: err.code, message: err.message };
    console.error("Unexpected share parsing failure", err);
    return {
      ok: false,
      code: "PARSE_FAILED",
      message: "Something went wrong while reading this chat. Try again, or report the link if it keeps happening.",
    };
  }
}
