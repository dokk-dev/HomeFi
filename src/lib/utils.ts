import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAdvisoryTime(minutes: number | null | undefined): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `~${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h ${m}m` : `~${h}h`;
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DAY_TO_JS: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

/** Returns the next date matching any of the given day names (MON–SUN).
 *  skipFirst=true skips the nearest occurrence (raincheck behaviour). */
export function nextOccurrence(days: string[], skipFirst = false): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let count = 0;
  for (let i = 0; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const name = Object.entries(DAY_TO_JS).find(([, v]) => v === d.getDay())?.[0];
    if (name && days.includes(name)) {
      count++;
      if (!skipFirst || count > 1) return toISODate(d);
    }
  }
  const fb = new Date(today);
  fb.setDate(today.getDate() + 7);
  return toISODate(fb);
}
