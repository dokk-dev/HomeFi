"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Database, Plug, RefreshCw } from "lucide-react";

// Bump this whenever a new release notice should appear. Users who have
// already seen this version (stored in localStorage) won't see the popup
// again until the constant changes.
const CURRENT_VERSION = "2026-05-04-notion-update";
const STORAGE_KEY = "meridian-update-seen";

const TITLE = "What's new";
const SUBTITLE = "May 4, 2026 — Update system + Notion integration";

const HIGHLIGHTS: { icon: typeof Sparkles; title: string; body: string }[] = [
  {
    icon: RefreshCw,
    title: "One-click updates",
    body:
      "Double-click update.command (macOS) or update.bat (Windows) to pull the latest code, install dependencies, apply database migrations, and rebuild — all in one step.",
  },
  {
    icon: Database,
    title: "Automatic migrations",
    body:
      "New SQL changes are tracked in migrations/ and applied automatically against your Supabase project. No more pasting schema by hand. Set DATABASE_URL once during setup.",
  },
  {
    icon: Plug,
    title: "Notion integration",
    body:
      "Mirror your tasks, pillars, AI tutor history, and quiz results into Notion. Configure what to sync in Settings → Integrations. Tasks, Pillars, and AI suggestions sync by default.",
  },
];

export function UpdateNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (seen !== CURRENT_VERSION) setOpen(true);
    } catch {
      // localStorage unavailable — silently skip
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, CURRENT_VERSION);
    } catch {
      // ignore
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={dismiss}
      />
      <div
        className="fixed z-[101] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface-container rounded-2xl border border-outline-variant/20 shadow-2xl p-8"
        style={{ animation: "bloomIn 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-outline hover:text-on-surface transition-colors"
        >
          <X size={16} />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
          <Sparkles size={26} className="text-primary" />
        </div>

        <h2 className="text-xl font-headline font-bold text-on-surface mb-1">
          {TITLE}
        </h2>
        <p className="text-[11px] font-bold uppercase tracking-widest text-outline mb-6">
          {SUBTITLE}
        </p>

        <div className="space-y-4 mb-8">
          {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-on-surface-variant" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface mb-0.5">
                  {title}
                </p>
                <p className="text-[12px] text-on-surface-variant leading-relaxed">
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end">
          <button
            onClick={dismiss}
            className="px-5 py-2 rounded-lg text-sm font-headline font-bold text-white bg-primary hover:opacity-90 transition-opacity active:scale-95"
          >
            Got it
          </button>
        </div>
      </div>
    </>
  );
}
