"use client";

import { useState, useRef } from "react";
import { X } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import type { Step } from "@/lib/types";

// ── StepRow ───────────────────────────────────────────────────────────────

interface StepRowProps {
  step: Step;
  pillarColor: string;
  onToggle: (stepId: string, complete: boolean) => Promise<void>;
  onDelete: (stepId: string) => Promise<void>;
}

function StepRow({ step, pillarColor, onToggle, onDelete }: StepRowProps) {
  const [pending, setPending] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setPending(true);
    await onToggle(step.id, checked);
    setPending(false);
  };

  return (
    <div className="flex items-center gap-2 py-1.5 group/step">
      <div className="w-4 flex-shrink-0" />
      <Checkbox
        checked={step.is_complete}
        onChange={handleToggle}
        label={step.title}
        id={`step-${step.id}`}
        color={pillarColor}
        disabled={pending}
      />
      <button
        onClick={() => onDelete(step.id)}
        className="ml-auto opacity-0 group-hover/step:opacity-100 transition-opacity text-zinc-600 hover:text-red-400"
        aria-label="Delete step"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ── StepForm ──────────────────────────────────────────────────────────────

interface StepFormProps {
  taskId: string;
  pillarColor: string;
  onAdd: (taskId: string, title: string) => Promise<void>;
}

function StepForm({ taskId, pillarColor, onAdd }: StepFormProps) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setSaving(true);
    await onAdd(taskId, value.trim());
    setValue("");
    setSaving(false);
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 pl-4 mt-1">
      <div className="w-4 flex-shrink-0" />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a step..."
        className="py-1 text-xs bg-zinc-800/50 border-zinc-700/50"
        disabled={saving}
      />
      {value.trim() && (
        <button
          type="submit"
          disabled={saving}
          className="shrink-0 text-xs px-2 py-1 rounded transition-colors text-white disabled:opacity-50"
          style={{ backgroundColor: pillarColor }}
        >
          Add
        </button>
      )}
    </form>
  );
}

// ── StepList ──────────────────────────────────────────────────────────────

interface StepListProps {
  steps: Step[];
  taskId: string;
  pillarColor: string;
  onToggleStep: (stepId: string, complete: boolean) => Promise<void>;
  onDeleteStep: (stepId: string) => Promise<void>;
  onAddStep: (taskId: string, title: string) => Promise<void>;
}

export function StepList({ steps, taskId, pillarColor, onToggleStep, onDeleteStep, onAddStep }: StepListProps) {
  return (
    <div className="mt-1 space-y-0.5 border-l-2 ml-2.5" style={{ borderColor: `${pillarColor}30` }}>
      {steps.map((step) => (
        <StepRow
          key={step.id}
          step={step}
          pillarColor={pillarColor}
          onToggle={onToggleStep}
          onDelete={onDeleteStep}
        />
      ))}
      <StepForm taskId={taskId} pillarColor={pillarColor} onAdd={onAddStep} />
    </div>
  );
}
