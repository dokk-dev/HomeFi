import { z } from "zod";
import { withSession } from "@/lib/api/withSession";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateCompletion, parseJSONLoose } from "@/lib/ai/generate";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { computePillarMastery } from "@/lib/quiz/mastery";
import type { CompetencyArea } from "@/lib/types";
import type { GradedQuestion, QuizGradeResult } from "@/lib/quiz/types";

const MCQAnswered = z.object({
  type: z.literal("mcq"),
  competency: z.string().min(1),
  q: z.string(),
  options: z.array(z.string()).length(4),
  correct: z.number().int().min(0).max(3),
  answer: z.number().int().min(0).max(3).nullable(),
});

const ScenarioAnswered = z.object({
  type: z.literal("scenario"),
  competency: z.string().min(1),
  prompt: z.string(),
  rubric: z.array(z.string()).min(3).max(5),
  answer: z.string().nullable(),
});

const SubmitSchema = z.object({
  pillar_id: z.string().min(1),
  questions: z
    .array(z.discriminatedUnion("type", [MCQAnswered, ScenarioAnswered]))
    .length(10),
});

const ScenarioGradeResponseSchema = z.object({
  score: z.number().min(0).max(1),
  feedback: z.string().min(1).max(2000),
});

const SCENARIO_GRADER_PROMPT = `You are an exacting grader. You will be given:
1. A scenario prompt the learner had to respond to
2. A rubric of 3-5 criteria a passing answer must demonstrate
3. The learner's answer

Score the answer from 0 to 1 based on how many rubric criteria it demonstrably hits. Be strict — partial credit only when there's clear evidence. An empty or off-topic answer is 0.

Scoring guide:
- 0.00 = empty, off-topic, or fundamentally wrong
- 0.25 = touches one criterion superficially
- 0.50 = clear hit on ~half the criteria
- 0.75 = solid hit on most criteria, minor gaps
- 1.00 = clearly demonstrates ALL criteria

Provide a 1-2 sentence feedback message that names which criteria were hit and which were missed. Be direct, not encouraging.

Return ONLY a JSON object:
{ "score": <0-1 number>, "feedback": "<1-2 sentences>" }`;

async function gradeScenario(prompt: string, rubric: string[], answer: string): Promise<{ score: number; feedback: string }> {
  if (!answer.trim()) {
    return { score: 0, feedback: "No answer provided." };
  }

  const userPrompt = `Scenario prompt:
${prompt}

Rubric (passing answer must demonstrate these):
${rubric.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Learner's answer:
${answer}`;

  try {
    const { text } = await generateCompletion({
      systemPrompt: SCENARIO_GRADER_PROMPT,
      userPrompt,
      responseFormat: "json",
    });

    const raw = parseJSONLoose(text);
    const validated = ScenarioGradeResponseSchema.safeParse(raw);
    if (!validated.success) {
      // Conservative fallback: half credit, note the grader failure
      return { score: 0.5, feedback: "Grader returned invalid response — partial credit assigned. Review your answer manually." };
    }
    return validated.data;
  } catch {
    return { score: 0.5, feedback: "Grader unreachable — partial credit assigned. Try resubmitting later." };
  }
}

export const POST = withSession(async (req, userId) => {
  if (!checkRateLimit(userId, 5, 60_000)) {
    return Response.json({ error: "Too many submissions. Please wait a moment." }, { status: 429 });
  }

  const parsed = SubmitSchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: pillar } = await supabase
    .from("pillars")
    .select("id, competency_areas")
    .eq("id", parsed.data.pillar_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!pillar) {
    return Response.json({ error: "Pillar not found" }, { status: 404 });
  }

  const competencies = (pillar.competency_areas ?? []) as CompetencyArea[];

  // ── Grade every question ─────────────────────────────────────────────────
  const gradedQuestions: GradedQuestion[] = [];

  // Grade MCQs deterministically (sync)
  // Grade scenarios in parallel (async)
  const scenarioPromises: Promise<void>[] = [];

  for (const q of parsed.data.questions) {
    if (q.type === "mcq") {
      const correct = q.answer === q.correct;
      gradedQuestions.push({
        competency: q.competency,
        score: correct ? 1 : 0,
        correct,
        expected: q.correct,
      });
    } else {
      // Reserve a slot, fill it in once the AI grade arrives
      const idx = gradedQuestions.length;
      gradedQuestions.push({ competency: q.competency, score: 0 }); // placeholder
      scenarioPromises.push(
        gradeScenario(q.prompt, q.rubric, q.answer ?? "").then(({ score, feedback }) => {
          gradedQuestions[idx] = {
            competency: q.competency,
            score,
            feedback,
          };
        }),
      );
    }
  }

  await Promise.all(scenarioPromises);

  // ── Aggregate per competency ─────────────────────────────────────────────
  const byCompetency: Record<string, { sum: number; count: number; questions: typeof parsed.data.questions; grades: GradedQuestion[] }> = {};
  for (let i = 0; i < parsed.data.questions.length; i++) {
    const q = parsed.data.questions[i];
    const g = gradedQuestions[i];
    if (!byCompetency[q.competency]) {
      byCompetency[q.competency] = { sum: 0, count: 0, questions: [], grades: [] };
    }
    byCompetency[q.competency].sum += g.score;
    byCompetency[q.competency].count += 1;
    byCompetency[q.competency].questions.push(q);
    byCompetency[q.competency].grades.push(g);
  }

  const perCompetency: { name: string; score: number; count: number }[] = [];
  const rowsToInsert: Array<{
    user_id: string;
    pillar_id: string;
    competency_name: string;
    score: number;
    max_score: number;
    questions: unknown;
  }> = [];

  for (const [name, agg] of Object.entries(byCompetency)) {
    const score = agg.sum / agg.count;
    perCompetency.push({ name, score, count: agg.count });
    rowsToInsert.push({
      user_id: userId,
      pillar_id: pillar.id,
      competency_name: name,
      score: Math.round(score * 1000) / 1000, // numeric(4,3)
      max_score: agg.count,
      questions: agg.questions.map((q, i) => ({ ...q, grade: agg.grades[i] })),
    });
  }

  const { error: insertError } = await supabase.from("quiz_results").insert(rowsToInsert);
  if (insertError) {
    return Response.json({ error: `Failed to save results: ${insertError.message}` }, { status: 500 });
  }

  // ── Mastery: per-competency EMA + decay, weighted across rubric ─────────
  const { data: allHistory } = await supabase
    .from("quiz_results")
    .select("competency_name, score, taken_at")
    .eq("pillar_id", pillar.id)
    .eq("user_id", userId);

  const mastery = computePillarMastery(
    competencies,
    (allHistory ?? []).map((r) => ({
      competency_name: r.competency_name,
      score: Number(r.score),
      taken_at: r.taken_at,
    })),
  );
  const newMastery = mastery.overall;

  await supabase
    .from("pillars")
    .update({ mastery: newMastery })
    .eq("id", pillar.id)
    .eq("user_id", userId);

  // ── Build response ───────────────────────────────────────────────────────
  const overall =
    gradedQuestions.reduce((s, g) => s + g.score, 0) / gradedQuestions.length;

  const result: QuizGradeResult & { newMastery: number } = {
    overall_score: overall,
    per_question: gradedQuestions,
    per_competency: perCompetency,
    newMastery,
  };

  return Response.json(result);
});
