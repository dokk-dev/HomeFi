"use client";

import { StepRow } from "./StepRow";
import { StepForm } from "./StepForm";
import type { Step } from "@/lib/types";

interface StepListProps {
  steps: Step[];
  taskId: string;
  pillarColor: string;
  onToggleStep: (stepId: string, complete: boolean) => Promise<void>;
  onDeleteStep: (stepId: string) => Promise<void>;
  onAddStep: (taskId: string, title: string) => Promise<void>;
}

export function StepList({
  steps,
  taskId,
  pillarColor,
  onToggleStep,
  onDeleteStep,
  onAddStep,
}: StepListProps) {
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
