import { NextResponse } from "next/server";
import { loadShare } from "@/lib/share/load-share";
import type { ShareErrorCode } from "@/lib/share/model";

export const dynamic = "force-dynamic";

const STATUS: Record<ShareErrorCode, number> = {
  INVALID_URL: 400,
  NOT_FOUND: 404,
  UNAVAILABLE: 404,
  FETCH_FAILED: 502,
  TOO_LARGE: 413,
  PARSE_FAILED: 422,
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadShare(id);
  if (result.ok) {
    return NextResponse.json(result.conversation, { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(
    { error: { code: result.code, message: result.message } },
    { status: STATUS[result.code], headers: { "Cache-Control": "no-store" } },
  );
}
