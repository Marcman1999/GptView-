import { isValidShareId } from "@/lib/share-url";
import { SHARE_USER_AGENT } from "@/lib/share/fetch-share";

// TEMPORARY diagnostic: reports the shape of what the server receives. Removed before merge.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidShareId(id)) return Response.json({ error: "bad id" }, { status: 400 });
  const url = `https://chatgpt.com/share/${id}`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": SHARE_USER_AGENT, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9" },
    });
    const body = await res.text();
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(body)?.[1]?.slice(0, 120) ?? null;
    return Response.json({
      status: res.status,
      location: res.headers.get("location"),
      server: res.headers.get("server"),
      cfMitigated: res.headers.get("cf-mitigated"),
      contentType: res.headers.get("content-type"),
      bytes: body.length,
      ms: Date.now() - started,
      title,
      markers: {
        streamController: body.includes("streamController"),
        loaderData: body.includes("loaderData"),
        serverResponse: body.includes("serverResponse"),
        nextData: body.includes("__NEXT_DATA__"),
        linearConversation: body.includes("linear_conversation"),
        mapping: body.includes("mapping"),
        cloudflareChallenge: /challenge|cf-chl|cf_chl|Just a moment/i.test(body),
        enableJs: /enable javascript|requires javascript|noscript/i.test(body),
      },
      head: body.replace(/<script[\s\S]*?<\/script>/gi, "<script/>").replace(/\s+/g, " ").slice(0, 400),
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? `${err.name}: ${err.message}` : "unknown", ms: Date.now() - started }, { status: 502 });
  }
}
