import { withSessionAndParams } from "@/lib/api/withSession";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UpdateStepInput } from "@/lib/types";

type Params = { id: string };

export const PATCH = withSessionAndParams<Params>(async (req, { params }, userId) => {
  const body: UpdateStepInput = await req.json();
  const supabase = getSupabaseAdminClient();

  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title.trim();
  if (body.is_complete !== undefined) updateData.is_complete = body.is_complete;
  if (body.position !== undefined) updateData.position = body.position;

  const { data: step, error } = await supabase
    .from("steps")
    .update(updateData)
    .eq("id", params.id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!step) {
    return Response.json({ error: "Step not found" }, { status: 404 });
  }

  return Response.json(step);
});

export const DELETE = withSessionAndParams<Params>(async (_req, { params }, userId) => {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase
    .from("steps")
    .delete()
    .eq("id", params.id)
    .eq("user_id", userId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
});
