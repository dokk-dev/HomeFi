import { withSession } from "@/lib/api/withSession";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CreateStepInput } from "@/lib/types";

export const POST = withSession(async (req, userId) => {
  const body: CreateStepInput = await req.json();

  if (!body.task_id || !body.title?.trim()) {
    return Response.json(
      { error: "task_id and title are required" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();

  // Verify task ownership
  const { data: task } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", body.task_id)
    .eq("user_id", userId)
    .single();

  if (!task) {
    return Response.json({ error: "Task not found" }, { status: 404 });
  }

  // Get next position
  const { count } = await supabase
    .from("steps")
    .select("*", { count: "exact", head: true })
    .eq("task_id", body.task_id);

  const { data: step, error } = await supabase
    .from("steps")
    .insert({
      task_id: body.task_id,
      user_id: userId,
      title: body.title.trim(),
      position: count ?? 0,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(step, { status: 201 });
});
