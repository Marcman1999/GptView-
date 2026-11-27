import type { Block, Conversation, Turn } from "@/lib/share/model";
import { CodeBlock } from "./code-block";
import { Markdown } from "./markdown";
import { ImageBlock } from "./image-block";

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
      className={isUser ? "border-2 border-ink bg-mist p-5 sm:p-6" : "border-2 border-ink bg-paper p-5 sm:p-8"}
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
        <details className="border-2 border-dashed border-ink p-3">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-widest">Reasoning</summary>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-body">{block.text}</p>
        </details>
      );
    case "image":
      return <ImageBlock src={block.pointer} alt={block.alt} width={block.width} height={block.height} />;
    case "unsupported":
      return (
        <div className="border-l-4 border-ink pl-3 text-sm">
          <p>{block.note}</p>
          {block.text ? <p className="mt-2 whitespace-pre-wrap break-words text-body">{block.text}</p> : null}
        </div>
      );
  }
}
