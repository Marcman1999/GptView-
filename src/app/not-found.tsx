import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-start justify-center gap-6 px-5 py-16 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-grey">Error 404</p>
      <h1 className="font-display text-6xl sm:text-8xl">Page not found</h1>
      <p className="max-w-xl text-lg text-neutral-800">
        This address isn&apos;t a Gpt View page. If you were opening a shared chat, check that the link is complete.
      </p>
      <Link href="/" className="font-display border-2 border-black bg-black px-6 py-3 text-xl text-white hover:bg-white hover:text-black">
        Go to start
      </Link>
    </div>
  );
}
