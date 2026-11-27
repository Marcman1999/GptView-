import type { Block, Conversation, Turn } from "@/lib/share/model";
import { CodeBlock } from "./code-block";
import { Markdown } from "./markdown";

/** Full conversation in order. Responses are Markdown; prompts are shown as written. */
export function ConversationView({ conversation }: { conversation: Conversation }) {
  return (
    <ol className="space-y-6" data-testid="conversation">
      {conversation.turns.map((turn, index) => (
        <TurnView key={`${turn.id}-${index}`} turn={turn} index={index} />
      ))}
    </ol>
  );
}

function TurnView({ turn, index }: { turn: Turn; index: number }) {
  const isUser = turn.role === "user";
  return (
    <li
      id={`turn-${index + 1}`}
      data-role={turn.role}
      className={
        isUser
          ? "border-2 border-black bg-neutral-100 p-5 sm:p-6"
          : "border-2 border-black bg-white p-5 sm:p-8"
      }
    >
      <p className="font-display text-xl">{isUser ? "You" : "ChatGPT"}</p>
      <div className="mt-3 min-w-0 space-y-4">
        {turn.blocks.map((block, i) => (
          <BlockView key={i} block={block} isUser={isUser} />
        ))}
      </div>
    </li>
  );
}

function BlockView({ block, isUser }: { block: Block; isUser: boolean }) {
  switch (block.kind) {
    case "markdown":
      return isUser ? (
        <p className="whitespace-pre-wrap break-words text-[1.0625rem] leading-relaxed">{block.text}</p>
      ) : (
        <Markdown text={block.text} />
      );
    case "code":
      return <CodeBlock language={block.language} code={block.code} label={block.label} />;
    case "reasoning":
      return (
        <details className="border-2 border-dashed border-black p-3">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-widest">Reasoning</summary>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-700">{block.text}</p>
        </details>
      );
    case "image":
      return (
        <p className="border-2 border-dashed border-black p-3 text-sm text-neutral-700">
          Image not shown yet{block.alt ? `: ${block.alt}` : ""}.
        </p>
      );
    case "unsupported":
      return (
        <div className="border-l-4 border-black pl-3 text-sm">
          <p>{block.note}</p>
          {block.text ? <p className="mt-2 whitespace-pre-wrap break-words text-neutral-700">{block.text}</p> : null}
        </div>
      );
  }
}
