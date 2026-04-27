"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ListTodo } from "lucide-react";
import { PILLAR_ICONS } from "@/lib/icons/pillarIcons";

interface FocusTask {
  id: string;
  title: string;
  notes?: string | null;
  advisory_minutes?: number | null;
  pillars?: {
    slug: string;
    label: string;
    color: string;
  } | null;
}

type Phase = "task" | "done" | "popping" | "empty";

export function FocusSection({ focusTask }: { focusTask: FocusTask }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("task");

  const color = focusTask.pillars?.color ?? "#6366f1";
  const FocusIcon = focusTask.pillars?.slug ? PILLAR_ICONS[focusTask.pillars.slug] ?? null : null;

  async function handleComplete() {
    if (phase !== "task") return;
    setPhase("done");

    await fetch(`/api/tasks/${focusTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_complete: true }),
    });

    setTimeout(() => {
      setPhase("popping");
      setTimeout(() => {
        setPhase("empty");
        setTimeout(() => router.refresh(), 800);
      }, 270);
    }, 450);
  }

  // ── Empty state (blooms in from center) ───────────────────────────────────
  if (phase === "empty") {
    return (
      <div
        className="bg-surface-container-low rounded-xl p-8 flex items-center gap-6"
        style={{ animation: "bloomIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
      >
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
    );
  }

  // ── Task card (collapses inward on exit) ──────────────────────────────────
  const isPopping = phase === "popping";
  const isDone = phase === "done";

  return (
    <div
      style={{
        ...(isPopping ? { opacity: 0, transform: "scale(0.88)" } : { opacity: 1, transform: "none" }),
        transition: isPopping ? "opacity 220ms ease-in, transform 250ms cubic-bezier(0.4,0,1,1)" : "none",
        pointerEvents: isPopping ? "none" : undefined,
      }}
    >
      <div className="bg-surface-container-low rounded-xl p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between relative overflow-hidden gap-6">
        {/* Ambient glow */}
        <div
          className="absolute -right-20 -top-20 w-64 h-64 blur-[100px] pointer-events-none"
          style={{ backgroundColor: `${color}10` }}
        />

        <div className="relative z-10 flex items-center gap-5 md:gap-8">
          <div
            className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center border flex-shrink-0"
            style={{ backgroundColor: `${color}1a`, borderColor: `${color}30` }}
          >
            {FocusIcon && <FocusIcon size={32} className="md:hidden" style={{ color }} />}
            {FocusIcon && <FocusIcon size={40} className="hidden md:block" style={{ color }} />}
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-headline font-extrabold tracking-tight text-on-surface mb-2">
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
                style={{ backgroundColor: `${color}1a` }}
                title={focusTask.pillars?.label ?? "Pillar"}
              >
                <FocusIcon size={14} style={{ color }} />
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between md:flex-col md:items-end md:text-right">
          {focusTask.advisory_minutes && (
            <div className="md:mb-0">
              <div
                className="text-3xl md:text-4xl font-headline font-black tracking-tighter"
                style={{ color }}
              >
                {focusTask.advisory_minutes}
                <span className="text-lg md:text-xl text-outline">m</span>
              </div>
              <div className="text-[10px] font-label font-bold text-outline uppercase tracking-widest">
                Advisory
              </div>
            </div>
          )}
          <button
            onClick={handleComplete}
            disabled={phase !== "task"}
            className="md:mt-4 inline-flex items-center gap-2 px-5 md:px-6 py-2 text-white text-xs font-headline font-bold rounded-full hover:opacity-90 disabled:cursor-default"
            style={{
              backgroundColor: isDone ? "#22c55e" : color,
              boxShadow: `0 0 20px ${isDone ? "#22c55e" : color}40`,
              transition: "background-color 200ms ease, box-shadow 200ms ease",
            }}
          >
            {isDone ? <><CheckCircle size={14} /> Done!</> : "Complete Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
