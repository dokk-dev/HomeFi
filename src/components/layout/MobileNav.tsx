"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Home, Settings, Timer, X } from "lucide-react";
import { PILLARS } from "@/lib/constants/pillars";
import { PILLAR_ICONS } from "@/lib/icons/pillarIcons";
import { FocusTimer } from "@/components/focus/FocusTimer";

export function MobileNav() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [pillarOverrides, setPillarOverrides] = useState<Record<string, { label: string; color: string }>>({});

  useEffect(() => {
    fetch("/api/pillars")
      .then((r) => r.json())
      .then((data: { slug: string; label: string; color: string }[]) => {
        if (!Array.isArray(data)) return;
        const map: Record<string, { label: string; color: string }> = {};
        for (const p of data) map[p.slug] = { label: p.label, color: p.color };
        setPillarOverrides(map);
      })
      .catch(() => {});
  }, []);

  // Close sheet on navigation
  useEffect(() => { setSheetOpen(false); }, [pathname]);

  const navItems = [
    {
      id: "pillars",
      label: "Pillars",
      onPress: () => setSheetOpen((v) => !v),
      active: sheetOpen,
      icon: (
        <div className="grid grid-cols-2 gap-[3px] w-[18px] h-[18px]">
          {PILLARS.slice(0, 4).map((p) => (
            <div
              key={p.slug}
              className="rounded-sm"
              style={{ backgroundColor: pillarOverrides[p.slug]?.color ?? p.color }}
            />
          ))}
        </div>
      ),
    },
    {
      id: "tutor",
      label: "Tutor",
      href: "/dashboard/ai-tutor",
      active: pathname === "/dashboard/ai-tutor",
      icon: <Bot size={20} />,
    },
    {
      id: "focus",
      label: "Focus",
      onPress: () => setTimerOpen(true),
      active: timerOpen,
      center: true,
      icon: <Timer size={20} />,
    },
    {
      id: "home",
      label: "Home",
      href: "/dashboard",
      active: pathname === "/dashboard",
      icon: <Home size={20} />,
    },
    {
      id: "settings",
      label: "Settings",
      href: "/dashboard/settings",
      active: pathname === "/dashboard/settings",
      icon: <Settings size={20} />,
    },
  ];

  return (
    <>
      {/* ── Bottom nav bar ─────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface-container-low border-t border-outline-variant/15 flex items-center justify-around z-50 md:hidden safe-area-bottom">
        {navItems.map((item) => {
          const content = (
            <span
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
                item.active
                  ? "text-primary"
                  : "text-outline"
              }`}
            >
              {item.center ? (
                <span
                  className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg -mt-5"
                  style={{ backgroundColor: "rgb(var(--color-primary))" }}
                >
                  <Timer size={20} color="white" />
                </span>
              ) : (
                item.icon
              )}
              <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
                {item.label}
              </span>
            </span>
          );

          if (item.href) {
            return (
              <Link key={item.id} href={item.href} className="flex-1 flex justify-center">
                {content}
              </Link>
            );
          }

          return (
            <button key={item.id} onClick={item.onPress} className="flex-1 flex justify-center">
              {content}
            </button>
          );
        })}
      </nav>

      {/* ── Pillar sheet ───────────────────────────────────────────── */}
      {sheetOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setSheetOpen(false)}
          />
          <div
            className="fixed bottom-16 left-0 right-0 z-50 md:hidden bg-surface-container-low rounded-t-3xl border-t border-outline-variant/15 px-6 pt-5 pb-8"
            style={{ animation: "slideUp 0.22s ease" }}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-outline-variant/40 mx-auto mb-5" />

            <div className="flex items-center justify-between mb-5">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline">
                Your Pillars
              </span>
              <button
                onClick={() => setSheetOpen(false)}
                className="text-outline hover:text-on-surface transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {PILLARS.map((p) => {
                const Icon = PILLAR_ICONS[p.slug];
                const color = pillarOverrides[p.slug]?.color ?? p.color;
                const label = pillarOverrides[p.slug]?.label ?? p.shortLabel;
                const isActive = pathname === `/dashboard/pillars/${p.slug}`;

                return (
                  <Link
                    key={p.slug}
                    href={`/dashboard/pillars/${p.slug}`}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform active:scale-95"
                      style={{
                        backgroundColor: `${color}${isActive ? "30" : "18"}`,
                        border: `${isActive ? "2px" : "1px"} solid ${color}${isActive ? "60" : "30"}`,
                      }}
                    >
                      {Icon && <Icon size={22} style={{ color }} />}
                    </div>
                    <span className="text-[9px] font-bold text-center text-on-surface-variant leading-tight">
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      {timerOpen && <FocusTimer onClose={() => setTimerOpen(false)} />}
    </>
  );
}
