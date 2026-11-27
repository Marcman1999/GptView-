import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidShareId } from "@/lib/share-url";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: isValidShareId(id) ? "Reader" : "Not found" };
}

export default async function ReadPage({ params }: Props) {
  const { id } = await params;
  if (!isValidShareId(id)) notFound();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b-2 border-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="font-display text-2xl tracking-wide">
            Gpt View
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-grey">Share ID</p>
        <p className="mt-1 break-all font-mono text-sm">{id}</p>
        <h1 className="font-display mt-6 text-5xl sm:text-6xl">Reader coming next</h1>
        <p className="mt-6 text-lg leading-relaxed text-neutral-800">
          The link is valid. Loading and displaying the conversation is part of Phase 2, so this page does not show
          any chat content yet.
        </p>
        <Link
          href="/"
          className="font-display mt-10 inline-block border-2 border-black px-6 py-3 text-xl hover:bg-black hover:text-white"
        >
          ← Back
        </Link>
      </main>
    </div>
  );
}
