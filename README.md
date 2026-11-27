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
