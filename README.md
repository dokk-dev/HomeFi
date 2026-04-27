# Meridian

A personal learning OS. Organize your study into pillars, track tasks, run focus sessions, and get AI coaching with built-in mastery tests.

## Stack

- **Next.js 14** (App Router)
- **Supabase** (database + storage)
- **NextAuth** (GitHub + Google OAuth)
- **Gemini AI** (AI tutor + quiz generation)
- **Tailwind CSS**

---

## Setup

### 1. Clone

```bash
git clone <repo-url> meridian
cd meridian
npm install
```

### 2. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the following:

```sql
-- Profiles
create table profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Pillars
create table pillars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  slug text not null,
  label text not null,
  description text,
  color text not null default '#6366f1',
  icon_key text,
  position integer not null default 0,
  mastery integer not null default 0,
  created_at timestamptz default now()
);

-- Tasks
create table tasks (
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

-- Steps
create table steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  is_complete boolean not null default false,
  position integer not null default 0,
  created_at timestamptz default now()
);

-- Chat messages
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  pillar_slug text not null,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

-- Auto-update updated_at on tasks
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();
```

3. In **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. OAuth

**GitHub:**
1. Go to [github.com/settings/developers](https://github.com/settings/developers) → New OAuth App
2. Homepage URL: `http://localhost:3000`
3. Callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID and Client Secret

**Google:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth Client
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Copy Client ID and Client Secret

### 4. Gemini API key

Get a free key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

### 5. Environment

```bash
cp .env.example .env
# Fill in all values in .env
```

### 6. Run

```bash
npm run dev
# Open http://localhost:3000
```

Sign in with GitHub or Google — your pillars are created automatically on first login.

---

## Optional: Local AI (Ollama)

For fully offline AI responses:

```bash
# Install Ollama: https://ollama.com
ollama serve
ollama pull llama3
```

In the AI Tutor, switch the provider to **Ollama** in the model selector.

---

## Notes

- The app is single-tenant by design — each GitHub/Google account gets its own isolated data
- Gemini free tier is generous enough for personal use
- The `SUPABASE_SERVICE_ROLE_KEY` is used server-side only — never exposed to the client
