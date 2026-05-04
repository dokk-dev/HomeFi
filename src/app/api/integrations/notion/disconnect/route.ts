import { withSession } from "@/lib/api/withSession";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const POST = withSession(async (_req, userId) => {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      notion_access_token: null,
      notion_workspace_id: null,
      notion_workspace_name: null,
      notion_bot_id: null,
      notion_root_page_id: null,
      notion_last_synced_at: null,
    })
    .eq("id", userId);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
});
