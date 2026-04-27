"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutList,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Circle,
  BarChart2,
  Zap,
  Plus,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import type { PillarMeta } from "@/lib/constants/pillars";

interface Task {
  id: string;
  pillar_id: string;
  title: string;
  is_complete: boolean;
  advisory_minutes: number | null;
  due_date: string | null;
  created_at: string;
  pillarSlug: string;
  pillarLabel: string;
  pillarColor: string;
}

interface PillarStat {
  id: string;
  slug: string;
  label: string;
  color: string;
  total: number;
  completed: number;
  pct: number;
  meta: PillarMeta | undefined;
}

interface Props {
  tasks: Task[];
  pillars: PillarStat[];
  userAvatarUrl: string | null;
}

type Perspective = "all" | "today" | "upcoming" | "completed";

function formatDue(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff <= 7) return "Next Week";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function priorityFromMinutes(mins: number | null): "High" | "Medium" | "Low" {
  if (!mins) return "Low";
  if (mins >= 90) return "High";
  if (mins >= 30) return "Medium";
  return "Low";
}

const PRIORITY_COLOR = {
  High: "#ef4444",
  Medium: "#6366f1",
  Low: "#71717a",
};

export function TasksClient({ tasks, pillars, userAvatarUrl }: Props) {
  const router = useRouter();
  const [perspective, setPerspective] = useState<Perspective>("all");
  const [completing, setCompleting] = useState<Set<string>>(new Set());

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const tomorrowStr = new Date(now.getTime() + 86_400_000).toISOString().split("T")[0];

  const filtered = tasks.filter((t) => {
    if (perspective === "completed") return t.is_complete;
    if (perspective === "all") return !t.is_complete;
    if (perspective === "today") return !t.is_complete && t.due_date === todayStr;
    if (perspective === "upcoming")
      return !t.is_complete && t.due_date != null && t.due_date >= tomorrowStr;
    return true;
  });

  const activeCount = tasks.filter((t) => !t.is_complete).length;

  async function toggleTask(taskId: string, current: boolean) {
    setCompleting((s) => new Set(s).add(taskId));
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_complete: !current }),
    });
    router.refresh();
  }

  // Focus score: weighted completion across pillars
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.is_complete).length;
  const focusScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const perspectives: { key: Perspective; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All Tasks", icon: <LayoutList size={16} /> },
    { key: "today", label: "Today", icon: <Calendar size={16} /> },
    { key: "upcoming", label: "Upcoming", icon: <CalendarDays size={16} /> },
    { key: "completed", label: "Completed", icon: <CheckCircle2 size={16} /> },
  ];

  return (
    <div className="flex flex-1 min-h-0 p-4 md:p-8 gap-6 md:gap-8">
      {/* ── Left sidebar ──────────────────────────────────────────────── */}
      <div className="hidden md:block w-52 flex-shrink-0 space-y-6">
        {/* Perspective */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">
            Perspective
          </p>
          <div className="space-y-0.5">
            {perspectives.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setPerspective(key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  perspective === key
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority legend */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">
            Priority
          </p>
          <div className="space-y-2">
            {(["High", "Medium", "Low"] as const).map((level) => (
              <div key={level} className="flex items-center gap-2.5 px-3">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: PRIORITY_COLOR[level] }}
                />
                <span className="text-sm text-on-surface-variant">{level}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pillar legend */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-3">
            Pillars
          </p>
          <div className="space-y-1.5">
            {pillars.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 px-3">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-sm text-on-surface-variant">{p.meta?.shortLabel ?? p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold font-headline tracking-tight text-on-surface">
              Master Task View
            </h1>
            <p className="text-on-surface-variant text-sm mt-1">
              {activeCount} active intention{activeCount !== 1 ? "s" : ""} across all life pillars.
            </p>
          </div>
          <div className="flex gap-2 mt-1">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant/20 text-sm text-on-surface-variant hover:bg-surface-container transition-colors">
              <SlidersHorizontal size={14} />
              Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant/20 text-sm text-on-surface-variant hover:bg-surface-container transition-colors">
              <ArrowUpDown size={14} />
              Sort
            </button>
          </div>
        </div>

        {/* Task list */}
        <div className="bg-surface-container-low rounded-xl overflow-hidden border border-outline-variant/10">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-outline text-sm">
              No tasks in this view.
            </div>
          ) : (
            filtered.map((task) => {
              const priority = priorityFromMinutes(task.advisory_minutes);
              const dueLabel = formatDue(task.due_date);
              const isToday = task.due_date === todayStr;
              const isPending = completing.has(task.id);

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-4 px-5 py-4 border-b border-outline-variant/10 last:border-b-0 hover:bg-surface-container transition-colors group"
                  style={{ borderLeft: `3px solid ${task.pillarColor}` }}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTask(task.id, task.is_complete)}
                    disabled={isPending}
                    className="flex-shrink-0 text-outline hover:text-primary transition-colors disabled:opacity-50"
                  >
                    {task.is_complete ? (
                      <CheckCircle2 size={20} className="text-primary" />
                    ) : (
                      <Circle size={20} />
                    )}
                  </button>

                  {/* Pillar badge */}
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded flex-shrink-0"
                    style={{
                      backgroundColor: `${task.pillarColor}20`,
                      color: task.pillarColor,
                    }}
                  >
                    {task.pillarLabel}
                  </span>

                  {/* Title */}
                  <span
                    className={`flex-1 text-sm font-medium truncate ${
                      task.is_complete ? "line-through text-outline" : "text-on-surface"
                    }`}
                  >
                    {task.title}
                  </span>

                  {/* Priority */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 text-on-surface-variant">
                    <BarChart2
                      size={14}
                      style={{ color: PRIORITY_COLOR[priority] }}
                    />
                    <span className="text-xs">{priority}</span>
                  </div>

                  {/* Due date */}
                  {dueLabel && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Calendar size={13} className="text-outline" />
                      <span
                        className={`text-xs font-medium ${
                          isToday ? "text-primary" : "text-on-surface-variant"
                        }`}
                      >
                        {dueLabel}
                      </span>
                    </div>
                  )}

                  {/* Avatar */}
                  <div className="w-6 h-6 rounded-full bg-surface-container-highest overflow-hidden flex-shrink-0">
                    {userAvatarUrl ? (
                      <Image src={userAvatarUrl} alt="You" width={24} height={24} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                        <span className="text-[9px] font-bold text-primary">Y</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Intentionality Progress */}
          <div className="col-span-2 bg-surface-container-low rounded-xl p-6 border border-outline-variant/10">
            <h3 className="text-base font-headline font-bold text-on-surface mb-1">
              Intentionality Progress
            </h3>
            {pillars.filter((p) => p.total > 0).length > 0 ? (
              <>
                <p className="text-sm text-on-surface-variant mb-4">
                  {pillars
                    .filter((p) => p.total > 0)
                    .sort((a, b) => b.pct - a.pct)
                    .slice(0, 2)
                    .map((p, i) => (
                      <span key={p.id}>
                        {i === 0
                          ? `You've completed ${p.pct}% of your ${p.meta?.shortLabel ?? p.label} goals.`
                          : ` ${p.meta?.shortLabel ?? p.label} ${p.pct < 50 ? "is lagging slightly." : "is on track."}`}
                      </span>
                    ))}
                </p>
                <div className="space-y-3">
                  {pillars
                    .filter((p) => p.total > 0)
                    .map((p) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${p.pct}%`, backgroundColor: p.color }}
                          />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-outline w-28 text-right">
                          {p.meta?.shortLabel ?? p.label}
                        </span>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-outline">Add tasks to your pillars to track progress.</p>
            )}
          </div>

          {/* Focus Score */}
          <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/10 flex flex-col items-center justify-center text-center">
            <Zap size={24} className="text-primary mb-3" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">
              Focus Score
            </p>
            <p className="text-5xl font-extrabold font-headline text-on-surface leading-none">
              {focusScore}
            </p>
            <p className="text-xs text-emerald-400 font-medium mt-2">
              {completedTasks}/{totalTasks} tasks complete
            </p>
          </div>
        </div>
      </div>

      {/* ── Floating add button ───────────────────────────────────────── */}
      <button
        className="fixed bottom-8 right-8 w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg hover:opacity-90 hover:scale-105 transition-all z-30"
        title="Add task"
      >
        <Plus size={22} color="white" />
      </button>
    </div>
  );
}
