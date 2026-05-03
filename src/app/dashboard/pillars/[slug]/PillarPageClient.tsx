"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, GraduationCap, Clock } from "lucide-react";
import { TaskList, type TaskListHandle } from "@/components/tasks/TaskList";
import { StudyAssistant } from "@/components/chat/StudyAssistant";
import { QuizFlow } from "@/components/quiz/QuizFlow";
import { resolveIcon } from "@/lib/icons/pillarIcons";
import type { Task, CompetencyArea } from "@/lib/types";
import type { PillarMastery } from "@/lib/quiz/mastery";

interface Pillar {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  color: string;
  icon_key: string | null;
  competency_areas?: CompetencyArea[];
}

interface Props {
  pillar: Pillar;
  tasks: Task[];
  mastery: PillarMastery;
  completed: number;
  total: number;
}

export function PillarPageClient({ pillar, tasks, mastery, completed, total }: Props) {
  const router = useRouter();
  const [tutorOpen, setTutorOpen] = useState(false);
  const [zapReady, setZapReady] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const PillarIcon = resolveIcon(pillar.slug, pillar.icon_key);
  const taskListRef = useRef<TaskListHandle>(null);

  const hasRubric = (pillar.competency_areas?.length ?? 0) >= 3;

  useEffect(() => {
    // Zap pops in after TopBar Zap has finished exiting
    const zapTimer = setTimeout(() => setZapReady(true), 280);
    return () => clearTimeout(zapTimer);
  }, []);

  return (
    <div className="flex flex-1 min-h-0 relative">
      {/* ── Main scrollable content ───────────────────────────────────────── */}
      <div
        className={`flex-1 overflow-y-auto transition-[margin] duration-[320ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          tutorOpen ? "md:mr-96" : ""
        }`}
      >
        <div className="p-4 md:p-10 max-w-2xl">
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

            <h2 className="text-3xl md:text-5xl font-extrabold font-headline tracking-tighter text-on-surface leading-none mb-3">
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
              <div className="flex-1 flex items-center gap-3">
                <div className="flex-1 h-[3px] bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${mastery.overall}%`, backgroundColor: pillar.color }}
                  />
                </div>
                <span
                  className="text-[10px] font-label font-bold uppercase tracking-widest whitespace-nowrap"
                  style={{ color: pillar.color }}
                >
                  {mastery.level.name} · {mastery.overall}%
                </span>
              </div>
            </div>

            {total > 0 && (
              <div className="mt-2 text-[10px] text-outline font-label uppercase tracking-widest">
                {completed}/{total} tasks complete
              </div>
            )}

            {/* Take test CTA */}
            <div className="mt-4">
              <button
                onClick={() => setQuizOpen(true)}
                disabled={!hasRubric}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: hasRubric ? `${pillar.color}15` : undefined,
                  color: hasRubric ? pillar.color : undefined,
                  border: `1px solid ${hasRubric ? pillar.color + "40" : "var(--color-outline-variant)"}`,
                }}
                title={hasRubric ? "Take a 10-question test" : "Set the mastery rubric in Settings first"}
              >
                <GraduationCap size={14} />
                {hasRubric ? "Take mastery test" : "Set rubric first"}
              </button>
              {!hasRubric && (
                <p className="text-[10px] text-outline mt-1.5">
                  Mastery is earned by passing tests. Define the rubric for this pillar in <a href="/dashboard/settings" className="underline hover:text-on-surface transition-colors">Settings</a>.
                </p>
              )}
            </div>
          </div>

          {/* Per-competency breakdown */}
          {hasRubric && (
            <div className="mb-8">
              <div className="text-[10px] font-label font-bold text-outline uppercase tracking-[0.2em] mb-3">
                Competency Breakdown
              </div>
              <div className="space-y-2">
                {mastery.per_competency.map((c) => (
                  <CompetencyRow key={c.name} competency={c} pillarColor={pillar.color} />
                ))}
              </div>
            </div>
          )}

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
        className="fixed right-0 top-16 w-full md:w-96 h-[calc(100vh-4rem)] border-l border-outline-variant/10 bg-surface-container flex flex-col z-30"
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
      <button
        onClick={() => tutorOpen ? taskListRef.current?.openAddTask() : setTutorOpen(true)}
        className="fixed bottom-8 w-12 h-12 rounded-full shadow-lg flex items-center justify-center hover:scale-110 z-30"
        style={{
          right: tutorOpen ? "416px" : "32px",
          backgroundColor: pillar.color,
          opacity: zapReady ? 1 : 0,
          transform: zapReady ? "scale(1)" : "scale(0.5)",
          transition: [
            "right 320ms cubic-bezier(0.4,0,0.2,1)",
            "opacity 200ms ease",
            "transform 320ms cubic-bezier(0.34,1.56,0.64,1)",
          ].join(", "),
        }}
        title={tutorOpen ? "Add task" : "Open AI Tutor"}
      >
        <Zap size={20} color="white" />
      </button>

      {/* ── Quiz modal ─────────────────────────────────────────────────────── */}
      {quizOpen && (
        <QuizFlow
          pillarId={pillar.id}
          pillarLabel={pillar.label}
          pillarColor={pillar.color}
          onClose={() => {
            setQuizOpen(false);
            // Re-fetch server data so the per-competency breakdown reflects the new quiz
            router.refresh();
          }}
          onMasteryChanged={() => {
            // Server will recompute; refresh on close handles the visual update
          }}
        />
      )}
    </div>
  );
}

function CompetencyRow({
  competency,
  pillarColor,
}: {
  competency: PillarMastery["per_competency"][number];
  pillarColor: string;
}) {
  const isStale =
    competency.days_since_last !== null && competency.days_since_last > 7;
  const tested = competency.quiz_count > 0;

  return (
    <div
      className="bg-surface-container-low rounded-lg p-3 border-l-2"
      style={{ borderColor: tested ? pillarColor : "rgba(255,255,255,0.1)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold text-on-surface truncate">
              {competency.name}
            </span>
            <span
              className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{
                color: tested ? pillarColor : "var(--color-outline)",
                backgroundColor: tested ? `${pillarColor}15` : "rgba(255,255,255,0.05)",
              }}
            >
              {competency.level.name}
            </span>
          </div>
          <p className="text-[11px] text-outline line-clamp-2">
            {competency.description}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-base font-bold text-on-surface leading-none">
            {competency.score}%
          </div>
          <div className="text-[9px] text-outline mt-1">
            w {competency.weight}/10
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 bg-surface-container rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${competency.score}%`,
              backgroundColor: tested ? pillarColor : "rgba(255,255,255,0.1)",
            }}
          />
        </div>
        <span className="text-[10px] text-outline whitespace-nowrap">
          {tested ? `${competency.quiz_count} quiz${competency.quiz_count === 1 ? "" : "es"}` : "untested"}
        </span>
      </div>
      {isStale && competency.decayed_by > 0 && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-amber-400">
          <Clock size={10} />
          Decayed {competency.decayed_by}pts · last tested {Math.floor(competency.days_since_last!)}d ago
        </div>
      )}
    </div>
  );
}
