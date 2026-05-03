// Quiz domain types — shared between client and server.

export interface MCQQuestion {
  type: "mcq";
  competency: string;
  q: string;
  options: string[];
  correct: number; // 0-based index
}

export interface ScenarioQuestion {
  type: "scenario";
  competency: string;
  prompt: string;
  rubric: string[]; // 3-5 criteria a passing answer must demonstrate
}

export type QuizQuestion = MCQQuestion | ScenarioQuestion;

export interface Quiz {
  title: string;
  pillarId: string;
  pillarSlug: string;
  questions: QuizQuestion[];
}

export type Answer = number | string | null;

export interface GradedQuestion {
  competency: string;
  score: number; // 0-1
  correct?: boolean; // MCQ only
  feedback?: string; // scenario only
  expected?: number; // MCQ only — the correct option index, for review
}

export interface QuizGradeResult {
  overall_score: number; // 0-1
  per_question: GradedQuestion[];
  per_competency: { name: string; score: number; count: number }[];
}
