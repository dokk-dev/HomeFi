import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { PillarGrid } from "@/components/pillars/PillarGrid";
import { FocusSection } from "@/components/tasks/FocusSection";
import { ListTodo, ArrowRight, Circle } from "lucide-react";
import { PILLAR_ICONS } from "@/lib/icons/pillarIcons";
import type { Pillar } from "@/lib/types";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const supabase = getSupabaseAdminClient();
  const userId = session.user.id;

  // ── 3 parallel queries instead of 6 sequential ones ─────────────────────
  const [
    { data: pillars },
    { data: allTaskRows },
    { data: topTasks },
  ] = await Promise.all([
    supabase.from("pillars").select("*").eq("user_id", userId).order("position"),

    // One scan covers: task counts, streak computation, and weekly momentum
    supabase
      .from("tasks")
      .select("pillar_id, is_complete, updated_at")
      .eq("user_id", userId),

    // Top 6 incomplete tasks: first = focus, rest = queue
    supabase
      .from("tasks")
      .select("*, pillars(slug, label, color, icon_key)")
      .eq("user_id", userId)
      .eq("is_complete", false)
      .order("updated_at", { ascending: false })
      .limit(6),
  ]);

  // ── Derive streak per pillar from allTaskRows ────────────────────────────
  const pillarDateSets: Record<string, Set<string>> = {};
  for (const t of allTaskRows ?? []) {
    if (!t.is_complete) continue;
    if (!pillarDateSets[t.pillar_id]) pillarDateSets[t.pillar_id] = new Set();
    pillarDateSets[t.pillar_id].add(new Date(t.updated_at).toDateString());
  }
  const streaks: Record<string, number> = {};
  for (const [pillarId, dates] of Object.entries(pillarDateSets)) {
    let streak = 0;
    const d = new Date();
    while (dates.has(d.toDateString())) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    streaks[pillarId] = streak;
  }

  // ── Enrich pillars with counts ───────────────────────────────────────────
  const enrichedPillars: Pillar[] = (pillars ?? []).map((pillar) => {
    const pillarTasks = (allTaskRows ?? []).filter((t) => t.pillar_id === pillar.id);
    return {
      ...pillar,
      task_count: pillarTasks.length,
      completed_count: pillarTasks.filter((t) => t.is_complete).length,
      streak: streaks[pillar.id] ?? 0,
    };
  });

  const totalTasks = enrichedPillars.reduce((sum, p) => sum + (p.task_count ?? 0), 0);
  const completedTasks = enrichedPillars.reduce((sum, p) => sum + (p.completed_count ?? 0), 0);

  // ── Split top tasks into focus + queue ───────────────────────────────────
  const focusTask = topTasks?.[0] ?? null;
  const queueTasks = topTasks?.slice(1) ?? [];

  // ── Weekly momentum from allTaskRows ────────────────────────────────────
  const now = new Date();
  const dow = now.getDay();
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);

  const dailyCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const t of allTaskRows ?? []) {
    if (!t.is_complete) continue;
    const d = new Date(t.updated_at);
    if (d < monday) continue;
    const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
    dailyCounts[idx]++;
  }
  const todayIndex = dow === 0 ? 6 : dow - 1;

  return (
    <div className="p-4 md:p-10 flex-1 space-y-12 max-w-6xl w-full">

      {/* ── Current Focus ── */}
      <section>
        <div className="text-[10px] font-label font-bold text-primary uppercase tracking-[0.2em] mb-4">
          Current Focus
        </div>

        {focusTask ? (
          <FocusSection focusTask={focusTask} />
        ) : (
          <div className="bg-surface-container-low rounded-xl p-8 flex items-center gap-6">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <ListTodo size={32} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-headline font-bold text-on-surface mb-1">
                No active tasks
              </h2>
              <p className="text-on-surface-variant text-sm">
                Add tasks to your pillars to begin your first focus session.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── Study Pillars ── */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div className="text-[10px] font-label font-bold text-outline uppercase tracking-[0.2em]">
            Study Pillars
          </div>
          <div className="h-px flex-1 mx-8 bg-outline-variant/20" />
          <a
            href="/dashboard"
            className="text-[10px] font-label font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-1 hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            View Roadmap
            <ArrowRight size={14} />
          </a>
        </div>
        <PillarGrid pillars={enrichedPillars} />
      </section>

      {/* ── Queue + Weekly Momentum ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
        {/* Task Queue */}
        <div className="lg:col-span-2">
          <div className="text-[10px] font-label font-bold text-outline uppercase tracking-[0.2em] mb-6">
            Queue
          </div>
          <div className="space-y-3">
            {queueTasks.length === 0 && (
              <p className="text-on-surface-variant text-sm py-4">
                No tasks queued. Add tasks to your pillars to fill this list.
              </p>
            )}
            {queueTasks.map((task) => {
              const QueueIcon = task.pillars?.slug ? PILLAR_ICONS[task.pillars.slug] : null;
              const pillarColor = task.pillars?.color ?? "#6366f1";
              return (
                <a
                  key={task.id}
                  href={`/dashboard/pillars/${task.pillars?.slug ?? ""}`}
                  className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border-l-2 transition-all cursor-pointer hover:border-l-[var(--pillar-color)] border-transparent"
                  style={{ "--pillar-color": pillarColor } as React.CSSProperties}
                >
                  <div className="flex items-center gap-4">
                    <Circle size={18} className="text-outline flex-shrink-0" />
                    <span className="text-sm text-on-surface font-label font-medium">
                      {task.title}
                    </span>
                  </div>
                  {QueueIcon && (
                    <div
                      className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${pillarColor}1a` }}
                      title={task.pillars?.label ?? ""}
                    >
                      <QueueIcon size={14} style={{ color: pillarColor }} />
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        </div>

        {/* Weekly Momentum */}
        <div>
          <div className="text-[10px] font-label font-bold text-outline uppercase tracking-[0.2em] mb-6">
            Weekly Momentum
          </div>
          <div className="bg-surface-container-highest rounded-xl p-6">
            <WeeklyChart dailyCounts={dailyCounts} todayIndex={todayIndex} />
            <div className="mt-6 pt-6 border-t border-outline-variant/20">
              <div className="flex justify-between items-center">
                <div className="text-[10px] font-label font-bold text-outline uppercase tracking-wider">
                  Progress
                </div>
                <div className="text-lg font-headline font-bold text-on-surface">
                  {completedTasks}/{totalTasks}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function WeeklyChart({
  dailyCounts,
  todayIndex,
}: {
  dailyCounts: number[];
  todayIndex: number;
}) {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const maxCount = Math.max(...dailyCounts, 1);

  return (
    <>
      <div className="flex items-end justify-between h-28 gap-1.5 mb-3">
        {days.map((_, i) => {
          const count = dailyCounts[i];
          const isToday = i === todayIndex;
          const isFuture = i > todayIndex;
          const heightPct = count > 0 ? Math.max((count / maxCount) * 100, 8) : 0;

          let bg: string;
          if (isFuture) {
            bg = "rgba(255,255,255,0.04)";
          } else if (isToday && count > 0) {
            bg = "rgb(var(--color-primary) / 0.9)";
          } else if (count > 0) {
            bg = "rgb(var(--color-primary) / 0.5)";
          } else {
            bg = "rgba(255,255,255,0.06)";
          }

          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
              {count > 0 && (
                <span className="text-[9px] font-bold leading-none" style={{ color: "rgb(var(--color-on-surface-variant))" }}>
                  {count}
                </span>
              )}
              <div
                className="w-full rounded-t-sm transition-all duration-500"
                style={{
                  height: heightPct > 0 ? `${heightPct}%` : "2px",
                  backgroundColor: bg,
                  boxShadow: isToday && count > 0 ? "0 0 10px rgb(var(--color-primary) / 0.35)" : undefined,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] font-label font-bold uppercase tracking-wider">
        {days.map((d, i) => (
          <span
            key={i}
            className="flex-1 text-center"
            style={{
              color: i === todayIndex
                ? "rgb(var(--color-primary))"
                : "rgb(var(--color-outline))",
              fontWeight: i === todayIndex ? 800 : undefined,
            }}
          >
            {d}
          </span>
        ))}
      </div>
    </>
  );
}
