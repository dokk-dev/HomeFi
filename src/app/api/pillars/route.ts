import { withSession } from "@/lib/api/withSession";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { CreatePillarSchema } from "@/lib/api/schemas";

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

export const POST = withSession(async (req, userId) => {
  const parsed = CreatePillarSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { label, color, description, icon_key } = parsed.data;
  const supabase = getSupabaseAdminClient();

  // Derive base slug from label
  const baseSlug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50) || "pillar";

  // Find next position and check slug conflict in one query
  const { data: existing } = await supabase
    .from("pillars")
    .select("position, slug")
    .eq("user_id", userId)
    .order("position", { ascending: false });

  const nextPosition = (existing?.[0]?.position ?? -1) + 1;
  const slugTaken = existing?.some((p) => p.slug === baseSlug);
  const slug = slugTaken ? `${baseSlug}-${nextPosition}` : baseSlug;

  const { data: pillar, error } = await supabase
    .from("pillars")
    .insert({
      user_id: userId,
      slug,
      label,
      color,
      description: description ?? null,
      icon_key: icon_key ?? "Brain",
      position: nextPosition,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(pillar, { status: 201 });
});
