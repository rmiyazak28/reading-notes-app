# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**memoLake** — a personal reading notes app (no SNS features). Users register books and attach memos, then search/filter them later. Deployed on Vercel with Supabase as the backend.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

There is no test runner configured yet.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) + React Compiler enabled |
| Styling | Tailwind CSS v4 |
| Language | TypeScript (strict — `any` is banned) |
| Auth / DB | Supabase Authentication + PostgreSQL |
| Server logic | Server Actions (no REST API routes except `/api/auth/callback`) |
| Hosting | Vercel |
| PWA | next-pwa (planned) |

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── (auth)/               # SCR-01 login, SCR-02 signup
│   ├── (protected)/          # Auth-gated pages
│   │   ├── home/             # SCR-03
│   │   ├── books/[id]/       # SCR-04, SCR-05
│   │   │   └── memo/new/     # SCR-07 (mobile only)
│   │   ├── memos/[id]/edit/  # SCR-06, SCR-08 (mobile only)
│   │   ├── favorites/        # SCR-09
│   │   └── settings/         # SCR-10
│   └── api/auth/callback/    # Supabase OAuth callback (only Route Handler)
├── features/
│   ├── books/    { components/, hooks/, actions/, types/ }
│   ├── memos/    { components/, hooks/, actions/, types/ }
│   └── auth/     { components/, hooks/, types/ }
├── components/   { ui/, layout/, common/ }
├── lib/
│   └── supabase/
│       ├── client.ts     # Browser / Client Component
│       ├── server.ts     # Server Components / Server Actions
│       └── middleware.ts # Session refresh in Next.js Middleware
├── hooks/
├── constants/
├── types/
└── middleware.ts
```

### Server Actions Pattern

All DB mutations go through Server Actions in `features/*/actions/`. Every action returns a unified type:

```ts
type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: ActionError };

type ActionError = {
  code: "UNAUTHORIZED" | "VALIDATION" | "NOT_FOUND" | "DB_ERROR" | "UNKNOWN";
  message: string;
};
```

Each action must call `auth.getUser()` at the top and validate input with Zod before touching the DB. `user_id` is always pulled from the session — never accepted from the client.

### Database Schema (Supabase / PostgreSQL)

Four tables — all rows are user-scoped and protected by RLS:

- **books** — `id, user_id, title, author, genre, status (unread/reading/completed), completed_at, created_at, updated_at`
  - UNIQUE `(user_id, title)`
  - `completed_at` required when `status = 'completed'`
- **reading_memos** — `id, user_id, book_id, page_number, content, favorite, created_at, updated_at`
- **tags** — `id, user_id, name`; UNIQUE `(user_id, name)`
- **memo_tags** — junction table `(memo_id, tag_id)`, composite PK

Full-text search uses `pg_trgm` GIN indexes. DB migrations live in `supabase/migrations/` and must be run manually in order (001–005). **Never auto-generate migrations or run DROP/DELETE SQL.**

### State Management

| State | Mechanism |
|---|---|
| Auth session | Supabase Auth |
| Search/filter | URL query parameters |
| Modal visibility | `useState` |
| Form state | React Hook Form |

### Responsive UI Pattern

Several screens have **different implementations by device**:
- Memo create/edit: modal (MOD-03/04) on PC, dedicated page (SCR-07/08) on mobile
- Book/memo lists: table on PC, card on mobile

## Absolute Rules (from `.cursor/rules/project.mdc`)

- Do not add libraries without explaining why; always justify `package.json` changes
- Never edit `.env` files
- No DROP/DELETE SQL; no auto-generated DB migrations
- Never `git commit` without user approval; never `git push`
- Never `rm -rf`
- Keep changes to ≤ 3 files per task; never do large refactors in one shot
- Only implement features that exist in the requirements doc
- Confirm the target screen ID before implementing UI

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # Server-side only; never use NEXT_PUBLIC_ prefix
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` is used only server-side (e.g., `deleteAccount` action via Supabase Admin API). Never expose it to the client.
