import { withSession } from "@/lib/api/withSession";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const PATCH = withSession(async (req, userId) => {
  const body = await req.json() as { display_name?: string };
  if (!body.display_name?.trim()) {
    return Response.json({ error: "display_name is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: body.display_name.trim() })
    .eq("id", userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
});
