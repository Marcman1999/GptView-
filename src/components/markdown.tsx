import type { ComponentProps, ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import { prepareMath, remarkChatGptMath } from "@/lib/markdown/math";
import { CodeBlock } from "./code-block";
import { ImageBlock } from "./image-block";
import { codeFromChildren } from "@/lib/markdown/code";

/**
 * Renders assistant and user Markdown: GitHub tables and task lists, KaTeX math,
 * copyable code blocks, and external links that open safely. Raw HTML is not rendered.
 */
export function Markdown({ text }: { text: string }) {
  const prepared = prepareMath(text);
  return (
    <div className="chat-markdown min-w-0 break-words text-[1.0625rem] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkChatGptMath.bind(null, prepared.math) as never]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {prepared.text}
      </ReactMarkdown>
    </div>
  );
}

const components: Components = {
  pre({ children }: ComponentProps<"pre">) {
    const { language, code } = codeFromChildren(children);
    return <CodeBlock language={language} code={code} />;
  },
  a({ href, children }: ComponentProps<"a">) {
    const external = typeof href === "string" && /^https?:\/\//i.test(href);
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
        className="font-semibold underline underline-offset-4 hover:no-underline"
      >
        {children}
      </a>
    );
  },
  table({ children }: ComponentProps<"table">) {
    return (
      <div className="my-5 overflow-x-auto border-2 border-ink" tabIndex={0} role="region" aria-label="Table">
        <table className="w-full min-w-max border-collapse text-left text-[0.95rem]">{children}</table>
      </div>
    );
  },
  th({ children, style }: ComponentProps<"th">) {
    return (
      <th className="border-b-2 border-ink bg-ink px-3 py-2 font-semibold text-paper" style={style}>
        {children}
      </th>
    );
  },
  td({ children, style }: ComponentProps<"td">) {
    return (
      <td className="border-t border-ink px-3 py-2 align-top" style={style}>
        {children}
      </td>
    );
  },
  h1: (p) => <Heading level={2} {...p} />,
  h2: (p) => <Heading level={3} {...p} />,
  h3: (p) => <Heading level={4} {...p} />,
  h4: (p) => <Heading level={5} {...p} />,
  h5: (p) => <Heading level={5} {...p} />,
  h6: (p) => <Heading level={6} {...p} />,
  blockquote({ children }: ComponentProps<"blockquote">) {
    return <blockquote className="my-5 border-l-4 border-ink pl-4 text-body">{children}</blockquote>;
  },
  hr() {
    return <hr className="my-8 border-t-2 border-ink" />;
  },
  code({ className, children }: ComponentProps<"code">) {
    if (className?.includes("math-")) return <code className={className}>{children}</code>;
    return <code className="rounded-none bg-mist px-1.5 py-0.5 font-mono text-[0.9em] break-words">{children}</code>;
  },
  img({ src, alt }: ComponentProps<"img">) {
    return <ImageBlock src={typeof src === "string" ? src : null} alt={typeof alt === "string" ? alt : undefined} />;
  },
};

function Heading({ level, children }: { level: 2 | 3 | 4 | 5 | 6; children?: ReactNode }) {
  const Tag = `h${level}` as "h2" | "h3" | "h4" | "h5" | "h6";
  const size = level === 2 ? "text-3xl sm:text-4xl" : level === 3 ? "text-2xl" : "text-xl";
  return <Tag className={`font-display mt-8 mb-3 ${size}`}>{children}</Tag>;
}
