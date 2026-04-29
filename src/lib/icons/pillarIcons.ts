import {
  Brain, Music, Globe, Languages, Briefcase,
  BookOpen, Code, Trophy, Star, Mic,
  Palette, Pencil, Rocket, Calculator,
  Dumbbell, Leaf, Zap, GraduationCap, Heart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Legacy slug-based map (kept for backwards compat with seeded pillars)
export const PILLAR_ICONS: Record<string, LucideIcon> = {
  "cs-ai": Brain,
  "music-tech": Music,
  russian: Globe,
  hebrew: Languages,
  career: Briefcase,
};

export const ICON_REGISTRY: Record<string, LucideIcon> = {
  Brain, Music, Globe, Languages, Briefcase,
  BookOpen, Code, Trophy, Star, Mic,
  Palette, Pencil, Rocket, Calculator,
  Dumbbell, Leaf, Zap, GraduationCap, Heart,
};

/** Resolve the icon for a pillar. Priority:
 *  1. localStorage override (iconOverrides[slug])
 *  2. DB icon_key
 *  3. Legacy slug lookup
 *  4. Brain as absolute fallback
 */
export function resolveIcon(
  slug: string,
  iconKey: string | null | undefined,
  iconOverrides: Record<string, string> = {}
): LucideIcon {
  return (
    ICON_REGISTRY[iconOverrides[slug]] ??
    (iconKey ? ICON_REGISTRY[iconKey] : undefined) ??
    PILLAR_ICONS[slug] ??
    Brain
  );
}
