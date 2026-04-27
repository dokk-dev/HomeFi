import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { PILLAR_ICONS } from "@/lib/icons/pillarIcons";
import { formatAdvisoryTime } from "@/lib/utils";

export default async function StatsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const supabase = getSupabaseAdminClient();
  const userId = session.user.id;

  // Parallel queries
  const [{ data: pillars }, { data: allTasks }, { data: upcomingTasksRaw }] = await Promise.all([
    supabase.from("pillars").select("*").eq("user_id", userId).order("position"),
    supabase
      .from("tasks")
      .select("pillar_id, is_complete, advisory_minutes, completed_at, due_date, updated_at, created_at")
      .eq("user_id", userId),
    supabase
      .from("tasks")
      .select("id, title, due_date, pillar_id, pillars(slug, label, color)")
      .eq("user_id", userId)
      .eq("is_complete", false)
      .not("due_date", "is", null)
      .lte("due_date", (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split("T")[0]; })())
      .order("due_date"),
  ]);

  const tasks = allTasks ?? [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.is_complete).length;
  const overallRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalMinutes = tasks
    .filter((t) => t.is_complete && t.advisory_minutes)
    .reduce((s, t) => s + (t.advisory_minutes ?? 0), 0);

  // Per-pillar stats
  const pillarStats = (pillars ?? []).map((p) => {
    const pts = tasks.filter((t) => t.pillar_id === p.id);
    const total = pts.length;
    const completed = pts.filter((t) => t.is_complete).length;
    const mastery = total > 0 ? Math.round((completed / total) * 100) : 0;
    const minutes = pts
      .filter((t) => t.is_complete && t.advisory_minutes)
      .reduce((s, t) => s + (t.advisory_minutes ?? 0), 0);
    return { pillar: p, total, completed, mastery, minutes };
  });

  // Weekly completions (Mon–Sun of current week)
  const now = new Date();
  const dow = now.getDay();
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);

  const dailyCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const t of tasks.filter((t) => t.is_complete && t.updated_at && new Date(t.updated_at) >= monday)) {
    const d = new Date(t.updated_at);
    const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
    dailyCounts[idx]++;
  }
  const todayIndex = dow === 0 ? 6 : dow - 1;
  const thisWeekTotal = dailyCounts.reduce((s, c) => s + c, 0);

  // Last 4 weeks (Mon-based) totals
  const weeklyTotals: number[] = [];
  for (let w = 3; w >= 0; w--) {
    const wStart = new Date(monday);
    wStart.setDate(monday.getDate() - w * 7);
    const wEnd = new Date(wStart);
    wEnd.setDate(wStart.getDate() + 7);
    const count = tasks.filter((t) => {
      if (!t.is_complete || !t.updated_at) return false;
      const d = new Date(t.updated_at);
      return d >= wStart && d < wEnd;
    }).length;
    weeklyTotals.push(count);
  }

  const upcomingTasks = upcomingTasksRaw;

  // Overdue count
  const overdueCount = tasks.filter((t) => {
    if (t.is_complete || !t.due_date) return false;
    return new Date(t.due_date + "T23:59:59") < now;
  }).length;

  return (
    <div className="p-4 md:p-10 flex-1 space-y-12 max-w-5xl w-full">
      {/* Header */}
      <div>
        <div className="text-[10px] font-label font-bold text-primary uppercase tracking-[0.2em] mb-2">
          Stats & Progress
        </div>
        <h1 className="text-2xl md:text-4xl font-extrabold font-headline tracking-tighter text-on-surface">
          Your Learning Overview
        </h1>
      </div>

      {/* Summary cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={totalTasks.toString()} />
        <StatCard label="Completed" value={completedTasks.toString()} />
        <StatCard
          label="Mastery Rate"
          value={`${overallRate}%`}
          sub={`${totalTasks - completedTasks} remaining`}
        />
        <StatCard
          label="Time Invested"
          value={formatAdvisoryTime(totalMinutes) ?? "—"}
          sub="estimated"
        />
      </section>

      {/* Per-pillar breakdown */}
      <section>
        <div className="text-[10px] font-label font-bold text-outline uppercase tracking-[0.2em] mb-6">
          Pillar Breakdown
        </div>
        <div className="space-y-3">
          {pillarStats.map(({ pillar, total, completed, mastery, minutes }) => {
            const Icon = PILLAR_ICONS[pillar.slug];
            const timeLabel = formatAdvisoryTime(minutes);
            return (
              <div
                key={pillar.id}
                className="bg-surface-container-high rounded-xl p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  {Icon && <Icon size={18} style={{ color: pillar.color }} />}
                  <span className="font-headline font-bold text-on-surface text-sm flex-1">
                    {pillar.label}
                  </span>
                  <span className="text-[10px] font-bold text-outline uppercase tracking-widest">
                    {total === 0 ? "No tasks" : `${completed}/${total}`}
                  </span>
                  {timeLabel && (
                    <span className="text-[10px] text-outline ml-3">{timeLabel}</span>
                  )}
                </div>
                <div className="w-full h-[3px] bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${mastery}%`, backgroundColor: pillar.color }}
                  />
                </div>
                <div className="mt-1.5 text-[10px] text-outline font-bold uppercase tracking-widest">
                  Mastery: {mastery}%
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Weekly + Monthly charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* This week */}
        <div>
          <div className="text-[10px] font-label font-bold text-outline uppercase tracking-[0.2em] mb-4">
            This Week
          </div>
          <div className="bg-surface-container-highest rounded-xl p-6">
            <WeeklyBar dailyCounts={dailyCounts} todayIndex={todayIndex} />
            <div className="mt-4 pt-4 border-t border-outline-variant/20 flex justify-between items-center">
              <span className="text-[10px] font-label font-bold text-outline uppercase tracking-wider">
                Total
              </span>
              <span className="text-lg font-headline font-bold text-on-surface">
                {thisWeekTotal} tasks
              </span>
            </div>
          </div>
        </div>

        {/* 4-week trend */}
        <div>
          <div className="text-[10px] font-label font-bold text-outline uppercase tracking-[0.2em] mb-4">
            4-Week Trend
          </div>
          <div className="bg-surface-container-highest rounded-xl p-6">
            <MonthlyBar weeklyTotals={weeklyTotals} />
            <div className="mt-4 pt-4 border-t border-outline-variant/20 flex justify-between items-center">
              <span className="text-[10px] font-label font-bold text-outline uppercase tracking-wider">
                Avg / week
              </span>
              <span className="text-lg font-headline font-bold text-on-surface">
                {Math.round(weeklyTotals.reduce((s, c) => s + c, 0) / 4)} tasks
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming due dates */}
      {((upcomingTasks ?? []).length > 0 || overdueCount > 0) && (
        <section>
          <div className="text-[10px] font-label font-bold text-outline uppercase tracking-[0.2em] mb-4">
            Upcoming Due Dates
          </div>
          {overdueCount > 0 && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
              {overdueCount} overdue task{overdueCount > 1 ? "s" : ""}
            </div>
          )}
          <div className="space-y-2">
            {(upcomingTasks ?? []).map((task) => {
              const dueDate = new Date((task.due_date as string) + "T00:00:00");
              const todayMidnight = new Date();
              todayMidnight.setHours(0, 0, 0, 0);
              const diff = Math.round(
                (dueDate.getTime() - todayMidnight.getTime()) / 86_400_000
              );
              let label = dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              if (diff === 0) label = "Today";
              else if (diff === 1) label = "Tomorrow";

              const pillarData = task.pillars as unknown as { slug: string; label: string; color: string } | null;

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-4 px-4 py-3 bg-surface-container-high rounded-lg"
                >
                  {pillarData && (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: pillarData.color }}
                    />
                  )}
                  <span className="flex-1 text-sm text-on-surface">{task.title}</span>
                  {pillarData && (
                    <span className="text-[10px] text-outline">{pillarData.label}</span>
                  )}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      diff <= 0
                        ? "bg-red-500/15 text-red-400"
                        : diff === 1
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-surface-container text-outline"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-surface-container-high rounded-xl p-5">
      <div className="text-[10px] font-label font-bold text-outline uppercase tracking-widest mb-2">
        {label}
      </div>
      <div className="text-3xl font-headline font-extrabold text-on-surface leading-none">
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-outline mt-1.5">{sub}</div>
      )}
    </div>
  );
}

function WeeklyBar({
  dailyCounts,
  todayIndex,
}: {
  dailyCounts: number[];
  todayIndex: number;
}) {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const maxCount = Math.max(...dailyCounts, 1);

  return (
    <div className="flex items-end justify-between h-24 gap-1.5">
      {days.map((d, i) => {
        const count = dailyCounts[i];
        const isFuture = i > todayIndex;
        const isToday = i === todayIndex;
        const heightPct = count > 0 ? Math.max((count / maxCount) * 100, 8) : 0;

        let bg: string;
        if (isFuture) bg = "rgba(255,255,255,0.04)";
        else if (isToday && count > 0) bg = "rgb(var(--color-primary) / 0.9)";
        else if (count > 0) bg = "rgb(var(--color-primary) / 0.5)";
        else bg = "rgba(255,255,255,0.06)";

        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
            {count > 0 && (
              <span className="text-[9px] font-bold leading-none text-on-surface-variant">
                {count}
              </span>
            )}
            <div
              className="w-full rounded-t-sm transition-all duration-500"
              style={{
                height: heightPct > 0 ? `${heightPct}%` : "2px",
                backgroundColor: bg,
              }}
            />
            <span
              className="text-[10px] font-label font-bold uppercase tracking-wider"
              style={{
                color:
                  isToday
                    ? "rgb(var(--color-primary))"
                    : "rgb(var(--color-outline))",
              }}
            >
              {d}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyBar({ weeklyTotals }: { weeklyTotals: number[] }) {
  const maxCount = Math.max(...weeklyTotals, 1);
  const labels = ["3w ago", "2w ago", "Last wk", "This wk"];

  return (
    <div className="flex items-end justify-between h-24 gap-3">
      {weeklyTotals.map((count, i) => {
        const isCurrentWeek = i === weeklyTotals.length - 1;
        const heightPct = count > 0 ? Math.max((count / maxCount) * 100, 8) : 0;

        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
            {count > 0 && (
              <span className="text-[9px] font-bold leading-none text-on-surface-variant">
                {count}
              </span>
            )}
            <div
              className="w-full rounded-t-sm transition-all duration-500"
              style={{
                height: heightPct > 0 ? `${heightPct}%` : "2px",
                backgroundColor: isCurrentWeek
                  ? "rgb(var(--color-primary) / 0.9)"
                  : "rgb(var(--color-primary) / 0.4)",
              }}
            />
            <span
              className="text-[9px] font-label font-bold uppercase tracking-wider text-outline text-center leading-tight"
            >
              {labels[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
