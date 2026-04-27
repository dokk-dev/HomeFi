"use client";

import { useState } from "react";
import { Circle, CheckCircle2, Archive, ChevronRight, Plus, Trash2, Clock, CalendarDays, ChevronUp, ChevronDown, RefreshCw, SkipForward } from "lucide-react";
import { StepList } from "@/components/steps/StepList";
import { formatAdvisoryTime } from "@/lib/utils";
import type { Task, Step } from "@/lib/types";

interface TaskRowProps {
  task: Task;
  pillarColor: string;
  variant?: "next-action" | "backlog";
  accentTop?: boolean;
  onToggle: (taskId: string, complete: boolean) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onToggleStep: (stepId: string, complete: boolean) => Promise<void>;
  onDeleteStep: (stepId: string) => Promise<void>;
  onAddStep: (taskId: string, title: string) => Promise<void>;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function formatDueDate(due: string | null): { label: string; overdue: boolean } | null {
  if (!due) return null;
  const date = new Date(due + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  const overdue = diff < 0;
  let label: string;
  if (diff === 0) label = "Today";
  else if (diff === 1) label = "Tomorrow";
  else if (diff === -1) label = "Yesterday";
  else label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { label, overdue };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function TaskRow({
  task,
  pillarColor,
  variant = "next-action",
  accentTop = false,
  onToggle,
  onDelete,
  onToggleStep,
  onDeleteStep,
  onAddStep,
  onMoveUp,
  onMoveDown,
}: TaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(false);
  const [hoveringCheck, setHoveringCheck] = useState(false);

  const steps: Step[] = task.steps ?? [];
  const completedSteps = steps.filter((s) => s.is_complete).length;
  const timeLabel = formatAdvisoryTime(task.advisory_minutes);

  const handleToggle = async () => {
    setPending(true);
    await onToggle(task.id, !task.is_complete);
    setPending(false);
  };

  // ── BACKLOG variant (completed tasks) ──────────────────────────────────
  if (variant === "backlog") {
    return (
      <div className="group/task flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-surface-container transition-colors opacity-60 hover:opacity-100">
        <button
          onClick={handleToggle}
          disabled={pending}
          className="flex-shrink-0 text-outline hover:text-on-surface transition-colors"
        >
          <Archive size={16} />
        </button>

        <span className="flex-1 text-sm text-on-surface-variant line-through truncate">
          {task.title}
        </span>

        <span className="text-[10px] text-outline whitespace-nowrap">
          Added {timeAgo(task.created_at)}
        </span>

        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover/task:opacity-100 transition-opacity text-outline hover:text-red-400 flex-shrink-0"
          aria-label="Delete task"
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  }

  // ── NEXT ACTION variant (pending tasks) ────────────────────────────────
  return (
    <div className="group/task">
      <div
        className="flex items-center gap-3 p-4 bg-surface-container-high rounded-xl transition-colors hover:bg-surface-container-highest"
        style={
          accentTop
            ? { borderTop: `2px solid ${pillarColor}` }
            : undefined
        }
      >
        {/* Circle checkbox */}
        <button
          onClick={handleToggle}
          disabled={pending}
          onMouseEnter={() => setHoveringCheck(true)}
          onMouseLeave={() => setHoveringCheck(false)}
          className="flex-shrink-0 transition-colors"
          style={{ color: hoveringCheck ? pillarColor : undefined }}
          aria-label={task.is_complete ? "Mark incomplete" : "Mark complete"}
        >
          {hoveringCheck ? (
            <CheckCircle2 size={20} style={{ color: pillarColor }} />
          ) : (
            <Circle size={20} className="text-outline" />
          )}
        </button>

        {/* Title */}
        <span className="flex-1 text-sm font-medium text-on-surface truncate">
          {task.title}
        </span>

        {/* Time badge */}
        {timeLabel && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-surface-container text-outline flex items-center gap-1 flex-shrink-0">
            <Clock size={10} />
            {timeLabel}
          </span>
        )}

        {/* Due date badge */}
        {(() => {
          const due = formatDueDate(task.due_date);
          if (!due) return null;
          return (
            <span
              className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 flex-shrink-0 ${
                due.overdue
                  ? "bg-red-500/15 text-red-400"
                  : "bg-surface-container text-outline"
              }`}
            >
              <CalendarDays size={10} />
              {due.label}
            </span>
          );
        })()}

        {/* Recurrence badge */}
        {task.recurrence_rule && (() => {
          const { days, recurrenceType } = task.recurrence_rule;
          const shortDays = days.map((d) => d.slice(0, 2).charAt(0).toUpperCase() + d.slice(1, 2).toLowerCase()).join(" ");
          if (recurrenceType === "raincheck") {
            return (
              <span className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1 flex-shrink-0 bg-amber-500/15 text-amber-400">
                <SkipForward size={10} />
                Raincheck
              </span>
            );
          }
          return (
            <span className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1 flex-shrink-0 bg-surface-container text-outline">
              <RefreshCw size={9} />
              {shortDays}
              {recurrenceType === "temporary" && task.recurrence_rule.endsAt && (
                <span className="opacity-70">until {new Date(task.recurrence_rule.endsAt + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              )}
            </span>
          );
        })()}

        {/* Steps expand */}
        {steps.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-outline hover:text-on-surface transition-colors flex-shrink-0"
          >
            <ChevronRight
              size={16}
              className="transition-transform"
              style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
            />
          </button>
        )}

        {steps.length === 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="opacity-0 group-hover/task:opacity-100 text-outline hover:text-on-surface transition-all flex-shrink-0"
            title="Add steps"
          >
            <Plus size={16} />
          </button>
        )}

        {/* Reorder */}
        {(onMoveUp || onMoveDown) && (
          <div className="opacity-0 group-hover/task:opacity-100 transition-opacity flex flex-col gap-0.5 flex-shrink-0">
            <button
              onClick={onMoveUp}
              disabled={!onMoveUp}
              className="text-outline hover:text-on-surface transition-colors disabled:opacity-20 disabled:cursor-default"
              aria-label="Move up"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={onMoveDown}
              disabled={!onMoveDown}
              className="text-outline hover:text-on-surface transition-colors disabled:opacity-20 disabled:cursor-default"
              aria-label="Move down"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        )}

        {/* Delete */}
        <button
          onClick={() => onDelete(task.id)}
          className="opacity-0 group-hover/task:opacity-100 transition-opacity text-outline hover:text-red-400 flex-shrink-0"
          aria-label="Delete task"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Steps progress indicator */}
      {steps.length > 0 && !expanded && (
        <div className="px-4 pb-1">
          <span className="text-[10px] text-outline">
            {completedSteps}/{steps.length} steps
          </span>
        </div>
      )}

      {/* Steps expanded */}
      {expanded && (
        <div className="px-4 pb-2 pt-1">
          <StepList
            steps={steps}
            taskId={task.id}
            pillarColor={pillarColor}
            onToggleStep={onToggleStep}
            onDeleteStep={onDeleteStep}
            onAddStep={onAddStep}
          />
        </div>
      )}
    </div>
  );
}
