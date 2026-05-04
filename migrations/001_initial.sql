-- ============================================================
-- 001_initial.sql
-- Consolidated baseline schema for Meridian.
--
-- Idempotent: safe to re-run. The update runner pre-marks this
-- as applied for users who ran the README schema by hand.
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Profiles ──────────────────────────────────────────────────────────────
create table if not exists profiles (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  display_name  text,
  avatar_url    text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── Pillars ───────────────────────────────────────────────────────────────
create table if not exists pillars (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references profiles(id) on delete cascade,
  slug              text not null,
  label             text not null,
  description       text,
  color             text not null default '#6366f1',
  icon_key          text,
  position          integer not null default 0,
  mastery           integer not null default 0,
  competency_areas  jsonb not null default '[]'::jsonb,
  created_at        timestamptz default now()
);

alter table pillars add column if not exists competency_areas jsonb not null default '[]'::jsonb;

create index if not exists pillars_user_idx on pillars (user_id, position);
create unique index if not exists pillars_user_slug_unique on pillars (user_id, slug);

-- ── Tasks ─────────────────────────────────────────────────────────────────
create table if not exists tasks (
  id                uuid primary key default gen_random_uuid(),
  pillar_id         uuid not null references pillars(id) on delete cascade,
  user_id           uuid not null references profiles(id) on delete cascade,
  title             text not null,
  notes             text,
  is_complete       boolean not null default false,
  advisory_minutes  integer,
  position          integer not null default 0,
  due_date          date,
  recurrence_rule   jsonb,
  completed_at      timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists tasks_pillar_idx       on tasks (pillar_id, position);
create index if not exists tasks_user_updated_idx on tasks (user_id, updated_at desc);

-- ── Steps ─────────────────────────────────────────────────────────────────
create table if not exists steps (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  user_id     uuid not null references profiles(id) on delete cascade,
  title       text not null,
  is_complete boolean not null default false,
  position    integer not null default 0,
  created_at  timestamptz default now()
);

create index if not exists steps_task_idx on steps (task_id, position);

-- ── Chat messages ─────────────────────────────────────────────────────────
create table if not exists chat_messages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  pillar_slug  text not null,
  role         text not null check (role in ('user','assistant')),
  content      text not null,
  created_at   timestamptz default now()
);

create index if not exists chat_messages_user_pillar_idx
  on chat_messages (user_id, pillar_slug, created_at);

-- ── Quiz results ──────────────────────────────────────────────────────────
create table if not exists quiz_results (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles(id) on delete cascade,
  pillar_id        uuid not null references pillars(id) on delete cascade,
  competency_name  text not null,
  score            numeric(4,3) not null check (score >= 0 and score <= 1),
  max_score        integer not null default 10,
  questions        jsonb not null default '[]'::jsonb,
  taken_at         timestamptz default now()
);

create index if not exists quiz_results_pillar_competency_idx
  on quiz_results (pillar_id, competency_name, taken_at);
create index if not exists quiz_results_user_idx
  on quiz_results (user_id, taken_at);

-- ── updated_at trigger ────────────────────────────────────────────────────
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
