/**
 * One-way Meridian → Notion sync.
 * Source of truth is Meridian; we create/update Notion content to mirror it.
 */
import type { Client } from "@notionhq/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getNotionClient } from "./client";

export interface NotionSyncSettings {
  tasks: boolean;
  pillars: boolean;
  chat: boolean;
  quiz: boolean;
}

export const DEFAULT_SYNC_SETTINGS: NotionSyncSettings = {
  tasks: true,
  pillars: true,
  chat: true,
  quiz: false,
};

export interface SyncResult {
  ok: boolean;
  synced: { pillars: number; tasks: number; chat: number; quiz: number };
  errors: string[];
}

export async function syncUser(userId: string): Promise<SyncResult> {
  const supabase = getSupabaseAdminClient();
  const result: SyncResult = {
    ok: true,
    synced: { pillars: 0, tasks: 0, chat: 0, quiz: 0 },
    errors: [],
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, notion_access_token, notion_root_page_id, notion_sync_settings, notion_last_synced_at",
    )
    .eq("id", userId)
    .single();

  if (!profile?.notion_access_token) {
    return { ...result, ok: false, errors: ["Notion is not connected."] };
  }

  const notion = getNotionClient(profile.notion_access_token);
  const settings: NotionSyncSettings = {
    ...DEFAULT_SYNC_SETTINGS,
    ...(profile.notion_sync_settings ?? {}),
  };
  const since = profile.notion_last_synced_at
    ? new Date(profile.notion_last_synced_at)
    : new Date(0);

  let rootPageId = profile.notion_root_page_id as string | null;
  if (!rootPageId) {
    try {
      rootPageId = await ensureRootPage(notion);
    } catch (err) {
      return errored(result, err, supabase, userId, "workspace");
    }
    if (!rootPageId) {
      const msg =
        "No Notion pages are shared with Meridian yet. Open Notion → pick a page → Share → invite the Meridian integration, then sync again.";
      await logSync(supabase, userId, "workspace", null, "error", msg);
      return { ...result, ok: false, errors: [msg] };
    }
    await supabase
      .from("profiles")
      .update({ notion_root_page_id: rootPageId })
      .eq("id", userId);
  }

  try {
    if (settings.pillars) {
      result.synced.pillars = await syncPillars(supabase, notion, userId, rootPageId);
    }
    if (settings.tasks) {
      result.synced.tasks = await syncTasks(supabase, notion, userId);
    }
    if (settings.chat) {
      result.synced.chat = await syncChat(supabase, notion, userId, rootPageId, since);
    }
    if (settings.quiz) {
      result.synced.quiz = await syncQuiz(supabase, notion, userId, rootPageId, since);
    }
    await supabase
      .from("profiles")
      .update({ notion_last_synced_at: new Date().toISOString() })
      .eq("id", userId);
  } catch (err) {
    return errored(result, err, supabase, userId, "workspace");
  }

  return result;
}

// ── Bootstrap: find a shared page and create a Meridian root inside it ────
async function ensureRootPage(notion: Client): Promise<string | null> {
  const search = await notion.search({
    filter: { value: "page", property: "object" },
    page_size: 5,
  });
  const firstPage = search.results.find(
    (r): r is Extract<typeof r, { object: "page" }> => r.object === "page",
  );
  if (!firstPage) return null;

  const root = await notion.pages.create({
    parent: { type: "page_id", page_id: firstPage.id },
    properties: {
      title: { title: [{ type: "text", text: { content: "Meridian" } }] },
    },
    children: [
      {
        object: "block",
        type: "heading_1",
        heading_1: { rich_text: [{ type: "text", text: { content: "Meridian" } }] },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: "Synced workspace from Meridian — your personal learning OS." },
            },
          ],
        },
      },
    ],
  });
  return root.id;
}

// ── Pillars: each maps to a Notion database under root ───────────────────
async function syncPillars(
  supabase: SupabaseClient,
  notion: Client,
  userId: string,
  rootPageId: string,
): Promise<number> {
  const { data: pillars } = await supabase
    .from("pillars")
    .select("id, label, color, notion_database_id")
    .eq("user_id", userId)
    .order("position");

  let count = 0;
  for (const pillar of pillars ?? []) {
    if (pillar.notion_database_id) continue; // databases are stable; rename TBD
    try {
      const db = await notion.databases.create({
        parent: { type: "page_id", page_id: rootPageId },
        title: [{ type: "text", text: { content: pillar.label } }],
        properties: {
          Title: { title: {} },
          Status: {
            select: {
              options: [
                { name: "To Do", color: "gray" },
                { name: "In Progress", color: "blue" },
                { name: "Complete", color: "green" },
              ],
            },
          },
          Due: { date: {} },
          "Time Estimate (min)": { number: { format: "number" } },
          Created: { created_time: {} },
        },
      });
      await supabase
        .from("pillars")
        .update({
          notion_database_id: db.id,
          notion_last_synced_at: new Date().toISOString(),
        })
        .eq("id", pillar.id);
      await logSync(supabase, userId, "pillar", pillar.id, "create", "Notion DB created");
      count++;
    } catch (err) {
      await logSync(
        supabase,
        userId,
        "pillar",
        pillar.id,
        "error",
        err instanceof Error ? err.message : String(err),
      );
    }
  }
  return count;
}

// ── Tasks: rows in their pillar's database ───────────────────────────────
async function syncTasks(
  supabase: SupabaseClient,
  notion: Client,
  userId: string,
): Promise<number> {
  const { data: tasks } = await supabase
    .from("tasks")
    .select(
      "id, pillar_id, title, notes, is_complete, advisory_minutes, due_date, notion_page_id, pillars!inner(notion_database_id)",
    )
    .eq("user_id", userId);

  let count = 0;
  for (const task of (tasks ?? []) as unknown as TaskWithPillar[]) {
    const pillarRow = Array.isArray(task.pillars) ? task.pillars[0] : task.pillars;
    const dbId = pillarRow?.notion_database_id;
    if (!dbId) continue; // pillar DB not created yet — wait for next sync
    const properties = buildTaskProperties(task);
    try {
      if (task.notion_page_id) {
        await notion.pages.update({
          page_id: task.notion_page_id,
          properties,
        });
        await supabase
          .from("tasks")
          .update({ notion_last_synced_at: new Date().toISOString() })
          .eq("id", task.id);
        count++;
      } else {
        const page = await notion.pages.create({
          parent: { database_id: dbId },
          properties,
          children: task.notes
            ? [
                {
                  object: "block",
                  type: "paragraph",
                  paragraph: {
                    rich_text: [{ type: "text", text: { content: task.notes } }],
                  },
                },
              ]
            : [],
        });
        await supabase
          .from("tasks")
          .update({
            notion_page_id: page.id,
            notion_last_synced_at: new Date().toISOString(),
          })
          .eq("id", task.id);
        count++;
      }
    } catch (err) {
      await logSync(
        supabase,
        userId,
        "task",
        task.id,
        "error",
        err instanceof Error ? err.message : String(err),
      );
    }
  }
  return count;
}

interface TaskWithPillar {
  id: string;
  pillar_id: string;
  title: string;
  notes: string | null;
  is_complete: boolean;
  advisory_minutes: number | null;
  due_date: string | null;
  notion_page_id: string | null;
  pillars: { notion_database_id: string | null } | { notion_database_id: string | null }[] | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTaskProperties(task: TaskWithPillar): Record<string, any> {
  return {
    Title: { title: [{ type: "text", text: { content: task.title } }] },
    Status: {
      select: { name: task.is_complete ? "Complete" : "To Do" },
    },
    Due: task.due_date ? { date: { start: task.due_date } } : { date: null },
    "Time Estimate (min)": task.advisory_minutes
      ? { number: task.advisory_minutes }
      : { number: null },
  };
}

// ── Chat: append new messages since last sync to per-pillar archive ──────
async function syncChat(
  supabase: SupabaseClient,
  notion: Client,
  userId: string,
  rootPageId: string,
  since: Date,
): Promise<number> {
  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, pillar_slug, role, content, created_at")
    .eq("user_id", userId)
    .gt("created_at", since.toISOString())
    .order("created_at");

  if (!messages || messages.length === 0) return 0;

  const archivePageId = await ensureNamedChild(notion, rootPageId, "AI Tutor");
  const blocks = messages.map((m) => ({
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: {
      rich_text: [
        {
          type: "text" as const,
          text: {
            content: `${m.role === "user" ? "👤" : "🤖"}  [${m.pillar_slug}] ${m.content}`,
          },
        },
      ],
    },
  }));

  // Notion limits children appends to 100 per call.
  const CHUNK = 100;
  let appended = 0;
  for (let i = 0; i < blocks.length; i += CHUNK) {
    await notion.blocks.children.append({
      block_id: archivePageId,
      children: blocks.slice(i, i + CHUNK),
    });
    appended += Math.min(CHUNK, blocks.length - i);
  }
  return appended;
}

// ── Quiz: insert new quiz results into the quiz log database ─────────────
async function syncQuiz(
  supabase: SupabaseClient,
  notion: Client,
  userId: string,
  rootPageId: string,
  since: Date,
): Promise<number> {
  const { data: results } = await supabase
    .from("quiz_results")
    .select("id, pillar_id, competency_name, score, taken_at, pillars!inner(label)")
    .eq("user_id", userId)
    .gt("taken_at", since.toISOString())
    .order("taken_at");

  if (!results || results.length === 0) return 0;

  const dbId = await ensureQuizDatabase(notion, rootPageId);
  let count = 0;
  for (const r of results as unknown as QuizResultRow[]) {
    const pillarRow = Array.isArray(r.pillars) ? r.pillars[0] : r.pillars;
    const pillarLabel = pillarRow?.label ?? "";
    try {
      await notion.pages.create({
        parent: { database_id: dbId },
        properties: {
          Title: {
            title: [
              { type: "text", text: { content: `${pillarLabel} — ${r.competency_name}` } },
            ],
          },
          Score: { number: Math.round(Number(r.score) * 100) },
          Pillar: {
            rich_text: [{ type: "text", text: { content: pillarLabel } }],
          },
          Competency: {
            rich_text: [{ type: "text", text: { content: r.competency_name } }],
          },
          Date: { date: { start: r.taken_at } },
        },
      });
      count++;
    } catch (err) {
      await logSync(
        supabase,
        userId,
        "quiz",
        r.id,
        "error",
        err instanceof Error ? err.message : String(err),
      );
    }
  }
  return count;
}

interface QuizResultRow {
  id: string;
  pillar_id: string;
  competency_name: string;
  score: number;
  taken_at: string;
  pillars: { label: string } | { label: string }[] | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Find or create a child page with the given title under the parent. We can't
 * store ids for these "category" pages without more schema, so we search the
 * parent's children every sync. Cost is one paginated list call.
 */
async function ensureNamedChild(
  notion: Client,
  parentId: string,
  title: string,
): Promise<string> {
  const children = await notion.blocks.children.list({ block_id: parentId, page_size: 100 });
  for (const block of children.results) {
    if (
      "type" in block &&
      block.type === "child_page" &&
      block.child_page.title === title
    ) {
      return block.id;
    }
  }
  const created = await notion.pages.create({
    parent: { type: "page_id", page_id: parentId },
    properties: {
      title: { title: [{ type: "text", text: { content: title } }] },
    },
  });
  return created.id;
}

async function ensureQuizDatabase(notion: Client, parentPageId: string): Promise<string> {
  const children = await notion.blocks.children.list({
    block_id: parentPageId,
    page_size: 100,
  });
  for (const block of children.results) {
    if (
      "type" in block &&
      block.type === "child_database" &&
      block.child_database.title === "Quiz Log"
    ) {
      return block.id;
    }
  }
  const db = await notion.databases.create({
    parent: { type: "page_id", page_id: parentPageId },
    title: [{ type: "text", text: { content: "Quiz Log" } }],
    properties: {
      Title: { title: {} },
      Score: { number: { format: "percent" } },
      Pillar: { rich_text: {} },
      Competency: { rich_text: {} },
      Date: { date: {} },
    },
  });
  return db.id;
}

async function logSync(
  supabase: SupabaseClient,
  userId: string,
  entityType: "task" | "pillar" | "chat" | "quiz" | "workspace",
  entityId: string | null,
  action: "create" | "update" | "skip" | "error",
  message: string,
) {
  await supabase
    .from("notion_sync_log")
    .insert({
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      status: action === "error" ? "error" : "success",
      message,
    })
    .then(() => undefined, () => undefined);
}

async function errored(
  result: SyncResult,
  err: unknown,
  supabase: SupabaseClient,
  userId: string,
  entityType: "task" | "pillar" | "chat" | "quiz" | "workspace",
): Promise<SyncResult> {
  const msg = err instanceof Error ? err.message : String(err);
  await logSync(supabase, userId, entityType, null, "error", msg);
  return { ...result, ok: false, errors: [...result.errors, msg] };
}
