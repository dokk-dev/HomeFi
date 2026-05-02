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
  if (typeof body.icon_key === "string") updateData.icon_key = body.icon_key;
  if (typeof body.mastery === "number") updateData.mastery = Math.max(0, Math.min(100, Math.round(body.mastery)));
  if (Array.isArray(body.competency_areas)) {
    // Light shape check; full validation happens at the generate endpoint.
    const areas = body.competency_areas.filter(
      (a: unknown): a is { name: string; description: string; weight: number; target_skills: string[] } => {
        if (!a || typeof a !== "object") return false;
        const x = a as Record<string, unknown>;
        return (
          typeof x.name === "string" &&
          typeof x.description === "string" &&
          typeof x.weight === "number" &&
          Array.isArray(x.target_skills)
        );
      },
    );
    updateData.competency_areas = areas.slice(0, 7);
  }

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

export const DELETE = withSessionAndParams<Params>(async (_req, { params }, userId) => {
  const supabase = getSupabaseAdminClient();

  const { data: pillar } = await supabase
    .from("pillars")
    .select("id, slug")
    .eq("id", params.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!pillar) return Response.json({ error: "Pillar not found" }, { status: 404 });

  // chat_messages references the pillar by slug (text), not FK — clean it up explicitly.
  // tasks, steps, and quiz_results cascade via FK.
  await supabase
    .from("chat_messages")
    .delete()
    .eq("user_id", userId)
    .eq("pillar_slug", pillar.slug);

  const { error } = await supabase
    .from("pillars")
    .delete()
    .eq("id", params.id)
    .eq("user_id", userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
});
