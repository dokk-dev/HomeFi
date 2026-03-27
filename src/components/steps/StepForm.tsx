"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/Input";

interface StepFormProps {
  taskId: string;
  pillarColor: string;
  onAdd: (taskId: string, title: string) => Promise<void>;
}

export function StepForm({ taskId, pillarColor, onAdd }: StepFormProps) {
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
