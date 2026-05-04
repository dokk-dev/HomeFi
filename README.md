# Meridian

A personal learning OS. Organize your study into customizable pillars, track tasks, run focus sessions, and get AI coaching with built-in mastery tests.

## Features

- **Configurable pillars** — Create, rename, recolor, and pick icons for any number of focus areas (study, projects, career, hobbies — whatever fits your life)
- **Tasks + steps** — Break work down, mark progress, schedule with due dates and recurrence
- **Focus session** — Surfaces the most relevant task to work on next
- **AI Tutor** — Per-pillar chat that knows your tasks; powered by local Ollama (fully offline)
- **Weekly momentum** — Visualizes completions across the current week
- **Onboarding wizard** — First-run UI walkthrough plus a CLI setup script for env vars

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Supabase** (Postgres + RLS-bypass admin client server-side)
- **NextAuth** (GitHub + Google OAuth, JWT sessions)
- **Ollama** (local, offline AI)
- **Tailwind CSS**
- **Zod** runtime validation at API boundaries
- In-memory **rate limiting** (30 req/min per user)

---

## Quick Start (no terminal required)

> Friendly path for first-time users. You only need [Node.js LTS](https://nodejs.org) installed.

1. Download or clone this repo.
2. **macOS:** double-click `setup.command`. **Windows:** double-click `setup.bat`.
3. Follow the prompts (it asks for Supabase keys, OAuth keys, your Postgres connection string, and your Ollama URL).
4. **macOS:** double-click `update.command`. **Windows:** double-click `update.bat`. This applies the database schema.
5. **macOS:** double-click `start.command`. **Windows:** double-click `start.bat`.

The app opens at `http://localhost:3000`. The start script will auto-install dependencies and re-run setup if `.env.local` is missing.

> First time on macOS, Gatekeeper may block `.command` files. Right-click → **Open** once to approve them.

You'll need a Supabase project and at least one OAuth provider registered before sign-in works.

---

## Updating

When new code lands on `main`:

- **macOS:** double-click `update.command`. **Windows:** double-click `update.bat`.
- Or: `npm run update`.

The update script:
1. Pulls the latest code (`git pull --ff-only`).
2. Installs any new dependencies.
3. Applies any pending SQL migrations from `migrations/` to your Supabase project (tracked in `_meridian_migrations`).
4. Rebuilds the app.

Migrations are forward-only and idempotent — re-running is safe. To skip steps: `npm run update -- --no-pull`, `--no-install`, or `--no-build`.

---

## Manual Setup (terminal)

### 1. Clone + install

```bash
git clone https://github.com/dokk-dev/HomeFi.git meridian
cd meridian
npm install
```

### 2. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`
3. In **Project Settings → Database → Connection string → URI**, copy the full Postgres URL → `DATABASE_URL` (substitute your DB password).
4. Apply the schema with `npm run update` (or double-click `update.command` / `update.bat`). The migration runner reads from `migrations/` and tracks applied state in the `_meridian_migrations` table.

Schema source of truth: the numbered SQL files in `migrations/`. The legacy `src/supabase/*.sql` files are retained for reference only.

### 3. OAuth (at least one provider required)

**GitHub:**
1. [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App
2. Homepage URL: `http://localhost:3000`
3. Callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID + Secret

**Google:**
1. [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth Client
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Copy Client ID + Secret

### 4. AI provider — Ollama (required)

The AI tutor and rubric/quiz generation run on **local Ollama** — no cloud calls, no API keys.

1. Install Ollama from [ollama.com](https://ollama.com)
2. Pull a model: `ollama pull llama3`
3. Start the daemon: `ollama serve`

Cloud providers (Claude first, Gemini later) will be added in a future release.

### 5. Notion integration (optional)

One-way sync of tasks, pillars, AI tutor history, and quiz results into your Notion workspace. To enable:

1. Create a public OAuth integration at [notion.so/my-integrations](https://www.notion.so/my-integrations).
2. Set the redirect URI to `http://localhost:3000/api/integrations/notion/callback` (or your deployed equivalent).
3. Copy the Client ID and Client Secret into `.env.local` as `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`, and `NOTION_REDIRECT_URI` (or re-run `npm run setup`).
4. In Notion, share at least one page with your integration so it has somewhere to write.
5. In Meridian go to **Settings → Integrations → Connect Notion**, then click **Sync now**.

Defaults sync Tasks, Pillars, and AI suggestions; Quiz/mastery is opt-in. Source of truth stays in Meridian — Notion content is overwritten on conflict. Disconnecting clears the access token but does not delete content already synced.

### 6. Environment

Run the wizard:

```bash
npm run setup
```

Or copy the template manually:

```bash
cp .env.example .env.local
# fill in values
```

### 7. Run

```bash
npm run dev
# open http://localhost:3000
```

Sign in with GitHub or Google — three starter pillars (Learning / Projects / Career) are created automatically. Customize them at any time in **Settings**.

---

## Project Structure

```
src/
├── app/
│   ├── api/                    Next.js Route Handlers (Zod-validated)
│   ├── auth/                   Sign-in pages
│   └── dashboard/
│       ├── ai-tutor/           Per-pillar AI chat
│       ├── pillars/[slug]/     Pillar detail + tasks
│       ├── settings/           Profile + pillar management
│       └── stats/              Long-term progress
├── components/
│   ├── chat/                   StudyAssistant + Ollama streaming client
│   ├── layout/                 Sidebar, TopBar
│   ├── onboarding/             First-run modal
│   ├── pillars/                Pillar grid + cards
│   └── tasks/                  Task list + focus section
└── lib/
    ├── api/                    Schemas (Zod) + middleware (session, rate limit)
    ├── auth/                   NextAuth options + pillar seeding
    ├── icons/                  resolveIcon() priority chain
    ├── supabase/               Admin + browser clients
    └── types.ts                Shared TS types

migrations/                     Numbered SQL migrations applied by `npm run update`
scripts/setup.mjs               Interactive .env.local wizard
scripts/update.mjs              Pull + install + apply migrations + build
setup.command / setup.bat       Double-click wrappers for setup
start.command / start.bat       Double-click wrappers to launch
update.command / update.bat     Double-click wrappers to update
```

## Notes

- Single-tenant by design — each OAuth account has fully isolated data via RLS-aware queries.
- The `SUPABASE_SERVICE_ROLE_KEY` is used server-side only — never exposed to the client.
- Pillar icons are stored in the DB (`pillars.icon_key`) and persist across devices; localStorage acts as a cache only.
- AI prompts adapt to custom pillars — there's a generic system-prompt builder that uses the pillar's label + description.
