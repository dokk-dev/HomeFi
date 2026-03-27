import { PILLAR_ICONS } from "@/lib/icons/pillarIcons";

const ICON_KEY_TO_SLUG: Record<string, string> = {
  cs: "cs-ai",
  music: "music-tech",
  russian: "russian",
  hebrew: "hebrew",
  career: "career",
};

interface PillarIconProps {
  iconKey: string;
  size?: number;
  color?: string;
  className?: string;
}

export function PillarIcon({ iconKey, size = 24, color, className }: PillarIconProps) {
  const slug = ICON_KEY_TO_SLUG[iconKey] ?? iconKey;
  const Icon = PILLAR_ICONS[slug];
  if (!Icon) return null;
  return <Icon size={size} style={color ? { color } : undefined} className={className} />;
}
