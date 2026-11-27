"use client";

import { useId, useState, type ChangeEvent, type FormEvent } from "react";
import { ConversationView } from "./conversation-view";
import { parseSavedPage } from "@/lib/share/import-saved";
import type { Conversation } from "@/lib/share/model";

/** Reads a page the user saved from ChatGPT. Parsing happens in this browser tab only. */
export function SavedPageImport() {
  const fileId = useId();
  const textId = useId();
  const errorId = useId();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setText(await file.text());
    setError(null);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = parseSavedPage(text, fileName ?? "saved-page");
    if (result.ok) {
      setError(null);
      setConversation(result.conversation);
    } else {
      setConversation(null);
      setError(result.message);
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} noValidate aria-describedby={error ? errorId : undefined} className="space-y-6">
        <div>
          <label htmlFor={fileId} className="font-display block text-2xl">
            Choose a saved page (.html)
          </label>
          <input
            id={fileId}
            type="file"
            accept=".html,.htm,text/html"
            onChange={onFile}
            className="mt-3 block w-full border-2 border-ink bg-paper p-3 text-base file:mr-4 file:border-2 file:border-ink file:bg-ink file:px-4 file:py-2 file:font-semibold file:text-paper"
          />
        </div>
        <div>
          <label htmlFor={textId} className="font-display block text-2xl">
            Or paste the page source
          </label>
          <textarea
            id={textId}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setFileName(null);
            }}
            rows={6}
            spellCheck={false}
            className="mt-3 w-full border-2 border-ink bg-paper p-3 font-mono text-sm"
            placeholder="<!DOCTYPE html>…"
          />
        </div>
        <button
          type="submit"
          disabled={text.trim() === ""}
          className="font-display border-2 border-ink bg-ink px-8 py-3 text-xl text-paper hover:bg-paper hover:text-ink disabled:opacity-40"
        >
          Read saved page
        </button>
      </form>

      <div id={errorId} role="alert" aria-live="polite" className="mt-4 min-h-6 text-base font-semibold">
        {error ? <p className="border-l-4 border-ink pl-3">{error}</p> : null}
      </div>

      {conversation ? (
        <section aria-label="Saved chat" className="mt-10 border-t-2 border-ink pt-10" data-testid="saved-chat">
          <p className="text-sm font-semibold uppercase tracking-widest text-grey">
            {conversation.stats.responses} ChatGPT responses · {conversation.turns.length} turns
          </p>
          <h2 className="font-display mt-2 text-4xl">{conversation.title}</h2>
          <div className="mt-10">
            <ConversationView conversation={conversation} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
