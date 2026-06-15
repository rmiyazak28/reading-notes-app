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

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) + React Compiler enabled |
| Styling | Tailwind CSS v4 |
| Language | TypeScript (strict — `any` is banned) |
| Auth / DB | Supabase Authentication + PostgreSQL |
| Server logic | Server Actions (no REST API routes except `/api/auth/callback`) |
| Hosting | Vercel |
| PWA | next-pwa |

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
│   │   └── settings/         # SCR-09
│   └── api/auth/callback/    # Supabase OAuth callback (only Route Handler)
├── features/
│   ├── books/    { components/, actions/, types/ }
│   ├── memos/    { components/, actions/, types/ }
│   ├── home/     { components/, actions/ }
│   └── auth/     { components/, actions/ }
├── components/   { ui/, layout/, common/ }
├── lib/
│   └── supabase/
│       ├── client.ts   # Browser / Client Component
│       ├── server.ts   # Server Components / Server Actions
│       └── proxy.ts    # Session refresh in Proxy (Next.js 16 規約)
├── hooks/
├── types/
└── proxy.ts
tests/
├── unit/   # vitest unit tests
└── e2e/    # Playwright e2e tests
    └── tests/
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

## Rules

- Always respond in Japanese.
- Before starting any implementation, present a list of all files to be created or modified with a summary of planned changes, and get user approval before proceeding. If anything is unclear, ask rather than assuming.
- Confirm the target screen ID before implementing UI.
- Only implement features that exist in the requirements doc.
- Never do large-scale rewrites or refactors in a single task; always propose changes in small, reviewable diffs.
- Never edit `.env` files.
- Never delete files or directories (no `rm`, `unlink`, or any equivalent).
- No DROP/DELETE SQL; no auto-generated DB migrations.
- Never `git push`, `git merge`, or `git commit` without user approval.
- Before modifying `package.json` or any config file (`next.config.*`, `tailwind.config.*`, `tsconfig.json`, etc.), explain the reason and get approval.
- When constructing git commit commands, always use multiple `-m` flags instead of heredoc (`<<'EOF'`) syntax. Heredoc causes parse errors in some shell environments.

## Code Comments

Write comments only when the reason behind the code is not obvious from reading it.

- Comments must explain **why**, not what.
- Good: `// Must pull user_id from session to prevent client-side tampering`
- Bad: `// Get user_id`

## On Errors

All build errors, type errors, and test failures may be fixed autonomously in a self-correction loop.

- After each fix attempt, log one line describing what was changed and why.
- Attempt the same error a maximum of 3 times.
- If not resolved after 3 attempts, stop and report: include the error details, fix history, and possible root causes. Wait for instructions.

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # Server-side only; never use NEXT_PUBLIC_ prefix
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` is used only server-side (e.g., `deleteAccount` action via Supabase Admin API). Never expose it to the client.

## Implementation and Testing Workflow

When asked to implement a screen or modal, execute the following steps in order. Report the result in one line after each step before proceeding. **The only stop point requiring user confirmation is Step 4.**

### Step 1: Implementation

- Present a list of all files to be created or modified with a summary of planned changes. Get user approval before writing any code.
- Implement based on the design information in CLAUDE.md and the design documents.
- Write comments only when the reason is not obvious (see `## Code Comments`).
- Run `npm run build` after implementation. If errors occur, apply the self-correction loop in `## On Errors`.
- Once the build passes, present the recommended commit message and wait for user approval.
  - Format: `feat: <画面ID> <内容を日本語で>` (e.g. `feat: MOD-01 書籍登録モーダルを実装`)

### Step 2: Unit Test Decision

Decide whether unit tests are needed and report the reason in one line.

Run unit tests (vitest) when the target includes:
- Server Actions logic (validation, error handling, branching)
- Utility functions with multiple branches
- Custom hooks logic

Skip unit tests when the target is:
- Simple UI components with no logic
- Page components that only pass data through

### Step 3: Unit Tests (only when required)

- Create test code under `tests/unit/`.
- Run `npm run test`. If tests fail, apply the self-correction loop in `## On Errors`.
- Once all tests pass, present the recommended commit message and wait for user approval.
  - Format: `test: <画面ID> <内容を日本語で>` (e.g. `test: MOD-01 書籍登録モーダルの単体テストを実施`)

### Step 4: Manual Test Scenario Output — STOP POINT

- Output a manual test scenario to `docs/test/manual/<screen-id>.md`. Include: target screen/modal ID, preconditions, operation steps and expected results per test case, and verification points (responsive layout, validation, error display).
- Present the recommended commit message and wait for user approval.
  - Format: `docs: <画面ID> <内容を日本語で>` (e.g. `docs: MOD-01 書籍登録モーダルのマニュアルテストシナリオを作成`)
- After committing, **stop here and wait** for the user to confirm that manual testing is complete.

### Step 5: E2E Tests

Execute only after the user confirms manual testing is complete.

- Create Playwright e2e test code under `tests/e2e/tests/`.
- Tests must be self-contained: use `beforeEach` to create any required test data via Supabase API, and `afterEach` to delete it. Never use `test.skip()` to work around missing data.
- Run `npm run test:e2e`. If tests fail, apply the self-correction loop in `## On Errors`.
- Once all tests pass, present the recommended commit message and wait for user approval.
  - Format: `test: <画面ID> <内容を日本語で>` (e.g. `test: MOD-01 書籍登録モーダルのe2eテストを実施`)

### Step 6: Completion Report

Report the following:

- List of implemented files
- Unit test results (if applicable)
- E2E test results

All git operations are performed manually by the user.