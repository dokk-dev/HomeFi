export type PillarSlug = "cs-ai" | "music-tech" | "russian" | "hebrew" | "career";

export interface PillarMeta {
  slug: PillarSlug;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconKey: string;
  materialIcon: string;
  position: number;
}

export const PILLARS: PillarMeta[] = [
  {
    slug: "cs-ai",
    label: "CS / AI Coursework",
    shortLabel: "CS/AI",
    description: "Algorithms, ML, systems, and research.",
    color: "#6366f1",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/30",
    textColor: "text-indigo-400",
    iconKey: "cs",
    materialIcon: "psychology",
    position: 0,
  },
  {
    slug: "music-tech",
    label: "Music Tech / Audio Dev",
    shortLabel: "Music",
    description: "DAW scripting, audio DSP, Max/MSP, Ableton.",
    color: "#ec4899",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    textColor: "text-pink-400",
    iconKey: "music",
    materialIcon: "music_note",
    position: 1,
  },
  {
    slug: "russian",
    label: "Russian Studies",
    shortLabel: "Russian",
    description: "Grammar, vocabulary, reading, listening.",
    color: "#f59e0b",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-400",
    iconKey: "russian",
    materialIcon: "language",
    position: 2,
  },
  {
    slug: "hebrew",
    label: "Hebrew Studies",
    shortLabel: "Hebrew",
    description: "Aleph-bet, vocabulary, scripture reading.",
    color: "#10b981",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    textColor: "text-emerald-400",
    iconKey: "hebrew",
    materialIcon: "translate",
    position: 3,
  },
  {
    slug: "career",
    label: "Career / Applications",
    shortLabel: "Career",
    description: "Job apps, resume, networking, portfolio.",
    color: "#3b82f6",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-400",
    iconKey: "career",
    materialIcon: "work",
    position: 4,
  },
];

export const PILLAR_BY_SLUG = Object.fromEntries(
  PILLARS.map((p) => [p.slug, p])
) as Record<PillarSlug, PillarMeta>;
