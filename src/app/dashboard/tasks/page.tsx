import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { TasksClient } from "./TasksClient";
import { PILLAR_BY_SLUG } from "@/lib/constants/pillars";

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const supabase = getSupabaseAdminClient();

  const { data: pillars } = await supabase
    .from("pillars")
    .select("id, slug, label, color, position")
    .eq("user_id", session.user.id)
    .order("position");

  const { data: rawTasks } = await supabase
    .from("tasks")
    .select("id, pillar_id, title, is_complete, advisory_minutes, due_date, created_at, position")
    .eq("user_id", session.user.id)
    .order("position");

  const pillarMap = Object.fromEntries((pillars ?? []).map((p) => [p.id, p]));

  const tasks = (rawTasks ?? []).map((t) => {
    const pillar = pillarMap[t.pillar_id];
    const meta = pillar ? PILLAR_BY_SLUG[pillar.slug as keyof typeof PILLAR_BY_SLUG] : undefined;
    return {
      ...t,
      pillarSlug: pillar?.slug ?? "",
      pillarLabel: meta?.shortLabel ?? pillar?.label ?? "",
      pillarColor: pillar?.color ?? "#6366f1",
    };
  });

  const enrichedPillars = (pillars ?? []).map((p) => {
    const pillarTasks = tasks.filter((t) => t.pillar_id === p.id);
    const total = pillarTasks.length;
    const completed = pillarTasks.filter((t) => t.is_complete).length;
    return {
      ...p,
      total,
      completed,
      pct: total > 0 ? Math.round((completed / total) * 100) : 0,
      meta: PILLAR_BY_SLUG[p.slug as keyof typeof PILLAR_BY_SLUG],
    };
  });

  return (
    <TasksClient
      tasks={tasks}
      pillars={enrichedPillars}
      userAvatarUrl={session.user.image ?? null}
    />
  );
}
