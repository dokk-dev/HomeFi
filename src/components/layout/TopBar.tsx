"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Zap, X, Check } from "lucide-react";

interface PillarOption { id: string; slug: string; label: string; color: string; }

function QuickAddModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [pillars, setPillars] = useState<PillarOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/pillars")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPillars(data);
          setSelectedId(data[0].id);
        }
      });

    const timer = setTimeout(() => inputRef.current?.focus(), 30);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function handleSubmit() {
    if (!title.trim() || !selectedId || submitting) return;
    setSubmitting(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), pillar_id: selectedId }),
    });
    setSubmitting(false);
    setDone(true);
    router.refresh();
    setTimeout(onClose, 700);
  }

  const selectedPillar = pillars.find((p) => p.id === selectedId);

  return (
    <>
      {/* click-outside backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* modal card */}
      <div
        className="fixed right-8 z-50 w-80 bg-surface-container rounded-2xl border border-outline-variant/20 shadow-2xl p-5"
        style={{ top: "72px" }}
      >
        {/* header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-widest text-outline">Quick Add Task</span>
          <button onClick={onClose} className="text-outline hover:text-on-surface transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* input */}
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          placeholder="Task title…"
          className="w-full bg-surface-container-highest rounded-xl px-4 py-3 text-on-surface text-sm border border-outline-variant/20 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all mb-4"
        />

        {/* pillar selector */}
        {pillars.length > 0 && (
          <div className="mb-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Pillar</p>
            <div className="flex flex-wrap gap-1.5">
              {pillars.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: selectedId === p.id ? `${p.color}25` : "transparent",
                    color: selectedId === p.id ? p.color : "var(--color-outline)",
                    border: `1.5px solid ${selectedId === p.id ? p.color + "60" : "var(--color-outline-variant)"}`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* submit */}
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !selectedId || submitting}
          className="w-full py-2.5 rounded-xl text-sm font-headline font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
          style={{
            background: selectedPillar
              ? `linear-gradient(135deg, ${selectedPillar.color}, ${selectedPillar.color}cc)`
              : "linear-gradient(135deg, #6366f1, #818cf8)",
          }}
        >
          {done ? <><Check size={15} /> Added!</> : submitting ? "Adding…" : "Add Task"}
        </button>
      </div>
    </>
  );
}

export function TopBar() {
  const pathname = usePathname();
  const isPillarPage = pathname.startsWith("/dashboard/pillars/");
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const tabs = [
    { label: "Focus", href: "/dashboard" },
    { label: "Tasks", href: "/dashboard/tasks" },
    { label: "Archive", href: "/dashboard/archive" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 h-16 backdrop-blur-xl bg-surface/60 flex items-center justify-between px-8 border-b border-outline-variant/10">
        {/* Command search */}
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              className="w-full bg-white/5 border border-outline-variant/20 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 text-on-surface placeholder-outline transition-all"
              placeholder="Search or run a command…"
              type="text"
            />
          </div>
        </div>

        {/* Nav tabs + Zap */}
        <div className="flex items-center ml-auto">
          {/* Nav labels — nudge right as Zap leaves */}
          <nav
            className="flex gap-6"
            style={{
              transform: isPillarPage ? "translateX(6px)" : "translateX(0)",
              transition: "transform 280ms ease",
            }}
          >
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.label}
                  href={tab.href}
                  className={`text-sm font-label font-medium transition-colors ${
                    isActive
                      ? "text-on-surface border-b-2 border-primary pb-0.5"
                      : "text-outline hover:text-on-surface-variant"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          {/* Zap — collapses on pillar pages */}
          <div
            style={{
              width: isPillarPage ? 0 : 18,
              marginLeft: isPillarPage ? 0 : 28,
              overflow: "hidden",
              flexShrink: 0,
              transition: "width 280ms ease, margin-left 280ms ease",
            }}
          >
            <button
              onClick={() => setQuickAddOpen((o) => !o)}
              style={{
                opacity: isPillarPage ? 0 : 1,
                transform: isPillarPage
                  ? "scale(0) rotate(-30deg)"
                  : "scale(1) rotate(0deg)",
                transition:
                  "opacity 180ms ease, transform 260ms cubic-bezier(0.34,1.56,0.64,1)",
                display: "flex",
                alignItems: "center",
              }}
              className={`transition-colors ${quickAddOpen ? "text-primary" : "text-outline hover:text-primary"}`}
              title="Quick add task"
            >
              <Zap size={18} />
            </button>
          </div>
        </div>
      </header>

      {quickAddOpen && <QuickAddModal onClose={() => setQuickAddOpen(false)} />}
    </>
  );
}
