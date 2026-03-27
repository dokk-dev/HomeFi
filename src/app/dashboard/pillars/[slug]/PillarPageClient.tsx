"use client";

import { useState, useRef, useEffect } from "react";
import { Zap } from "lucide-react";
import { TaskList, type TaskListHandle } from "@/components/tasks/TaskList";
import { StudyAssistant } from "@/components/chat/StudyAssistant";
import { PILLAR_ICONS } from "@/lib/icons/pillarIcons";
import type { Task } from "@/lib/types";

interface Pillar {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  color: string;
}

interface Props {
  pillar: Pillar;
  tasks: Task[];
  mastery: number;
  completed: number;
  total: number;
}

export function PillarPageClient({ pillar, tasks, mastery, completed, total }: Props) {
  const [tutorOpen, setTutorOpen] = useState(false);
  const [zapReady, setZapReady] = useState(false);
  const PillarIcon = PILLAR_ICONS[pillar.slug];
  const taskListRef = useRef<TaskListHandle>(null);

  useEffect(() => {
    // Slide panel in shortly after mount
    const panelTimer = setTimeout(() => setTutorOpen(true), 60);
    // Zap pops in after TopBar Zap has finished exiting
    const zapTimer = setTimeout(() => setZapReady(true), 280);
    return () => {
      clearTimeout(panelTimer);
      clearTimeout(zapTimer);
    };
  }, []);

  return (
    <div className="flex flex-1 min-h-0 relative">
      {/* ── Main scrollable content ───────────────────────────────────────── */}
      <div
        className={`flex-1 overflow-y-auto transition-[margin] duration-[320ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          tutorOpen ? "mr-96" : ""
        }`}
      >
        <div className="p-10 max-w-2xl">
          {/* ACTIVE PILLAR header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: pillar.color }}
              />
              <span
                className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: pillar.color }}
              >
                Active Pillar
              </span>
            </div>

            <h2 className="text-5xl font-extrabold font-headline tracking-tighter text-on-surface leading-none mb-3">
              {pillar.label}
            </h2>

            {pillar.description && (
              <p className="text-on-surface-variant text-sm mb-4">
                {pillar.description}
              </p>
            )}

            {/* Icon + progress */}
            <div className="flex items-center gap-4">
              {PillarIcon && (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0"
                  style={{
                    backgroundColor: `${pillar.color}15`,
                    borderColor: `${pillar.color}30`,
                  }}
                >
                  <PillarIcon size={20} style={{ color: pillar.color }} />
                </div>
              )}
              {total > 0 && (
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 h-[3px] bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${mastery}%`, backgroundColor: pillar.color }}
                    />
                  </div>
                  <span className="text-[10px] font-label font-bold text-outline uppercase tracking-widest whitespace-nowrap">
                    {completed}/{total} · {mastery}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Task list */}
          <TaskList
            ref={taskListRef}
            initialTasks={tasks}
            pillarId={pillar.id}
            pillarColor={pillar.color}
          />
        </div>
      </div>

      {/* ── AI Tutor right panel ───────────────────────────────────────────── */}
      <aside
        className="fixed right-0 top-16 w-96 h-[calc(100vh-4rem)] border-l border-outline-variant/10 bg-surface-container flex flex-col z-30"
        style={{
          transform: tutorOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 320ms cubic-bezier(0.4,0,0.2,1)",
          pointerEvents: tutorOpen ? "auto" : "none",
        }}
      >
        <StudyAssistant
          pillarSlug={pillar.slug}
          pillarLabel={pillar.label}
          pillarColor={pillar.color}
          asPanel
          onClose={() => setTutorOpen(false)}
          taskCount={tasks.filter((t) => !t.is_complete).length}
        />
      </aside>

      {/* ── Floating action button ─────────────────────────────────────────── */}
      {!tutorOpen && (
        <button
          onClick={() => setTutorOpen(true)}
          className="fixed bottom-8 right-8 w-12 h-12 rounded-full shadow-lg flex items-center justify-center hover:scale-110 z-30"
          style={{
            backgroundColor: pillar.color,
            opacity: zapReady ? 1 : 0,
            transform: zapReady ? "scale(1)" : "scale(0)",
            transition: "opacity 200ms ease, transform 320ms cubic-bezier(0.34,1.56,0.64,1)",
          }}
          title="Open AI Tutor"
        >
          <Zap size={20} color="white" />
        </button>
      )}

      {tutorOpen && (
        <button
          onClick={() => taskListRef.current?.openAddTask()}
          className="fixed bottom-8 z-30 w-12 h-12 rounded-full shadow-lg flex items-center justify-center hover:scale-110"
          style={{
            right: "416px",
            backgroundColor: pillar.color,
            opacity: zapReady ? 1 : 0,
            transform: zapReady ? "scale(1)" : "scale(0)",
            transition: "opacity 200ms ease, transform 320ms cubic-bezier(0.34,1.56,0.64,1)",
          }}
          title="Add task"
        >
          <Zap size={20} color="white" />
        </button>
      )}
    </div>
  );
}
