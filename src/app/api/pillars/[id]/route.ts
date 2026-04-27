import { withSessionAndParams } from "@/lib/api/withSession";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type Params = { id: string };

export const PATCH = withSessionAndParams<Params>(async (req, { params }, userId) => {
  const body = await req.json();
  const supabase = getSupabaseAdminClient();

  const updateData: Record<string, unknown> = {};
  if (typeof body.label === "string") updateData.label = body.label.trim();
  if (typeof body.color === "string") updateData.color = body.color;
  if (typeof body.description === "string") updateData.description = body.description;
  if (typeof body.mastery === "number") updateData.mastery = Math.max(0, Math.min(100, Math.round(body.mastery)));

  if (Object.keys(updateData).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data: pillar, error } = await supabase
    .from("pillars")
    .update(updateData)
    .eq("id", params.id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!pillar) return Response.json({ error: "Pillar not found" }, { status: 404 });

  return Response.json(pillar);
});
