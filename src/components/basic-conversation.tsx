import type { Block, Conversation } from "@/lib/share/model";

/**
 * Temporary plain-text view used in Phase 2 to prove the data is complete and ordered.
 * Phase 3 replaces this with Markdown, math, and code rendering.
 */
export function BasicConversation({ conversation }: { conversation: Conversation }) {
  return (
    <div className="space-y-8" data-testid="conversation">
      <ol className="space-y-6">
        {conversation.turns.map((turn, index) => (
          <li key={`${turn.id}-${index}`} data-role={turn.role} className="border-2 border-black p-5 sm:p-6">
            <p className="font-display text-xl">{turn.role === "user" ? "You" : "ChatGPT"}</p>
            <div className="mt-3 space-y-4">
              {turn.blocks.map((block, i) => (
                <BlockView key={i} block={block} />
              ))}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "markdown":
      return <p className="whitespace-pre-wrap break-words leading-relaxed">{block.text}</p>;
    case "code":
      return (
        <pre className="overflow-x-auto bg-neutral-100 p-3 text-sm">
          <code>{block.code}</code>
        </pre>
      );
    case "reasoning":
      return <p className="whitespace-pre-wrap text-sm text-neutral-600">{block.text}</p>;
    case "image":
      return <p className="text-sm italic text-neutral-600">[Image: {block.alt}]</p>;
    case "unsupported":
      return (
        <p className="border-l-4 border-black pl-3 text-sm">
          {block.note} {block.text ? <span className="whitespace-pre-wrap">{block.text}</span> : null}
        </p>
      );
  }
}
