export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface Pillar {
  id: string;
  slug: string;
  label: string;
  color: string;
  icon_key: string | null;
  mastery: number;
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
