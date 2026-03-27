-- ============================================================
-- ENABLE RLS ON ALL APPLICATION TABLES
-- ============================================================
alter table public.profiles enable row level security;
alter table public.pillars  enable row level security;
alter table public.tasks    enable row level security;
alter table public.steps    enable row level security;

-- ============================================================
-- PROFILES
-- ============================================================
create policy "profiles: owner select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- PILLARS
-- ============================================================
create policy "pillars: owner select"
  on public.pillars for select
  using (auth.uid() = user_id);

create policy "pillars: owner insert"
  on public.pillars for insert
  with check (auth.uid() = user_id);

create policy "pillars: owner update"
  on public.pillars for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "pillars: owner delete"
  on public.pillars for delete
  using (auth.uid() = user_id);

-- ============================================================
-- TASKS
-- ============================================================
create policy "tasks: owner select"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "tasks: owner insert"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "tasks: owner update"
  on public.tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tasks: owner delete"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- ============================================================
-- STEPS
-- ============================================================
create policy "steps: owner select"
  on public.steps for select
  using (auth.uid() = user_id);

create policy "steps: owner insert"
  on public.steps for insert
  with check (auth.uid() = user_id);

create policy "steps: owner update"
  on public.steps for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "steps: owner delete"
  on public.steps for delete
  using (auth.uid() = user_id);
