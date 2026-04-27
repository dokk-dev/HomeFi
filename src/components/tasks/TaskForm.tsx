"use client";

import { useState } from "react";
import { Clock, CalendarDays, Minus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SchedulePicker, EMPTY_SCHEDULE } from "@/components/tasks/SchedulePicker";
import type { ScheduleValue } from "@/components/tasks/SchedulePicker";
import { nextOccurrence } from "@/lib/utils";
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
  const [schedule, setSchedule] = useState<ScheduleValue>(EMPTY_SCHEDULE);
  const [saving, setSaving] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    // Resolve due_date and recurrence_rule from schedule
    let due_date: string | undefined;
    let recurrence_rule: CreateTaskInput["recurrence_rule"] = null;

    if (schedule.mode === "single" && schedule.date) {
      due_date = schedule.date;
    } else if (schedule.mode === "recurring" && schedule.recurrence) {
      const { days, recurrenceType } = schedule.recurrence;
      due_date = nextOccurrence(days, recurrenceType === "raincheck");
      recurrence_rule = schedule.recurrence;
    }

    await onAdd({
      pillar_id: pillarId,
      title: title.trim(),
      advisory_minutes: minutes ? parseInt(minutes, 10) : undefined,
      due_date,
      recurrence_rule,
    });

    setTitle("");
    setMinutes("");
    setSchedule(EMPTY_SCHEDULE);
    setShowOptions(false);
    setSaving(false);
  };

  const hasSchedule = schedule.mode !== "none";

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
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            onClick={() => setShowOptions((v) => !v)}
          >
            {showOptions ? <Minus size={13} /> : <Clock size={13} />}
            {showOptions ? "Hide options" : "Add time hint"}
          </button>

          {hasSchedule && !showOptions && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs transition-colors"
              style={{ color: pillarColor }}
              onClick={() => setShowOptions(true)}
            >
              <CalendarDays size={11} />
              {schedule.mode === "single"
                ? schedule.date
                : `Recurring (${schedule.recurrence?.recurrenceType ?? ""})`}
            </button>
          )}
        </div>

        {showOptions && (
          <div className="mt-3 space-y-3">
            <Input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="Minutes (e.g. 45)"
              min={1}
              className="max-w-[180px]"
              disabled={saving}
            />
            <SchedulePicker value={schedule} onChange={setSchedule} color={pillarColor} />
          </div>
        )}
      </div>
    </form>
  );
}
