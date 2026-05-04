import { z } from "zod";
import { withSession } from "@/lib/api/withSession";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const SettingsSchema = z.object({
  tasks: z.boolean().optional(),
  pillars: z.boolean().optional(),
  chat: z.boolean().optional(),
  quiz: z.boolean().optional(),
});

export const PATCH = withSession(async (req, userId) => {
  const parsed = SettingsSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("notion_sync_settings")
    .eq("id", userId)
    .single();

  const merged = {
    tasks: true,
    pillars: true,
    chat: true,
    quiz: false,
    ...((profile?.notion_sync_settings as Record<string, boolean>) ?? {}),
    ...parsed.data,
  };

  const { error } = await supabase
    .from("profiles")
    .update({ notion_sync_settings: merged })
    .eq("id", userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, settings: merged });
});
