// Mastery formula: per-competency EMA + decay, weighted across the rubric.
// The point: single great quizzes don't max you out (need sustained practice)
// and skipping a competency makes it decay. No easy ways out.

import type { CompetencyArea } from "@/lib/types";

// EMA alpha — how much each new quiz shifts the running score.
// 0.25 = a single perfect run only moves a fresh competency to 25%.
const EMA_ALPHA = 0.25;

// Days you can skip a competency before its score starts decaying.
const DECAY_GRACE_DAYS = 7;

// Linear decay rate per day after the grace period.
// 0.005 = 0.5%/day → 30 idle days drops a 100 score by ~11.5%.
const DECAY_PER_DAY = 0.005;

export interface QuizHistoryRow {
  score: number; // 0-1
  taken_at: string; // ISO timestamp
}

export interface CompetencyMastery {
  name: string;
  description: string;
  weight: number;
  score: number; // 0-100
  level: Level;
  quiz_count: number;
  last_taken_at: string | null;
  days_since_last: number | null;
  decayed_by: number; // 0-100, how many points have been lost to decay
}

export interface PillarMastery {
  overall: number; // 0-100
  level: Level;
  per_competency: CompetencyMastery[];
}

// ── Level tiers ──────────────────────────────────────────────────────────────
export interface Level {
  name: string;
  min: number;
}

export const LEVELS: readonly Level[] = [
  { name: "Untested", min: 0 },
  { name: "Novice", min: 1 },
  { name: "Beginner", min: 25 },
  { name: "Apprentice", min: 45 },
  { name: "Practitioner", min: 65 },
  { name: "Advanced", min: 80 },
  { name: "Expert", min: 92 },
] as const;

export function getLevel(mastery: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (mastery >= LEVELS[i].min) return LEVELS[i];
  }
  return LEVELS[0];
}

// ── Per-competency calc ──────────────────────────────────────────────────────
function computeCompetencyScore(history: QuizHistoryRow[], now: Date = new Date()): {
  score: number;
  rawEma: number;
  lastTakenAt: string | null;
  daysSince: number | null;
} {
  if (history.length === 0) {
    return { score: 0, rawEma: 0, lastTakenAt: null, daysSince: null };
  }

  // Chronological order (oldest first) so EMA accumulates correctly.
  const sorted = [...history].sort(
    (a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime(),
  );

  let ema = 0;
  for (const row of sorted) {
    const clamped = Math.max(0, Math.min(1, row.score));
    ema = EMA_ALPHA * clamped + (1 - EMA_ALPHA) * ema;
  }

  const lastTaken = sorted[sorted.length - 1].taken_at;
  const daysSince = (now.getTime() - new Date(lastTaken).getTime()) / 86400000;

  let decayed = ema;
  if (daysSince > DECAY_GRACE_DAYS) {
    const decayFactor = Math.max(
      0,
      1 - DECAY_PER_DAY * (daysSince - DECAY_GRACE_DAYS),
    );
    decayed = ema * decayFactor;
  }

  return { score: decayed, rawEma: ema, lastTakenAt: lastTaken, daysSince };
}

// ── Pillar aggregation ───────────────────────────────────────────────────────
export function computePillarMastery(
  competencies: CompetencyArea[],
  quizzes: Array<{ competency_name: string; score: number; taken_at: string }>,
  now: Date = new Date(),
): PillarMastery {
  const byCompetency: Record<string, QuizHistoryRow[]> = {};
  for (const q of quizzes) {
    if (!byCompetency[q.competency_name]) byCompetency[q.competency_name] = [];
    byCompetency[q.competency_name].push({ score: q.score, taken_at: q.taken_at });
  }

  const perCompetency: CompetencyMastery[] = competencies.map((c) => {
    const history = byCompetency[c.name] ?? [];
    const { score: rawScore, rawEma, lastTakenAt, daysSince } = computeCompetencyScore(history, now);
    const score = Math.round(rawScore * 100);
    const decayedBy = Math.round((rawEma - rawScore) * 100);
    return {
      name: c.name,
      description: c.description,
      weight: c.weight,
      score,
      level: getLevel(score),
      quiz_count: history.length,
      last_taken_at: lastTakenAt,
      days_since_last: daysSince,
      decayed_by: Math.max(0, decayedBy),
    };
  });

  const totalWeight = perCompetency.reduce((s, p) => s + p.weight, 0);
  const overallRaw =
    totalWeight === 0
      ? 0
      : perCompetency.reduce((s, p) => s + p.score * p.weight, 0) / totalWeight;
  const overall = Math.round(overallRaw);

  return {
    overall,
    level: getLevel(overall),
    per_competency: perCompetency,
  };
}
