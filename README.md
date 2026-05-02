# Meridian

A personal learning OS. Organize your study into customizable pillars, track tasks, run focus sessions, and get AI coaching with built-in mastery tests.

## Features

- **Configurable pillars** — Create, rename, recolor, and pick icons for any number of focus areas (study, projects, career, hobbies — whatever fits your life)
- **Tasks + steps** — Break work down, mark progress, schedule with due dates and recurrence
- **Focus session** — Surfaces the most relevant task to work on next
- **AI Tutor** — Per-pillar chat that knows your tasks; powered by Gemini (cloud) or Ollama (local, offline)
- **Weekly momentum** — Visualizes completions across the current week
- **Onboarding wizard** — First-run UI walkthrough plus a CLI setup script for env vars

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Supabase** (Postgres + RLS-bypass admin client server-side)
- **NextAuth** (GitHub + Google OAuth, JWT sessions)
- **Gemini AI** + optional **Ollama** local models
- **Tailwind CSS**
- **Zod** runtime validation at API boundaries
- In-memory **rate limiting** (30 req/min per user)

---

## Quick Start (no terminal required)

> Friendly path for first-time users. You only need [Node.js LTS](https://nodejs.org) installed.

1. Download or clone this repo.
2. **macOS:** double-click `setup.command`. **Windows:** double-click `setup.bat`.
3. Follow the prompts (it asks for Supabase keys, OAuth keys, Ollama URL, optional Gemini).
4. **macOS:** double-click `start.command`. **Windows:** double-click `start.bat`.

The app opens at `http://localhost:3000`. The start script will auto-install dependencies and re-run setup if `.env.local` is missing.

> First time on macOS, Gatekeeper may block `.command` files. Right-click → **Open** once to approve them.

You'll still need a Supabase project with the schema applied (see below) and at least one OAuth provider registered before sign-in works.

---

## Manual Setup (terminal)

### 1. Clone + install

```bash
git clone https://github.com/dokk-dev/HomeFi.git meridian
cd meridian
npm install
```

### 2. Supabase

Create a free project at [supabase.com](https://supabase.com), then in **SQL Editor** paste and run the block below. It's idempotent — safe to re-run if you ever need to fix a partial setup.

```sql
-- ── Profiles ──────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- ── Pillars ───────────────────────────────────────────────────────────────
create table if not exists pillars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  slug text not null,
  label text not null,
  description text,
  color text not null default '#6366f1',
  icon_key text,
  position integer not null default 0,
  mastery integer not null default 0,
  competency_areas jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

-- Backfill new column on existing rows (no-op if already added)
alter table pillars add column if not exists competency_areas jsonb not null default '[]'::jsonb;

create index if not exists pillars_user_idx on pillars (user_id, position);
create unique index if not exists pillars_user_slug_unique on pillars (user_id, slug);

-- ── Tasks ─────────────────────────────────────────────────────────────────
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  pillar_id uuid not null references pillars(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  notes text,
  is_complete boolean not null default false,
  advisory_minutes integer,
  position integer not null default 0,
  due_date date,
  recurrence_rule jsonb,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists tasks_pillar_idx on tasks (pillar_id, position);
create index if not exists tasks_user_updated_idx on tasks (user_id, updated_at desc);

-- ── Steps ─────────────────────────────────────────────────────────────────
create table if not exists steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  is_complete boolean not null default false,
  position integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists steps_task_idx on steps (task_id, position);

-- ── Chat messages ─────────────────────────────────────────────────────────
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  pillar_slug text not null,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

create index if not exists chat_messages_user_pillar_idx
  on chat_messages (user_id, pillar_slug, created_at);

-- ── Quiz results (drives mastery scoring) ────────────────────────────────
create table if not exists quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  pillar_id uuid not null references pillars(id) on delete cascade,
  competency_name text not null,
  score numeric(4,3) not null check (score >= 0 and score <= 1),
  max_score integer not null default 10,
  questions jsonb not null default '[]'::jsonb,
  taken_at timestamptz default now()
);

create index if not exists quiz_results_pillar_competency_idx
  on quiz_results (pillar_id, competency_name, taken_at);
create index if not exists quiz_results_user_idx
  on quiz_results (user_id, taken_at);

-- ── updated_at trigger for tasks ─────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_updated_at on tasks;
create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();
```

In **Project Settings → API**, copy:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- service_role key → `SUPABASE_SERVICE_ROLE_KEY`

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

### 4. AI provider (pick one or both)

- **Gemini** (cloud, free tier) — [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- **Ollama** (local, fully offline) — install from [ollama.com](https://ollama.com), then `ollama serve && ollama pull llama3`

### 5. Environment

Run the wizard:

```bash
npm run setup
```

Or copy the template manually:

```bash
cp .env.example .env.local
# fill in values
```

### 6. Run

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
│   ├── chat/                   StudyAssistant + Gemini/Ollama clients
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

scripts/setup.mjs               Interactive .env.local wizard
setup.command / setup.bat       Double-click wrappers for setup
start.command / start.bat       Double-click wrappers to launch
```

## Notes

- Single-tenant by design — each OAuth account has fully isolated data via RLS-aware queries.
- The `SUPABASE_SERVICE_ROLE_KEY` is used server-side only — never exposed to the client.
- Pillar icons are stored in the DB (`pillars.icon_key`) and persist across devices; localStorage acts as a cache only.
- AI prompts adapt to custom pillars — there's a generic system-prompt builder that uses the pillar's label + description.
