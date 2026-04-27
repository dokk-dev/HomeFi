"use client";

import { useState } from "react";
import { X, CalendarDays, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { toISODate, nextOccurrence } from "@/lib/utils";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export type ScheduleMode = "none" | "single" | "recurring";
export type RecurrenceType = "perpetual" | "temporary" | "raincheck";

export interface RecurrenceRule {
  days: string[];
  recurrenceType: RecurrenceType;
  endsAt: string | null;
}

export interface ScheduleValue {
  mode: ScheduleMode;
  date: string;
  recurrence: RecurrenceRule | null;
}

export const EMPTY_SCHEDULE: ScheduleValue = { mode: "none", date: "", recurrence: null };
export { nextOccurrence };

interface Props {
  value: ScheduleValue;
  onChange: (v: ScheduleValue) => void;
  color: string;
}

export function SchedulePicker({ value, onChange, color }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = toISODate(today);

  // Calendar view state
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  function setMode(mode: ScheduleMode) {
    if (mode === "none") {
      onChange({ mode: "none", date: "", recurrence: null });
    } else if (mode === "single") {
      onChange({ mode: "single", date: value.date || todayISO, recurrence: null });
    } else {
      onChange({
        mode: "recurring",
        date: "",
        recurrence: value.recurrence ?? { days: ["MON", "WED", "FRI"], recurrenceType: "perpetual", endsAt: null },
      });
    }
  }

  function toggleDay(day: string) {
    if (!value.recurrence) return;
    const days = value.recurrence.days.includes(day)
      ? value.recurrence.days.filter((d) => d !== day)
      : [...value.recurrence.days, day];
    if (days.length === 0) return;
    onChange({ ...value, recurrence: { ...value.recurrence, days } });
  }

  function setRecurrenceType(recurrenceType: RecurrenceType) {
    if (!value.recurrence) return;
    onChange({
      ...value,
      recurrence: { ...value.recurrence, recurrenceType, endsAt: recurrenceType === "temporary" ? (value.recurrence.endsAt ?? "") : null },
    });
  }

  // Calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  return (
    <div className="rounded-xl border border-outline-variant/20 bg-surface-container p-4 space-y-3">
      {/* Mode selector */}
      <div className="flex gap-1.5 flex-wrap">
        {(["none", "single", "recurring"] as ScheduleMode[]).map((m) => {
          const info = {
            none: { label: "No date", icon: <X size={10} /> },
            single: { label: "Specific date", icon: <CalendarDays size={10} /> },
            recurring: { label: "Recurring", icon: <RefreshCw size={10} /> },
          };
          const active = value.mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
              style={{
                backgroundColor: active ? `${color}20` : "transparent",
                color: active ? color : "var(--color-outline)",
                border: `1.5px solid ${active ? color + "50" : "var(--color-outline-variant)"}`,
              }}
            >
              {info[m].icon}
              {info[m].label}
            </button>
          );
        })}
      </div>

      {/* Single mode: mini calendar */}
      {value.mode === "single" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth} className="p-1 text-outline hover:text-on-surface transition-colors">
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-semibold text-on-surface">{monthName}</span>
            <button type="button" onClick={nextMonth} className="p-1 text-outline hover:text-on-surface transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d, i) => (
              <span key={i} className="text-[10px] font-bold text-outline text-center">{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={i} />;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isToday = dateStr === todayISO;
              const isSelected = dateStr === value.date;
              const isPast = new Date(dateStr + "T00:00:00") < today;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => !isPast && onChange({ ...value, date: dateStr })}
                  disabled={isPast}
                  className="h-7 w-full flex items-center justify-center rounded-lg text-xs transition-all disabled:cursor-default"
                  style={{
                    backgroundColor: isSelected ? color : isToday ? `${color}18` : undefined,
                    color: isSelected ? "white" : isPast ? "var(--color-outline-variant)" : isToday ? color : "var(--color-on-surface)",
                    fontWeight: isToday || isSelected ? "700" : undefined,
                    outline: isToday && !isSelected ? `1.5px solid ${color}40` : undefined,
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recurring mode */}
      {value.mode === "recurring" && value.recurrence && (
        <div className="space-y-4">
          {/* Day toggles */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Repeat on</p>
            <div className="flex gap-1.5">
              {DAYS.map((day, i) => {
                const active = value.recurrence!.days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className="w-8 h-8 rounded-full text-xs font-bold transition-all"
                    style={{
                      backgroundColor: active ? color : "var(--color-surface-container-high)",
                      color: active ? "white" : "var(--color-outline)",
                    }}
                  >
                    {DAY_LABELS[i]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule type */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Schedule type</p>
            <div className="space-y-1.5">
              {(["perpetual", "temporary", "raincheck"] as RecurrenceType[]).map((rt) => {
                const info: Record<RecurrenceType, { label: string; desc: string }> = {
                  perpetual: { label: "Perpetual", desc: "Repeats on these days indefinitely" },
                  temporary: { label: "Temporary alteration", desc: "Change the schedule until a set date" },
                  raincheck: { label: "Raincheck", desc: "Skip the very next occurrence" },
                };
                const active = value.recurrence!.recurrenceType === rt;
                return (
                  <button
                    key={rt}
                    type="button"
                    onClick={() => setRecurrenceType(rt)}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all"
                    style={{
                      backgroundColor: active ? `${color}15` : "var(--color-surface-container-high)",
                      border: `1.5px solid ${active ? color + "40" : "transparent"}`,
                    }}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 mt-0.5"
                      style={{
                        borderColor: active ? color : "var(--color-outline)",
                        backgroundColor: active ? color : "transparent",
                      }}
                    />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: active ? color : "var(--color-on-surface)" }}>
                        {info[rt].label}
                      </p>
                      <p className="text-[10px] text-outline leading-tight mt-0.5">{info[rt].desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Temporary: end date */}
          {value.recurrence.recurrenceType === "temporary" && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Reverts to normal after</p>
              <input
                type="date"
                value={value.recurrence.endsAt ?? ""}
                min={todayISO}
                onChange={(e) =>
                  onChange({ ...value, recurrence: { ...value.recurrence!, endsAt: e.target.value || null } })
                }
                className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-xs text-on-surface border border-outline-variant/20 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
