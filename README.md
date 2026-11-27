# Gpt View

Gpt View is a free reader for public ChatGPT share links. Paste a link, press **Open**, and read the conversation in a clean black-and-white layout. No account, API key, or GitHub connection is needed.

Status: **Phase 1 (foundation and landing page)**. The conversation reader itself is built in later phases. See the project brief for the full plan.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4, Anton display face (self-hosted via `@fontsource/anton`)
- Vitest for unit tests, Puppeteer for browser UI checks
- Deploys to Vercel

## Development

```bash
npm install
npm run dev          # local dev server on http://localhost:3000
npm run lint
npx tsc --noEmit
npm test             # unit tests
npm run build        # production build
```

### Browser UI checks

`scripts/e2e/ui-check.mjs` opens the running app at desktop (1366px) and phone (375px) widths, checks validation messages, navigation, horizontal overflow, font loading, tap-target size, and console errors.

```bash
npm run build && npm start &          # serve on port 3000
CHROME_PATH=/path/to/chrome npm run test:ui
```

Screenshots are written to `test-results/ui/` (git-ignored).

## Project layout

```
src/app/page.tsx              landing page
src/app/read/[id]/page.tsx    reader route (placeholder until Phase 2)
src/components/share-form.tsx link input with validation
src/lib/share-url.ts          share-link parsing and validation
scripts/e2e/ui-check.mjs      browser checks
```

## Phase 2: reading shared chats (server side)

- `src/lib/chatgpt/turbo-stream.ts` decodes the React Router payload embedded in share pages.
- `src/lib/chatgpt/parser.ts` turns it into a provider-neutral `Conversation` (`src/lib/share/model.ts`). It follows the visible branch, merges consecutive assistant messages into one response, skips hidden and internal items (counted in `stats`), and marks anything it can't reproduce as an `unsupported` block.
- `src/lib/share/fetch-share.ts` fetches only `https://chatgpt.com/share/<id>`, follows same-site redirects only, and caps time and size.
- `GET /api/share/<id>` returns the conversation JSON or a coded error.
- Test fixtures in `src/lib/chatgpt/fixtures/` are real saved share pages from the MIT-licensed [ai-chat-share-export](https://github.com/xiaobin7060/ai-chat-share-export) project (licence copied alongside).

The sandbox cannot reach chatgpt.com, so live fetching is verified only after deployment.

## Phase 3: rendering text, Markdown, math and code

- `src/components/markdown.tsx` renders responses with GitHub Markdown (tables, task lists), KaTeX math, copyable code blocks, and safe links. Raw HTML from shared content is never rendered.
- `src/lib/markdown/math.ts` pulls out `\( … \)`, `\[ … \]`, `$$ … $$`, and `$…$` that looks like a formula before Markdown parsing. Prices such as `$5.4 million` stay as text. Code blocks and code spans are not touched.
- Remote images are not loaded yet. They show a placeholder with a link to the original (Phase 4).
- `src/components/conversation-view.tsx` shows the full conversation in order. Reasoning is collapsed in a disclosure. Unsupported content shows a note.
- The reader route uses one memoised load for the page and the title (`src/lib/share/get-share.ts`).
- Security headers (`nosniff`, `X-Frame-Options: DENY`, referrer policy) are set in `next.config.ts`. A full Content-Security-Policy comes in Phase 8.
