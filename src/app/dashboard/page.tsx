import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { PillarGrid } from "@/components/pillars/PillarGrid";
import { ListTodo, ArrowRight, Circle } from "lucide-react";
import { PILLAR_ICONS } from "@/lib/icons/pillarIcons";
import type { Pillar } from "@/lib/types";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const supabase = getSupabaseAdminClient();

  const { data: pillars } = await supabase
    .from("pillars")
    .select("*")
    .eq("user_id", session.user.id)
    .order("position");

  const { data: taskCounts } = await supabase
    .from("tasks")
    .select("pillar_id, is_complete")
    .eq("user_id", session.user.id);

  const enrichedPillars: Pillar[] = (pillars ?? []).map((pillar) => {
    const pillarTasks = taskCounts?.filter((t) => t.pillar_id === pillar.id) ?? [];
    return {
      ...pillar,
      task_count: pillarTasks.length,
      completed_count: pillarTasks.filter((t) => t.is_complete).length,
    };
  });

  // Current focus: most recently updated incomplete task across all pillars
  const { data: focusTask } = await supabase
    .from("tasks")
    .select("*, pillars(slug, label, color, icon_key)")
    .eq("user_id", session.user.id)
    .eq("is_complete", false)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  // Queue: next 5 incomplete tasks (excluding the focus task)
  const { data: queueTasks } = await supabase
    .from("tasks")
    .select("*, pillars(slug, label, color, icon_key)")
    .eq("user_id", session.user.id)
    .eq("is_complete", false)
    .neq("id", focusTask?.id ?? "")
    .order("updated_at", { ascending: false })
    .limit(5);

  const totalTasks = enrichedPillars.reduce((sum, p) => sum + (p.task_count ?? 0), 0);
  const completedTasks = enrichedPillars.reduce((sum, p) => sum + (p.completed_count ?? 0), 0);

  const FocusIcon = focusTask?.pillars?.slug
    ? PILLAR_ICONS[focusTask.pillars.slug]
    : null;

  return (
    <div className="p-10 flex-1 space-y-12 max-w-6xl w-full">

      {/* ── Current Focus ── */}
      <section>
        <div className="text-[10px] font-label font-bold text-primary uppercase tracking-[0.2em] mb-4">
          Current Focus
        </div>

        {focusTask ? (
          <div className="bg-surface-container-low rounded-xl p-8 flex items-center justify-between relative overflow-hidden">
            {/* Ambient glow */}
            <div
              className="absolute -right-20 -top-20 w-64 h-64 blur-[100px] pointer-events-none"
              style={{ backgroundColor: `${focusTask.pillars?.color ?? "#6366f1"}10` }}
            />

            <div className="relative z-10 flex items-center gap-8">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center border"
                style={{
                  backgroundColor: `${focusTask.pillars?.color ?? "#6366f1"}1a`,
                  borderColor: `${focusTask.pillars?.color ?? "#6366f1"}30`,
                }}
              >
                {FocusIcon && (
                  <FocusIcon
                    size={40}
                    style={{ color: focusTask.pillars?.color ?? "#6366f1" }}
                  />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-headline font-extrabold tracking-tight text-on-surface mb-2">
                  {focusTask.title}
                </h1>
                {focusTask.notes && (
                  <p className="text-on-surface-variant text-sm max-w-md line-clamp-2">
                    {focusTask.notes}
                  </p>
                )}
                {FocusIcon && (
                  <div
                    className="inline-flex items-center gap-1.5 mt-3 px-2 py-1 rounded"
                    style={{ backgroundColor: `${focusTask.pillars?.color ?? "#6366f1"}1a` }}
                    title={focusTask.pillars?.label ?? "Pillar"}
                  >
                    <FocusIcon
                      size={14}
                      style={{ color: focusTask.pillars?.color ?? "#6366f1" }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="relative z-10 text-right">
              {focusTask.advisory_minutes && (
                <>
                  <div
                    className="text-4xl font-headline font-black tracking-tighter mb-1"
                    style={{ color: focusTask.pillars?.color ?? "#6366f1" }}
                  >
                    {focusTask.advisory_minutes}
                    <span className="text-xl text-outline">m</span>
                  </div>
                  <div className="text-[10px] font-label font-bold text-outline uppercase tracking-widest">
                    Time Remaining
                  </div>
                </>
              )}
              <a
                href={`/dashboard/pillars/${focusTask.pillars?.slug ?? ""}`}
                className="mt-4 inline-block px-6 py-2 text-white text-xs font-headline font-bold rounded-full transition-all hover:opacity-90"
                style={{
                  backgroundColor: focusTask.pillars?.color ?? "#6366f1",
                  boxShadow: `0 0 20px ${focusTask.pillars?.color ?? "#6366f1"}40`,
                }}
              >
                Complete Task
              </a>
            </div>
          </div>
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
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Task Queue */}
        <div className="lg:col-span-2">
          <div className="text-[10px] font-label font-bold text-outline uppercase tracking-[0.2em] mb-6">
            Queue
          </div>
          <div className="space-y-3">
            {(queueTasks ?? []).length === 0 && (
              <p className="text-on-surface-variant text-sm py-4">
                No tasks queued. Add tasks to your pillars to fill this list.
              </p>
            )}
            {(queueTasks ?? []).map((task) => {
              const QueueIcon = task.pillars?.slug
                ? PILLAR_ICONS[task.pillars.slug]
                : null;
              const pillarColor = task.pillars?.color ?? "#6366f1";
              return (
                <a
                  key={task.id}
                  href={`/dashboard/pillars/${task.pillars?.slug ?? ""}`}
                  className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border-l-2 border-transparent transition-all cursor-pointer"
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderLeftColor = pillarColor)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderLeftColor = "transparent")
                  }
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
            <WeeklyChart completedTasks={completedTasks} totalTasks={totalTasks} />
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

function WeeklyChart({}: {
  completedTasks: number;
  totalTasks: number;
}) {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const heights = [40, 60, 30, 80, 95, 10, 10];

  return (
    <>
      <div className="flex items-end justify-between h-28 gap-1.5 mb-3">
        {days.map((day, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-sm transition-all"
              style={{
                height: `${heights[i]}%`,
                backgroundColor:
                  i < 5
                    ? `rgba(99, 102, 241, ${0.15 + (heights[i] / 100) * 0.65})`
                    : "rgba(255,255,255,0.04)",
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] font-label font-bold text-outline uppercase tracking-wider">
        {days.map((d, i) => (
          <span key={i} className="flex-1 text-center">
            {d}
          </span>
        ))}
      </div>
    </>
  );
}
