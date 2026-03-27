import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { AiTutorClient } from "./AiTutorClient";
import { PILLAR_BY_SLUG } from "@/lib/constants/pillars";

export default async function AiTutorPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const supabase = getSupabaseAdminClient();

  const { data: pillars } = await supabase
    .from("pillars")
    .select("id, slug, label, color")
    .eq("user_id", session.user.id)
    .order("position");

  // Fetch mastery per pillar
  const { data: tasks } = await supabase
    .from("tasks")
    .select("pillar_id, is_complete")
    .eq("user_id", session.user.id);

  const masteryMap: Record<string, { total: number; completed: number }> = {};
  for (const t of tasks ?? []) {
    if (!masteryMap[t.pillar_id]) masteryMap[t.pillar_id] = { total: 0, completed: 0 };
    masteryMap[t.pillar_id].total++;
    if (t.is_complete) masteryMap[t.pillar_id].completed++;
  }

  const enrichedPillars = (pillars ?? []).map((p) => {
    const m = masteryMap[p.id] ?? { total: 0, completed: 0 };
    const pct = m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0;
    return {
      ...p,
      meta: PILLAR_BY_SLUG[p.slug as keyof typeof PILLAR_BY_SLUG],
      mastery: pct,
    };
  });

  const displayName = session.user.name ?? "Architect";

  return (
    <div className="flex flex-1 min-h-0">
      <AiTutorClient pillars={enrichedPillars} displayName={displayName} />
    </div>
  );
}
