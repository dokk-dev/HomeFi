"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import type { Step } from "@/lib/types";

interface StepRowProps {
  step: Step;
  pillarColor: string;
  onToggle: (stepId: string, complete: boolean) => Promise<void>;
  onDelete: (stepId: string) => Promise<void>;
}

export function StepRow({ step, pillarColor, onToggle, onDelete }: StepRowProps) {
  const [pending, setPending] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setPending(true);
    await onToggle(step.id, checked);
    setPending(false);
  };

  return (
    <div className="flex items-center gap-2 py-1.5 group/step">
      <div className="w-4 flex-shrink-0" /> {/* indent */}
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
