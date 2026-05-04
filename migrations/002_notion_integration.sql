-- ============================================================
-- 002_notion_integration.sql
-- Adds per-user Notion OAuth fields, sync settings, external IDs
-- on tasks/pillars, and a sync log table.
-- ============================================================

-- ── Profiles: Notion OAuth + sync prefs ─────────────────────────────────
alter table profiles add column if not exists notion_access_token   text;
alter table profiles add column if not exists notion_workspace_id   text;
alter table profiles add column if not exists notion_workspace_name text;
alter table profiles add column if not exists notion_bot_id         text;
alter table profiles add column if not exists notion_root_page_id   text;
alter table profiles add column if not exists notion_sync_settings  jsonb
  not null default '{"tasks":true,"pillars":true,"chat":true,"quiz":false}'::jsonb;
alter table profiles add column if not exists notion_last_synced_at timestamptz;

-- ── Tasks: external Notion page id + last sync ──────────────────────────
alter table tasks add column if not exists notion_page_id        text;
alter table tasks add column if not exists notion_last_synced_at timestamptz;

-- ── Pillars: external Notion database id + last sync ────────────────────
alter table pillars add column if not exists notion_database_id    text;
alter table pillars add column if not exists notion_last_synced_at timestamptz;

-- ── Sync log table ──────────────────────────────────────────────────────
create table if not exists notion_sync_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  entity_type  text not null check (entity_type in ('task','pillar','chat','quiz','workspace')),
  entity_id    text,
  action       text not null check (action in ('create','update','skip','error')),
  status       text not null check (status in ('success','error')),
  message      text,
  synced_at    timestamptz not null default now()
);

create index if not exists notion_sync_log_user_idx
  on notion_sync_log (user_id, synced_at desc);
