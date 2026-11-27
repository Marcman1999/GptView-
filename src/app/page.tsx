import Link from "next/link";
import { ShareForm } from "@/components/share-form";

const EXAMPLE = "https://chatgpt.com/share/6b0893b9-6660-83e9-88e8-90d58706e477";

const FEATURES = [
  {
    no: "01",
    title: "Read the whole chat",
    body: "Every prompt and response in the order it was shared, with formatting kept intact.",
  },
  {
    no: "02",
    title: "Jump between answers",
    body: "A response panel lists every ChatGPT answer so you can move around long conversations quickly.",
  },
  {
    no: "03",
    title: "No account needed",
    body: "Paste a public link and read. No ChatGPT login, no API key, no GitHub connection.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b-2 border-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="font-display text-2xl tracking-wide">
            Gpt View
          </Link>
          <span className="text-sm font-semibold uppercase tracking-widest text-grey">Reader</span>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section className="mx-auto max-w-6xl px-5 pb-12 pt-12 sm:px-8 sm:pt-20">
          <h1 className="font-display text-[clamp(3.5rem,12vw,9rem)]">
            Read shared
            <br />
            ChatGPT chats
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-800 sm:text-xl">
            Gpt View turns a public ChatGPT share link into a clean, black-and-white reading page. Paste the link, press
            Open, and read.
          </p>

          <div className="mt-10 border-2 border-black p-5 shadow-[8px_8px_0_0_#000] sm:p-8">
            <ShareForm />
            <p className="mt-6 text-sm text-neutral-700">
              Try an example:{" "}
              <Link
                href="/read/6b0893b9-6660-83e9-88e8-90d58706e477"
                title={EXAMPLE}
                className="font-semibold text-black underline underline-offset-4 hover:no-underline"
              >
                chatgpt.com/share/6b0893b9…
              </Link>
            </p>
          </div>
        </section>

        <section aria-labelledby="features-title" className="border-y-2 border-black bg-black text-white">
          <h2 id="features-title" className="sr-only">
            What Gpt View does
          </h2>
          <ul className="mx-auto grid max-w-6xl gap-px bg-white sm:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.no} className="bg-black p-6 sm:p-8">
                <span className="font-display text-5xl text-neutral-500">{f.no}</span>
                <h3 className="font-display mt-3 text-3xl">{f.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-neutral-300">{f.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t-2 border-black">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-sm text-neutral-700 sm:flex-row sm:justify-between sm:px-8">
          <p>Gpt View reads public share links only. It is not affiliated with OpenAI.</p>
        </div>
      </footer>
    </div>
  );
}
