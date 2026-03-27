"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Settings, Bot, LogOut } from "lucide-react";
import { PILLARS } from "@/lib/constants/pillars";
import { PILLAR_ICONS, ICON_REGISTRY } from "@/lib/icons/pillarIcons";
import { FocusTimer } from "@/components/focus/FocusTimer";

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [timerOpen, setTimerOpen] = useState(false);
  const [displayAvatar, setDisplayAvatar] = useState<string | null>(null);
  const [avatarPopping, setAvatarPopping] = useState(false);
  const [iconOverrides, setIconOverrides] = useState<Record<string, string>>({});

  const displayName = session?.user?.name?.toUpperCase() ?? "YOU";

  // Sync avatar from session and listen for changes
  useEffect(() => {
    if (session?.user?.image) setDisplayAvatar(session.user.image);
  }, [session?.user?.image]);

  useEffect(() => {
    try {
      const ov = localStorage.getItem("myfi-icon-overrides");
      if (ov) setIconOverrides(JSON.parse(ov));
    } catch {}

    function handleAvatarChange(e: Event) {
      const url = (e as CustomEvent<{ url: string }>).detail.url;
      setAvatarPopping(true);
      setTimeout(() => {
        setDisplayAvatar(url);
        setAvatarPopping(false);
      }, 220);
    }

    function handleIconChange() {
      try {
        const ov = localStorage.getItem("myfi-icon-overrides");
        setIconOverrides(ov ? JSON.parse(ov) : {});
      } catch {}
    }

    window.addEventListener("avatar-changed", handleAvatarChange);
    window.addEventListener("icon-overrides-changed", handleIconChange);
    return () => {
      window.removeEventListener("avatar-changed", handleAvatarChange);
      window.removeEventListener("icon-overrides-changed", handleIconChange);
    };
  }, []);

  return (
    <>
    <aside className="fixed left-0 top-0 h-screen flex flex-col py-6 w-64 bg-surface-container-low z-50 overflow-y-auto">
      {/* ── Nameplate with avatar ──────────────────────────────────── */}
      <Link href="/dashboard" className="px-6 mb-10 block group">
        <div className="flex items-center gap-3">
          {/* Animated avatar */}
          <div
            className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-surface-container-highest"
            style={{
              transform: avatarPopping ? "scale(0)" : "scale(1)",
              opacity: avatarPopping ? 0 : 1,
              transition: avatarPopping
                ? "transform 200ms ease-in, opacity 150ms ease-in"
                : "transform 300ms cubic-bezier(0.34,1.56,0.64,1), opacity 200ms ease-out",
            }}
          >
            {displayAvatar ? (
              <Image
                src={displayAvatar}
                alt="Avatar"
                width={36}
                height={36}
                className="w-full h-full object-cover"
                unoptimized={displayAvatar.startsWith("blob:")}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary text-sm font-bold font-headline">
                {(session?.user?.name ?? "?")[0].toUpperCase()}
              </div>
            )}
          </div>

          <div className="group-hover:opacity-80 transition-opacity">
            <div className="text-base font-headline font-bold text-primary tracking-tight leading-tight">
              {session?.user?.name ?? "MyFi"}
            </div>
            <div className="text-[10px] font-label font-bold uppercase tracking-[0.2em] text-outline mt-0.5">
              Deep Work Mode
            </div>
          </div>
        </div>
      </Link>

      {/* ── Pillar Navigation ─────────────────────────────────────── */}
      <nav className="flex-1 space-y-0.5">
        <div className="text-[10px] px-6 font-label font-bold text-outline uppercase tracking-[0.2em] mb-3">
          Your Pillars
        </div>

        {PILLARS.map((pillar) => {
          const isActive = pathname === `/dashboard/pillars/${pillar.slug}`;
          const overrideKey = iconOverrides[pillar.slug];
          const Icon = (overrideKey ? ICON_REGISTRY[overrideKey] : null) ?? PILLAR_ICONS[pillar.slug];
          return (
            <Link
              key={pillar.slug}
              href={`/dashboard/pillars/${pillar.slug}`}
              className={`flex items-center gap-3 px-4 py-2.5 transition-colors duration-150 border-l-2 ${
                isActive
                  ? "font-headline font-bold"
                  : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}
              style={isActive ? { color: pillar.color, backgroundColor: `${pillar.color}0d`, borderLeftColor: pillar.color } : undefined}
            >
              {Icon && <Icon size={18} style={isActive ? { color: pillar.color } : undefined} />}
              <span className="text-sm font-headline font-semibold tracking-tight">{pillar.shortLabel}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom section ────────────────────────────────────────── */}
      <div className="mt-auto px-4 space-y-1 pb-2">
        <button
          onClick={() => setTimerOpen(true)}
          className="w-full bg-primary/10 border border-primary/20 text-primary py-2.5 rounded-lg text-sm font-headline font-semibold hover:bg-primary/15 transition-colors duration-150 mb-3"
        >
          New Focus Session
        </button>

        <Link href="/dashboard/settings" className="text-on-surface-variant flex items-center gap-3 px-2 py-2 rounded-lg hover:text-on-surface hover:bg-surface-container transition-colors duration-150">
          <Settings size={18} />
          <span className="text-[11px] font-label font-bold uppercase tracking-[0.15em]">Settings</span>
        </Link>

        <Link href="/dashboard/ai-tutor" className="text-on-surface-variant flex items-center gap-3 px-2 py-2 rounded-lg hover:text-on-surface hover:bg-surface-container transition-colors duration-150">
          <Bot size={18} />
          <span className="text-[11px] font-label font-bold uppercase tracking-[0.15em]">AI Tutor</span>
        </Link>

        <div className="px-2 mt-2 pt-4 border-t border-outline-variant/20 flex items-center justify-between">
          <div className="text-[11px] font-label font-bold text-on-surface truncate uppercase tracking-wider">
            {displayName}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="text-outline hover:text-on-surface transition-colors flex-shrink-0"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>

    {timerOpen && <FocusTimer onClose={() => setTimerOpen(false)} />}
    </>
  );
}
