import { withSession } from "@/lib/api/withSession";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const GET = withSession(async (_req, userId) => {
  const supabase = getSupabaseAdminClient();

  const { data: pillars, error } = await supabase
    .from("pillars")
    .select("*")
    .eq("user_id", userId)
    .order("position");

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Compute task counts separately for simplicity
  const { data: taskCounts } = await supabase
    .from("tasks")
    .select("pillar_id, is_complete")
    .eq("user_id", userId);

  const enriched = pillars?.map((pillar) => {
    const pillarTasks = taskCounts?.filter((t) => t.pillar_id === pillar.id) ?? [];
    return {
      ...pillar,
      task_count: pillarTasks.length,
      completed_count: pillarTasks.filter((t) => t.is_complete).length,
    };
  });

  return Response.json(enriched);
});
