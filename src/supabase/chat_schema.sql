-- ============================================================
-- CHAT MESSAGES
-- Stores AI study assistant conversation history per pillar.
-- Run this in the Supabase SQL Editor.
-- ============================================================
create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  pillar_slug text not null,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists chat_messages_user_pillar_idx
  on public.chat_messages(user_id, pillar_slug, created_at);

-- RLS (defense-in-depth; service role key bypasses this)
alter table public.chat_messages enable row level security;

create policy "Users manage own chat messages"
  on public.chat_messages
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
