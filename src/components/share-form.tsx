"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { parseShareUrl } from "@/lib/share-url";

export function ShareForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputId = useId();
  const errorId = useId();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = parseShareUrl(value);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setSubmitting(true);
    router.push(`/read/${result.id}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-describedby={error ? errorId : undefined} className="w-full">
      <label htmlFor={inputId} className="font-display block text-2xl sm:text-3xl">
        Paste a public ChatGPT share link
      </label>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          id={inputId}
          name="share-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="https://chatgpt.com/share/…"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error ? true : undefined}
          className="min-h-14 w-full min-w-0 border-2 border-black bg-white px-4 py-3 text-base text-black placeholder:text-neutral-400 focus:outline-3 focus:outline-offset-2 focus:outline-black"
        />
        <button
          type="submit"
          disabled={submitting}
          className="font-display min-h-14 shrink-0 border-2 border-black bg-black px-8 py-3 text-xl text-white transition-colors hover:bg-white hover:text-black focus-visible:outline-3 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-70 sm:text-2xl"
        >
          {submitting ? "Opening…" : "Open"}
        </button>
      </div>
      <div id={errorId} role="alert" aria-live="polite" className="mt-3 min-h-6 text-base font-semibold">
        {error ? <p className="border-l-4 border-black pl-3">{error}</p> : null}
      </div>
    </form>
  );
}
