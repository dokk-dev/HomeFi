"use client";

import { useState, useCallback, useImperativeHandle, forwardRef, useRef } from "react";
import { Plus } from "lucide-react";
import { TaskRow } from "./TaskRow";
import { TaskForm } from "./TaskForm";
import type { Task, Step, CreateTaskInput } from "@/lib/types";

interface TaskListProps {
  initialTasks: Task[];
  pillarId: string;
  pillarColor: string;
}

export interface TaskListHandle {
  openAddTask: () => void;
}

export const TaskList = forwardRef<TaskListHandle, TaskListProps>(function TaskList(
  { initialTasks, pillarId, pillarColor },
  ref
) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    openAddTask: () => {
      setShowForm(true);
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    },
  }));

  // ─── Task actions ──────────────────────────────────────────────────────
  const addTask = useCallback(async (input: CreateTaskInput) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const task: Task = await res.json();
      setTasks((prev) => [...prev, { ...task, steps: [] }]);
      setShowForm(false);
    }
  }, []);

  const toggleTask = useCallback(async (taskId: string, complete: boolean) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_complete: complete } : t))
    );
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_complete: complete }),
    });
    if (!res.ok) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, is_complete: !complete } : t))
      );
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (!res.ok) window.location.reload();
  }, []);

  // ─── Step actions ──────────────────────────────────────────────────────
  const addStep = useCallback(async (taskId: string, title: string) => {
    const res = await fetch("/api/steps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, title }),
    });
    if (res.ok) {
      const step: Step = await res.json();
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, steps: [...(t.steps ?? []), step] } : t
        )
      );
    }
  }, []);

  const toggleStep = useCallback(async (stepId: string, complete: boolean) => {
    setTasks((prev) =>
      prev.map((t) => ({
        ...t,
        steps: t.steps?.map((s) =>
          s.id === stepId ? { ...s, is_complete: complete } : s
        ),
      }))
    );
    const res = await fetch(`/api/steps/${stepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_complete: complete }),
    });
    if (!res.ok) {
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          steps: t.steps?.map((s) =>
            s.id === stepId ? { ...s, is_complete: !complete } : s
          ),
        }))
      );
    }
  }, []);

  const deleteStep = useCallback(async (stepId: string) => {
    setTasks((prev) =>
      prev.map((t) => ({
        ...t,
        steps: t.steps?.filter((s) => s.id !== stepId),
      }))
    );
    await fetch(`/api/steps/${stepId}`, { method: "DELETE" });
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────
  const nextActions = tasks.filter((t) => !t.is_complete);
  const backlog = tasks.filter((t) => t.is_complete);

  return (
    <div className="space-y-8">
      {/* NEXT ACTIONS ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-outline">
            Next Actions
            {nextActions.length > 0 && (
              <span className="ml-2 text-outline/60">— {nextActions.length}</span>
            )}
          </h3>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-outline hover:text-on-surface transition-colors"
          >
            <Plus size={14} />
            Add task
          </button>
        </div>

        {/* Add task form */}
        {showForm && (
          <div ref={formRef} className="mb-3 bg-surface-container-high rounded-xl p-4 border border-outline-variant/10">
            <TaskForm
              pillarId={pillarId}
              pillarColor={pillarColor}
              onAdd={addTask}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {nextActions.length === 0 && !showForm && (
          <div className="text-center py-10 text-outline text-sm rounded-xl border border-dashed border-outline-variant/20">
            No active tasks · Add one to get started
          </div>
        )}

        <div className="space-y-2">
          {nextActions.map((task, idx) => (
            <TaskRow
              key={task.id}
              task={task}
              pillarColor={pillarColor}
              variant="next-action"
              accentTop={idx === 0}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onToggleStep={toggleStep}
              onDeleteStep={deleteStep}
              onAddStep={addStep}
            />
          ))}
        </div>
      </div>

      {/* BACKLOG ──────────────────────────────────────────────────────── */}
      {backlog.length > 0 && (
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-outline mb-3">
            Backlog
            <span className="ml-2 text-outline/60">— {backlog.length}</span>
          </h3>
          <div className="space-y-1">
            {backlog.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                pillarColor={pillarColor}
                variant="backlog"
                onToggle={toggleTask}
                onDelete={deleteTask}
                onToggleStep={toggleStep}
                onDeleteStep={deleteStep}
                onAddStep={addStep}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
