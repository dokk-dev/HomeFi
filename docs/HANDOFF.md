# Meridian — Handoff

Quick-orient doc for the next session or contributor. Read this first; the rest of `/docs` is reference.

## At a glance

- **What it is:** A self-hosted personal learning OS. Pillars (focus areas) → tasks → AI tutor + mastery quizzes.
- **Repo:** `dokk-dev/meridian` (branch: `main`).
- **Stack:** Next.js 14 App Router, React 18, TypeScript, Supabase (Postgres + RLS), NextAuth (GitHub + Google OAuth), Ollama (local AI), Tailwind, Zod.
- **Key invariants:**
  - Source of truth for schema is `migrations/*.sql` (numbered, idempotent, applied via `npm run update`). The `_meridian_migrations` table tracks applied state.
  - Service-role Supabase admin client is server-only (`src/lib/supabase/admin.ts`) — never imported into client components.
  - All API routes wrap with `withSession` (`src/lib/api/withSession.ts`) for auth and Zod for validation.
  - Cross-component state sync uses `window.dispatchEvent(new CustomEvent(...))`. Known events: `pillars-changed`, `pillar-label-changed`, `icon-overrides-changed`, `avatar-changed`, `sidebar-open`.

## Where things live

```
src/
├─ app/
│  ├─ api/                     Route handlers — withSession + Zod
│  │  └─ integrations/notion/  Notion OAuth + sync endpoints
│  └─ dashboard/               Authed UI; layout mounts OnboardingModal + UpdateNotice
├─ components/
│  ├─ chat/                    StudyAssistant + Ollama streaming
│  ├─ focus/                   FocusTimer (YouTube ambient music)
│  ├─ layout/                  Sidebar, TopBar, MobileNav
│  └─ onboarding/              OnboardingModal (first-run), UpdateNotice (per-release popup)
└─ lib/
   ├─ api/                     withSession, Zod schemas
   ├─ auth/                    NextAuth options + pillar seeding
   ├─ integrations/notion/     Notion client + one-way sync logic
   └─ supabase/                Admin + browser clients

migrations/                    Numbered SQL applied by scripts/update.mjs
scripts/setup.mjs              .env.local wizard
scripts/update.mjs             Pull → install → migrate → build orchestrator
{setup,start,update}.{command,bat}   Double-click wrappers
```

## Recent work (2026-05-04)

Shipped together in commits `6d61b8e` + `cb4875a`:

1. **Update system.** New migration runner connects to Supabase Postgres directly via `pg` and `DATABASE_URL`. Existing-schema detection auto-marks `001_initial` applied for users who ran the old hand-pasted SQL. Wrappers: `update.command` / `update.bat` / `npm run update`. Flags: `--no-pull`, `--no-install`, `--no-build`.
2. **Notion plugin.** One-way sync (Meridian → Notion). Custom OAuth (separate from NextAuth). On first sync, bootstraps a "Meridian" root page under any page the user has shared with the integration. Pillars become Notion databases, tasks become rows, AI tutor history appends as blocks, quiz results go into a "Quiz Log" database. Per-entity toggles in Settings → Integrations. Defaults: tasks/pillars/chat ON, quiz OFF.
3. **UpdateNotice popup.** One-time "what's new" modal in `src/components/onboarding/UpdateNotice.tsx`, gated by `CURRENT_VERSION` constant and `localStorage` key `meridian-update-seen`. Mounted in `src/app/dashboard/layout.tsx`.

Earlier in the same session: YouTube fade-in in `FocusTimer.tsx` (Choice A — `youtube-nocookie.com` + onLoad opacity transition); TopBar Quick Add list now subscribes to `pillars-changed` / `pillar-label-changed`.

## How to do common tasks

### Ship a new SQL migration
1. Add `migrations/NNN_short_description.sql`. Use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` so re-runs are safe.
2. Each migration runs in its own transaction (per `scripts/update.mjs`).
3. After merge, users run `./update.command` to apply.

### Bump the UpdateNotice popup
In `src/components/onboarding/UpdateNotice.tsx`:
1. Change `CURRENT_VERSION` to a new string (date-based works: `2026-06-01-foo`).
2. Update `TITLE`, `SUBTITLE`, `HIGHLIGHTS`. Each highlight needs an icon, title, body.
3. The next time any user loads `/dashboard`, the popup shows once and is dismissed forever (until the next bump).

### Add a new entity to Notion sync
1. Add a column to the source table for the external id (e.g. `quiz_results.notion_page_id` — note this isn't done yet for quiz; results are append-only via since-cursor).
2. In `src/lib/integrations/notion/sync.ts`: write a `syncFoo(supabase, notion, userId, rootPageId, since)` function. Match the pattern of `syncTasks` (idempotent upsert keyed by external id) or `syncChat` (cursor-based append).
3. Call it from `syncUser` based on a new `settings.foo` flag.
4. Update `DEFAULT_SYNC_SETTINGS` in the same file and the migration's default JSON for `notion_sync_settings`.
5. Add a toggle in `SettingsClient.tsx` Integrations panel.

### Add a new third-party integration (e.g. Linear)
Pattern is established by Notion. Needed pieces:
- Migration adding columns to `profiles` (access token, workspace metadata, sync settings) and external-id columns to whichever entities sync.
- `src/lib/integrations/linear/{client,sync}.ts` mirroring Notion's split.
- Routes under `src/app/api/integrations/linear/{authorize,callback,disconnect,sync,settings,log}/route.ts`.
- New section in the Settings → Integrations tab.
- Setup wizard prompts for OAuth env vars.

## Conventions and gotchas

- **Files under 500 lines.** Split when approaching.
- **No comments unless they explain WHY.** Don't restate what the code does.
- **No new top-level files.** Use `/scripts`, `/migrations`, `/docs`, `/src`. Wrappers (`*.command`, `*.bat`) are the documented exception at root.
- **Never commit `.env.local` or any secrets.** `.env*` is gitignored.
- **Supabase joins return arrays even for single FKs.** When using `pillars!inner(...)` joins, the join shape is `T | T[]`. See `src/lib/integrations/notion/sync.ts` for the `Array.isArray` guard pattern.
- **`Record<string, unknown>` vs Notion SDK types.** The Notion SDK's strict request types don't accept inferred-readonly object literals. Type the property builder return as `Record<string, any>` (see `buildTaskProperties` in sync.ts).
- **Build pitfall:** Piping `npm run build` to `tail` from a background shell can hang the parent on the pipe drain even after build completes. Run foreground for verification, or use the Monitor tool.
- **Quick Add modal does not live-update its pillar list.** It snapshots props on open. Closing/reopening picks up fresh data — acceptable for now.

## Out of scope / known caveats

- **Token storage.** `notion_access_token` is stored plaintext in `profiles`. Same risk surface as the rest of the data; flag for a future security pass.
- **Two-way Notion sync.** Out of scope. Source of truth stays Meridian; Notion content is overwritten.
- **Migration rollbacks.** Forward-only. There's no `down.sql` or rollback runner.
- **Per-pillar chat sync incremental cursor.** Currently uses `profiles.notion_last_synced_at` as a single global low-water mark. Adequate for now; per-pillar precision would need a JSON cursor map.
- **Renaming a pillar after first Notion sync** does not rename the Notion database. The DB id is stored once on creation; rename support TBD.
- **Rate limiting on `/api/integrations/notion/sync`.** Inherits the app-wide 30 req/min limit. A long sync that needs many Notion API calls is one request from our side; Notion's own rate limits aren't surfaced beyond raw error messages.

## Verification recipes

After a code change, the minimum check:
```bash
npm run build       # type + page generation
```

After a migration change:
```bash
npm run update      # applies pending migrations to your Supabase
# or, to skip the git pull / install if you're mid-flight:
npm run update -- --no-pull --no-install
```

After a Notion change, manual flow:
1. Settings → Integrations → Connect Notion (OAuth).
2. Pick a parent page in Notion's grant flow.
3. Click "Sync now". Watch the toast for counts.
4. Open Settings → Integrations → "Sync log (last 20)" for per-entity outcomes.

## Pointers

- Plan files (decision history): `~/.claude/plans/bubbly-finding-mist.md` is the most recent.
- The full transcript that produced this work: `~/.claude/projects/-Users-dakotahutson/`.
- Memory index used by Claude: `~/.claude/projects/-Users-dakotahutson/memory/MEMORY.md`.
