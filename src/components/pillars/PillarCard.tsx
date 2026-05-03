import Link from "next/link";
import type { Pillar } from "@/lib/types";
import { resolveIcon } from "@/lib/icons/pillarIcons";
import { getLevel } from "@/lib/quiz/mastery";

interface PillarCardProps {
  pillar: Pillar;
}

export function PillarCard({ pillar }: PillarCardProps) {
  const total = pillar.task_count ?? 0;
  const mastery = pillar.mastery ?? 0;
  const level = getLevel(mastery);
  const Icon = resolveIcon(pillar.slug, pillar.icon_key);

  return (
    <Link
      href={`/dashboard/pillars/${pillar.slug}`}
      className="pillar-card block bg-surface-container-high rounded-xl p-6 relative overflow-hidden group"
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 w-full h-[3px]"
        style={{ backgroundColor: pillar.color }}
      />

      {/* Icon */}
      {Icon && (
        <div className="mb-6">
          <Icon size={28} style={{ color: pillar.color }} />
        </div>
      )}

      {/* Label */}
      <h3 className="font-headline font-bold text-on-surface mb-1 text-sm">
        {pillar.label}
      </h3>

      {/* Mastery label */}
      <div className="text-[10px] font-label font-bold uppercase tracking-widest mb-6 flex items-center gap-1.5">
        {mastery === 0 ? (
          <span className="text-outline">{total === 0 ? "No tasks yet" : "Untested"}</span>
        ) : (
          <>
            <span style={{ color: pillar.color }}>{level.name}</span>
            <span className="text-outline">· {mastery}%</span>
          </>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-surface-container-highest h-[3px] rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${mastery}%`, backgroundColor: pillar.color }}
        />
      </div>

      {/* Streak badge */}
      {(pillar.streak ?? 0) > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">🔥</span>
          <span className="text-[11px] font-bold text-on-surface-variant">
            {pillar.streak} day streak
          </span>
        </div>
      )}
    </Link>
  );
}
