import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { redirect, notFound } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { PillarPageClient } from "./PillarPageClient";
import { computePillarMastery } from "@/lib/quiz/mastery";
import type { Task, CompetencyArea } from "@/lib/types";

interface Props {
  params: { slug: string };
}

export default async function PillarPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const supabase = getSupabaseAdminClient();

  const { data: pillar } = await supabase
    .from("pillars")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("slug", params.slug)
    .single();

  if (!pillar) notFound();

  const [{ data: rawTasks }, { data: quizHistory }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, steps(*)")
      .eq("pillar_id", pillar.id)
      .eq("user_id", session.user.id)
      .order("position")
      .order("created_at", { ascending: true }),
    supabase
      .from("quiz_results")
      .select("competency_name, score, taken_at")
      .eq("pillar_id", pillar.id)
      .eq("user_id", session.user.id),
  ]);

  const tasks: Task[] = (rawTasks ?? []).map((t) => ({
    ...t,
    steps:
      t.steps?.sort(
        (a: { position: number }, b: { position: number }) =>
          a.position - b.position
      ) ?? [],
  }));

  const total = tasks.length;
  const completed = tasks.filter((t) => t.is_complete).length;

  // Recompute mastery on every render so decay shows up without a quiz being taken.
  const competencies = (pillar.competency_areas ?? []) as CompetencyArea[];
  const mastery = computePillarMastery(
    competencies,
    (quizHistory ?? []).map((r) => ({
      competency_name: r.competency_name,
      score: Number(r.score),
      taken_at: r.taken_at,
    })),
  );

  return (
    <PillarPageClient
      pillar={pillar}
      tasks={tasks}
      mastery={mastery}
      completed={completed}
      total={total}
    />
  );
}
