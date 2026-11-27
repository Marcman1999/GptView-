import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidShareId } from "@/lib/share-url";
import { getShare } from "@/lib/share/get-share";
import type { ShareErrorCode } from "@/lib/share/model";
import { ConversationView } from "@/components/conversation-view";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!isValidShareId(id)) return { title: "Not found" };
  const result = await getShare(id);
  if (result.ok) return { title: result.conversation.title };
  return { title: "Chat not available" };
}

const HEADINGS: Record<ShareErrorCode, string> = {
  INVALID_URL: "Invalid link",
  NOT_FOUND: "Chat not available",
  UNAVAILABLE: "Chat not available",
  FETCH_FAILED: "Connection problem",
  TOO_LARGE: "Chat too large",
  PARSE_FAILED: "Couldn't read this chat",
};

export default async function ReadPage({ params }: Props) {
  const { id } = await params;
  if (!isValidShareId(id)) notFound();

  const result = await getShare(id);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b-2 border-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="font-display text-2xl tracking-wide">
            Gpt View
          </Link>
          <Link href="/" className="text-sm font-semibold uppercase tracking-widest underline-offset-4 hover:underline">
            New link
          </Link>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-8">
        {result.ok ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-widest text-grey">
              {result.conversation.stats.responses} ChatGPT responses · {result.conversation.turns.length} turns
            </p>
            <h1 className="font-display mt-2 text-4xl sm:text-5xl">{result.conversation.title}</h1>
            <div className="mt-10">
              <ConversationView conversation={result.conversation} />
            </div>
          </>
        ) : (
          <section aria-labelledby="error-title" className="border-2 border-black p-6 sm:p-8" data-testid="share-error">
            <p className="text-sm font-semibold uppercase tracking-widest text-grey">Error · {result.code}</p>
            <h1 id="error-title" className="font-display mt-2 text-4xl sm:text-5xl">
              {HEADINGS[result.code]}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-neutral-800">{result.message}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/read/${id}`}
                className="font-display border-2 border-black bg-black px-6 py-3 text-xl text-white hover:bg-white hover:text-black"
              >
                Try again
              </Link>
              <Link href="/" className="font-display border-2 border-black px-6 py-3 text-xl hover:bg-black hover:text-white">
                ← Back
              </Link>
            </div>
            <p className="mt-8 text-base text-neutral-800">
              Still not working?{" "}
              <Link href="/import" className="font-semibold underline underline-offset-4">
                Open a saved copy of the page instead
              </Link>
              . It is read on your device.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
