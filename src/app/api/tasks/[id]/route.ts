import { withSessionAndParams } from "@/lib/api/withSession";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UpdateTaskInput } from "@/lib/types";

type Params = { id: string };

export const PATCH = withSessionAndParams<Params>(async (req, { params }, userId) => {
  const body: UpdateTaskInput = await req.json();
  const supabase = getSupabaseAdminClient();

  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title.trim();
  if (body.notes !== undefined) updateData.notes = body.notes;
  if (body.is_complete !== undefined) {
    updateData.is_complete = body.is_complete;
    updateData.completed_at = body.is_complete ? new Date().toISOString() : null;
  }
  if (body.advisory_minutes !== undefined) updateData.advisory_minutes = body.advisory_minutes;
  if (body.position !== undefined) updateData.position = body.position;
  if (body.due_date !== undefined) updateData.due_date = body.due_date;

  const { data: task, error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", params.id)
    .eq("user_id", userId) // Defense-in-depth: ensure ownership
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!task) {
    return Response.json({ error: "Task not found" }, { status: 404 });
  }

  return Response.json(task);
});

export const DELETE = withSessionAndParams<Params>(async (_req, { params }, userId) => {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", params.id)
    .eq("user_id", userId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
});
