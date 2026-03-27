import { withSession } from "@/lib/api/withSession";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CreateTaskInput } from "@/lib/types";

export const GET = withSession(async (req, userId) => {
  const { searchParams } = new URL(req.url);
  const pillarId = searchParams.get("pillar_id");

  if (!pillarId) {
    return Response.json({ error: "pillar_id is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  // Verify the pillar belongs to this user
  const { data: pillar } = await supabase
    .from("pillars")
    .select("id")
    .eq("id", pillarId)
    .eq("user_id", userId)
    .single();

  if (!pillar) {
    return Response.json({ error: "Pillar not found" }, { status: 404 });
  }

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(`*, steps(*)`)
    .eq("pillar_id", pillarId)
    .eq("user_id", userId)
    .order("position")
    .order("created_at", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Order steps by position within each task
  const tasksWithSortedSteps = tasks?.map((task) => ({
    ...task,
    steps: task.steps?.sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    ) ?? [],
  }));

  return Response.json(tasksWithSortedSteps);
});

export const POST = withSession(async (req, userId) => {
  const body: CreateTaskInput = await req.json();

  if (!body.pillar_id || !body.title?.trim()) {
    return Response.json(
      { error: "pillar_id and title are required" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();

  // Verify pillar ownership
  const { data: pillar } = await supabase
    .from("pillars")
    .select("id")
    .eq("id", body.pillar_id)
    .eq("user_id", userId)
    .single();

  if (!pillar) {
    return Response.json({ error: "Pillar not found" }, { status: 404 });
  }

  // Get next position
  const { count } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("pillar_id", body.pillar_id)
    .eq("user_id", userId);

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      pillar_id: body.pillar_id,
      user_id: userId,
      title: body.title.trim(),
      notes: body.notes ?? null,
      advisory_minutes: body.advisory_minutes ?? null,
      due_date: body.due_date ?? null,
      position: count ?? 0,
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ...task, steps: [] }, { status: 201 });
});
