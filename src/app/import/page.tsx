import type { Metadata } from "next";
import Link from "next/link";
import { SavedPageImport } from "@/components/saved-page-import";

export const metadata: Metadata = { title: "Open a saved page · Gpt View" };

export default function ImportPage() {
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
        <h1 className="font-display text-4xl sm:text-5xl">Open a saved page</h1>
        <p className="mt-4 text-lg leading-relaxed text-neutral-800">
          Open the share link in your browser, choose Save page as… and save it as an HTML file. Then choose that file
          below. Gpt View reads it on this device; the page is not uploaded.
        </p>
        <div className="mt-10">
          <SavedPageImport />
        </div>
      </main>
    </div>
  );
}
