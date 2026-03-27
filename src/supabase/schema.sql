-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- Managed by NextAuth JWT callback — NOT tied to Supabase auth.users.
-- ============================================================
create table public.profiles (
  id           uuid primary key default uuid_generate_v4(),
  email        text not null unique,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- PILLARS
-- Seeded programmatically in the NextAuth JWT callback on first sign-in.
-- ============================================================
create table public.pillars (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  slug        text not null,
  label       text not null,
  description text,
  color       text not null default '#6366f1',
  icon_key    text not null,
  position    smallint not null default 0,
  created_at  timestamptz not null default now(),
  unique(user_id, slug)
);

-- ============================================================
-- TASKS
-- ============================================================
create table public.tasks (
  id               uuid primary key default uuid_generate_v4(),
  pillar_id        uuid not null references public.pillars(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  title            text not null,
  notes            text,
  is_complete      boolean not null default false,
  advisory_minutes integer check (advisory_minutes > 0),
  position         smallint not null default 0,
  completed_at     timestamptz,
  due_date         date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index tasks_pillar_id_idx on public.tasks(pillar_id);
create index tasks_user_id_idx   on public.tasks(user_id);

-- ============================================================
-- STEPS
-- ============================================================
create table public.steps (
  id          uuid primary key default uuid_generate_v4(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  is_complete boolean not null default false,
  position    smallint not null default 0,
  created_at  timestamptz not null default now()
);

create index steps_task_id_idx on public.steps(task_id);

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.handle_updated_at();
