import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { redirect, notFound } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { PillarPageClient } from "./PillarPageClient";
import type { Task } from "@/lib/types";

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

  const { data: rawTasks } = await supabase
    .from("tasks")
    .select("*, steps(*)")
    .eq("pillar_id", pillar.id)
    .eq("user_id", session.user.id)
    .order("position")
    .order("created_at", { ascending: true });

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
  const mastery = total > 0 ? Math.round((completed / total) * 100) : 0;

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
