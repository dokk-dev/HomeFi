"use client";

import { useState } from "react";
import { Clock, Minus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { CreateTaskInput } from "@/lib/types";

interface TaskFormProps {
  pillarId: string;
  pillarColor: string;
  onAdd: (input: CreateTaskInput) => Promise<void>;
  onCancel?: () => void;
}

export function TaskForm({ pillarId, pillarColor, onAdd, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await onAdd({
      pillar_id: pillarId,
      title: title.trim(),
      advisory_minutes: minutes ? parseInt(minutes, 10) : undefined,
    });
    setTitle("");
    setMinutes("");
    setShowOptions(false);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task..."
          disabled={saving}
          autoFocus
        />
        <Button type="submit" disabled={saving || !title.trim()} style={{ backgroundColor: title.trim() ? pillarColor : undefined }}>
          Add
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>

      <div>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          onClick={() => setShowOptions((v) => !v)}
        >
          {showOptions ? <Minus size={13} /> : <Clock size={13} />}
          {showOptions ? "Hide options" : "Add time hint"}
        </button>

        {showOptions && (
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="Suggested minutes (e.g. 45)"
              min={1}
              className="max-w-xs"
              disabled={saving}
            />
          </div>
        )}
      </div>
    </form>
  );
}
