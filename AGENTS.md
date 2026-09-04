# AGENTS.md

Context for AI coding assistants working on this repository. Read this before
editing anything; it records the decisions the code will not explain on its own.

Cross-tool file — Cursor, GitHub Copilot, Codex, Claude Code, Zed and others all
read `AGENTS.md`. Keep it at the repo root.

---

## What this is

**Green Point / EcoPoint** — a Thai-language web app for a university waste
programme. A student photographs sorted recyclables, an AI vision model
classifies the photo, the server awards points, and points are spent on rewards
from partner shops. Faculties compete on a leaderboard.

The audience is Thai students on phones, standing outside, holding a bin bag.
Most design decisions follow from that.

## Commands

```bash
bun dev             # dev server — always pass -p 3000 (see Gotchas)
bun run build       # production build
bun run lint        # eslint (next lint)
bun run typecheck   # tsc --noEmit
```

There is no test suite. **The verification gate is `typecheck` + `lint` +
`build`, all three, before calling any change done.**

Package manager is **bun** (`bun.lockb`). npm works, but do not commit a
`package-lock.json`.

## Stack

| | |
|---|---|
| Framework | Next.js 14, App Router (server components by default) |
| UI | React 18, Tailwind CSS 3.4; `lucide-react` in the dashboard only |
| Backend | Supabase (Postgres + Auth + Storage), RLS on every table |
| AI vision | Google Gemini via `@google/generative-ai` |
| Language | TypeScript, strict |

Environment variables (names only — values live in `.env.local`; never commit
them, never print them):

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
SUPABASE_SERVICE_ROLE_KEY     # server-only, bypasses RLS
GEMINI_API_KEY                # server-only
```

## Repo map

```
app/                   routes; each signed-in page = AppHeader + PageMain + BottomNav
  api/submit/          the only endpoint that creates points
  dashboard/           SEPARATE design system — see "The dashboard exception"
  login|register|...   signed-out screens, use AuthShell
components/            shared UI
  AppFrame.tsx         decides which routes get app chrome
  AppSidebar.tsx       desktop rail (md+)
  BottomNav.tsx        phone bar (below md)
  AppHeader.tsx        header + PageMain, the standard content column
  Icons.tsx            hand-rolled SVG icon set for the main app
  dashboard/           components for /dashboard only
lib/
  scoring.ts           the point economy — pure functions, no I/O
  guards.ts            rate limits, duplicate detection, anti-fraud
  phash.ts             perceptual hash (dHash) — "have I seen this scene before"
  gemini.ts            the vision call, server-only
  faculties.ts         faculty list read, tolerant of an un-migrated database
  supabase/            client / server / middleware factories
  types.ts             shared types
schema.sql             THE database. ~1600 lines. Single source of truth.
middleware.ts          auth gate for every route
```

---

## Rules that matter

### 1. Colour goes through tokens. Always.

`tailwind.config.ts` maps every colour to a CSS variable declared in
`app/globals.css` as RGB channels. Dark mode is one swap of `:root` values.

```tsx
// correct
<div className="bg-surface text-ink border-line">
<span className="bg-primary-soft text-primary-ink">

// WRONG — breaks dark mode silently
<div className="bg-white text-gray-900 dark:bg-gray-900">
<div style={{ color: '#2E7D32' }}>
```

Tokens: `canvas`, `surface`, `surface-sunken`, `line`, `line-strong`, `ink`,
`ink-muted`, `ink-subtle`, `primary{,-hover,-on,-soft,-ink}`, `leaf`, `mint`,
`ok-*`, `warn-*`, `danger-*`, `info-*`, `accent-*`, `hero-*`, `sky-*`.

**Never write a `dark:` prefix in the main app.** If a colour must change
between themes, the token changes, not the component. Radii are `rounded-card`
(16px) and `rounded-control` (12px) — two, deliberately.

Component classes live in `globals.css` — prefer them over re-typing utility
strings:

`.card` `.list-surface` `.app-header` `.section-title` `.badge`
`.btn` `.btn-primary` `.btn-secondary` `.btn-outline` `.btn-ghost` `.btn-danger` `.btn-sm`
`.input` `.field-label` `.field-hint`
`.meter` `.meter-fill` `.spinner` `.seg` `.seg-item` `.seg-item-on` `.seg-item-off`
`.hero-band` `.leaf-field` `.leaf-field-hero` `.tile` `.tile-label`
`.nums` (tabular figures — use on every points/weight number) `.text-balance`

### 2. The dashboard exception

`app/dashboard/**` and `components/dashboard/**` deliberately use **raw Tailwind
`emerald` / `teal` / `slate` classes**, not tokens. They were built to a separate
brief, are light-mode only, carry their own shell (`DashboardShell`), and are
excluded from `AppFrame`.

Do not "fix" that to use tokens unless asked, and do not copy its raw-colour
style back into the main app.

### 3. Layout: one phone column, one desktop rail

- Below `md`: `BottomNav` (fixed; 4 tabs plus a raised scan button).
- From `md`: `AppSidebar` (fixed, `w-64`), `BottomNav` becomes `md:hidden`, and
  content is offset by the `md:pl-64` that `AppFrame` applies.
- Content width lives in **one place** — `PageMain` in `AppHeader.tsx`
  (`max-w-md sm:max-w-2xl lg:max-w-4xl`). Widen a page there, not inline. The
  hero band in `app/page.tsx` has a matching container that must stay in sync.
- `AppFrame.CHROMELESS` lists routes that render their own shell (auth pages and
  `/dashboard`). A new route with its own layout must be added there.

### 4. The database is `schema.sql`, and it is replayed by hand

There is no migration tool. `schema.sql` is written to be **idempotent** —
`create ... if not exists`, `add column if not exists`, `on conflict do update` —
and is applied by pasting it into the Supabase SQL editor.

So:

- Any schema change goes **into `schema.sql`**, written so a re-run is safe.
- Never `DELETE` a row other tables reference. Retire it with `is_active = false`
  (see how the old faculty list is handled).
- Changing an RPC's return columns needs an explicit `drop function` first —
  Postgres will not let `create or replace` change a return type.
- **Application code must tolerate a database that has not been replayed yet.**
  `lib/faculties.ts` is the pattern: try the new shape, fall back to the old. A
  `select` naming a column that does not exist fails the *entire* request, which
  silently empties a list and hides the UI that depends on it.

### 5. Points are computed on the server, never sent by the client

`POST /api/submit` is the only path that creates points, and `add_points()` in
`schema.sql` is the only way a balance goes up. The client sends an image and
nothing else.

Anti-fraud lives in `lib/guards.ts` and should not be weakened casually:

- max **5** submissions per day per user
- SHA-256 exact-duplicate rejection, plus dHash near-duplicate detection —
  re-photographing the same bottle yields different bytes but a close hash
- the vision prompt flags screen-photos (moiré, screen edges, pixel grid)
- 10 MB limit; jpeg / png / webp / heic / heif, matching the storage bucket

`schema.sql` prices rewards on the assumption that the worst a cheater manages is
about 50 points/day. Raising caps or multipliers breaks that model — say so if
you are asked to.

### 6. Server-only means server-only

`lib/gemini.ts`, `lib/guards.ts`, `lib/phash.ts` and the admin Supabase client
all import `'server-only'`. `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and must
never reach a client component, a `NEXT_PUBLIC_` variable, or a log line.

Auth is enforced in `middleware.ts`; `PUBLIC_PATHS` there is the allowlist. API
routes answer with their own 401 JSON rather than redirecting to HTML.

### 7. Thai first

- Almost all UI text is Thai. Write new strings in Thai, informal and short —
  match the existing voice (`ลองใหม่อีกครั้งนะ`, not `กรุณาลองใหม่อีกครั้ง`).
- Every `fontSize` in `tailwind.config.ts` has a **roomier line-height than
  Tailwind's default**, because Thai stacks vowels and tone marks above and below
  the baseline and collides at 1.4. Do not add `leading-tight` to Thai text.
- Inter and Poppins are loaded **latin-only on purpose** — Thai glyphs come from
  the system stack at zero bytes. Do not add a Thai subset.
- Numbers are formatted with `toLocaleString('th-TH')`.

### 8. Comment style

This codebase comments **why**, not what — usually a short paragraph above a
component or a tricky line, naming the alternative that was rejected and the
reason. Match that density. Do not add `// set the state` noise, and do not strip
existing explanations when editing nearby code.

---

## Gotchas

- **Always start dev on port 3000 explicitly** (`bun dev -p 3000`). Next silently
  falls back to 3001 when 3000 is busy, and stale dev servers from earlier
  sessions are a recurring source of confusion.
- **Never run `next build` while a dev server is running.** They share `.next`,
  and the build fails with misleading errors — `PageNotFoundError: /_document`,
  or `Failed to collect page data` for a route you did not touch. Stop dev,
  delete `.next`, then build.
- `usePathname()` is typed `string` but can return `null`; every nav component
  guards with `(pathname ?? '')`. Keep that when adding one — an unguarded call
  in a root-level component blanks the whole app, not one route.
- Most routes 303-redirect to `/login` when signed out, so `curl` alone cannot
  verify them. Seeing the app requires a real session.

## Deployment

Vercel, auto-deploying from `main`. A code push is all a deploy needs; an
**environment variable change requires a manual Redeploy**, because
`NEXT_PUBLIC_*` values are baked in at build time and never read at runtime.

`vercel.json` pins functions to **`icn1` (Seoul)**. JSON cannot carry a comment,
so the reason lives here: the Supabase project is in **ap-northeast-2 (Seoul)**,
and every navigation makes three *sequential* Supabase round trips — the
middleware's `getUser()`, the page's `getProfile()`, then its `Promise.all`. On
the default `iad1` those three cross the Pacific and cost roughly 600 ms before
anything paints; in the same region as the database they cost single-digit
milliseconds. Seoul also happens to be far closer to Thai users than US East, so
it wins on both legs.

**If the Supabase project ever moves region, move this with it.** Picking a
region by "closest to the user" while the database sits elsewhere is slower than
leaving the default alone.

## Current known state

- `schema.sql` adds `faculties.campus_th` and reseeds the faculty list with the
  real **มทร.อีสาน (RMUTI)** units. **It has not been applied to the live Supabase
  project yet** — the running database still holds the old generic placeholder
  list. `lib/faculties.ts` handles both shapes.
- **Only `ศูนย์กลางนครราชสีมา` is in scope.** The other วิทยาเขต (ขอนแก่น, สกลนคร,
  สุรินทร์, ร้อยเอ็ด) are not seeded, and because earlier versions of `schema.sql`
  did seed some of them the file ends the faculty section with a retire
  statement — `is_active = false where campus_th is distinct from 'นครราชสีมา'`,
  never DELETE, since `profiles.faculty_id` may point at those rows. `is_active`
  is what both the RLS read policy and `get_faculty_leaderboard()` filter on, so
  retiring takes a campus out of the picker and the boards in one move.
  `CAMPUS_ORDER` in `components/FacultySelect.tsx` lists นครราชสีมา only.
