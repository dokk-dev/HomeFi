import type { PillarMeta } from "@/lib/constants/pillars";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Pillar {
  id: string;
  slug: string;
  label: string;
  color: string;
  mastery: number;
  meta: PillarMeta | undefined;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
}

export interface Quiz {
  title: string;
  questions: QuizQuestion[];
}

export type TestState = "idle" | "loading" | "active" | "complete";

export function getMasteryLabel(mastery: number): string {
  if (mastery >= 80) return "Advanced";
  if (mastery >= 50) return "Intermediate";
  if (mastery >= 20) return "Beginner";
  return "Novice";
}
