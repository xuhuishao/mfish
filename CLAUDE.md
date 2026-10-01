# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server at http://localhost:3000
npm run build    # production build
npm run lint     # run ESLint (flat config via eslint.config.mjs)
```

There are no tests configured yet.

## Code style
- Always use server components by default; add `"use client"` only when
  a component needs state, effects, or browser APIs.

## Workflow rules
- Ask before installing a new dependency.

## Architecture
- Prefer Drizzle over Prisma when adding an ORM.
This is a **Next.js 16** app using the **App Router** with React 19, TypeScript, and Tailwind CSS v4. Source lives under `src/app/` (the `@/*` alias resolves to `./src/*`).

### Next.js 16 API differences from earlier versions

**Type helpers (globally available after `next dev`/`next build`/`next typegen` — no import needed):**
- `LayoutProps<'/route'>` — typed `children`, `params`, and named parallel-route slots for a layout
- `PageProps<'/route'>` — typed `params` and `searchParams` for a page

**`params` and `searchParams` are now Promises** — always `await` them or use React's `use()`:
```tsx
export default async function Page({ params }: PageProps<'/blog/[slug]'>) {
  const { slug } = await params
}
```

**Tailwind v4** — import syntax changed; globals.css uses `@import "tailwindcss"` (not `@tailwind base/components/utilities`). Theme overrides go inside `@theme inline { … }`.

**ESLint** uses the flat config format (`eslint.config.mjs`) with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.

### Routing conventions

Pages and layouts follow file-system routing under `src/app/`:
- `layout.tsx` — shared UI; root layout must include `<html>` and `<body>`
- `page.tsx` — public route leaf
- `loading.tsx`, `error.tsx`, `not-found.tsx` — special UI states
- `route.ts` — API endpoints
- `(group)/` — route groups (omitted from URL)
- `_folder/` — private folders (not routable; safe for colocated utilities)

All layouts and pages are **Server Components by default**. Add `'use client'` only when you need state, event handlers, lifecycle hooks, or browser APIs.
