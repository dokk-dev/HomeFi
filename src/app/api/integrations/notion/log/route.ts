import { withSession } from "@/lib/api/withSession";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const GET = withSession(async (_req, userId) => {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("notion_sync_log")
    .select("id, entity_type, entity_id, action, status, message, synced_at")
    .eq("user_id", userId)
    .order("synced_at", { ascending: false })
    .limit(20);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data ?? []);
});
