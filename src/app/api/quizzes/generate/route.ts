import { z } from "zod";
import { withSession } from "@/lib/api/withSession";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateCompletion, parseJSONLoose } from "@/lib/ai/generate";
import { checkRateLimit } from "@/lib/api/rateLimit";
import type { CompetencyArea } from "@/lib/types";
import type { QuizQuestion } from "@/lib/quiz/types";

const BodySchema = z.object({
  pillar_id: z.string().min(1),
});

const MCQSchema = z.object({
  type: z.literal("mcq"),
  competency: z.string().min(1),
  q: z.string().min(1).max(800),
  options: z.array(z.string().min(1).max(300)).length(4),
  correct: z.number().int().min(0).max(3),
});

const ScenarioSchema = z.object({
  type: z.literal("scenario"),
  competency: z.string().min(1),
  prompt: z.string().min(1).max(2000),
  rubric: z.array(z.string().min(1).max(300)).min(3).max(5),
});

const QuizSchema = z.object({
  title: z.string().min(1).max(200),
  questions: z.array(z.discriminatedUnion("type", [MCQSchema, ScenarioSchema])).length(10),
});

function buildSystemPrompt(pillarLabel: string, pillarDescription: string | null, competencies: CompetencyArea[]): string {
  const competencyList = competencies
    .map((c, i) => {
      const skills = c.target_skills.map((s) => `    • ${s}`).join("\n");
      return `${i + 1}. ${c.name} (weight ${c.weight}/10)
   ${c.description}
   Target skills:
${skills}`;
    })
    .join("\n\n");

  return `You are designing a rigorous mastery test for a learner. The pillar (subject area) is "${pillarLabel}".${
    pillarDescription ? `\n\nPillar description: ${pillarDescription}` : ""
  }

This pillar has the following competency areas. EVERY question you write MUST be tagged with the exact competency name it tests:

${competencyList}

Generate exactly 10 questions in this distribution:
- 7 multiple-choice questions (type: "mcq")
- 3 scenario-based questions (type: "scenario")

REQUIREMENTS — strictly enforced:

For MCQ questions:
- Exactly 4 options. "correct" is the 0-based index of the correct option.
- Wrong options must be plausible — not obviously wrong. Test for understanding, not pattern recognition.
- No "all of the above" / "none of the above". No double negatives.
- Difficulty mix: 2 foundational, 3 applied, 2 advanced.
- AVOID pure recall. Each MCQ should require reasoning, comparison, diagnosis, or applied judgment.

For scenario questions:
- "prompt" is a realistic, real-world situation the learner must respond to. NOT abstract trivia.
  GOOD: "A user reports that the dropdown menu doesn't close when they click outside it on Safari. Diagnose the most likely cause and write the fix."
  BAD: "What is event delegation?"
- "rubric" is 3-5 specific criteria a passing answer must demonstrate. Each criterion should be observable in the answer text.
  GOOD: ["Identifies that the click listener is attached to the document and fires before the dropdown's blur", "Proposes adding a stopPropagation or pointer-events fix", "Explains why this only manifests on Safari"]
  BAD: ["Shows understanding of events", "Has good code"]

Distribution across competencies:
- Spread questions across competencies, but weight allocation by competency weight.
- Heavier competencies (weight 8-10) get 2-3 questions each. Lighter ones (3-5) get 1.
- Every competency should be touched at least once if possible.

Return ONLY a JSON object — no markdown, no commentary:
{
  "title": "<short quiz title>",
  "questions": [
    { "type": "mcq", "competency": "<exact name>", "q": "...", "options": ["...","...","...","..."], "correct": 0 },
    { "type": "scenario", "competency": "<exact name>", "prompt": "...", "rubric": ["...","...","..."] }
  ]
}`;
}

export const POST = withSession(async (req, userId) => {
  if (!checkRateLimit(userId, 10, 60_000)) {
    return Response.json({ error: "Too many quiz requests. Please wait a moment." }, { status: 429 });
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: pillar } = await supabase
    .from("pillars")
    .select("id, slug, label, description, competency_areas")
    .eq("id", parsed.data.pillar_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!pillar) {
    return Response.json({ error: "Pillar not found" }, { status: 404 });
  }

  const competencies = (pillar.competency_areas ?? []) as CompetencyArea[];
  if (competencies.length < 3) {
    return Response.json(
      {
        error:
          "This pillar has no mastery rubric yet. Open Settings → Workspace and click the target icon to define one.",
      },
      { status: 412 },
    );
  }

  const systemPrompt = buildSystemPrompt(pillar.label, pillar.description, competencies);
  const userPrompt = `Generate the 10-question mastery test for "${pillar.label}".`;

  try {
    const { text } = await generateCompletion({
      systemPrompt,
      userPrompt,
      responseFormat: "json",
    });

    let raw: unknown;
    try {
      raw = parseJSONLoose(text);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return Response.json(
        { error: `AI returned malformed JSON: ${detail}`, raw: text.slice(0, 500) },
        { status: 502 },
      );
    }

    const validated = QuizSchema.safeParse(raw);
    if (!validated.success) {
      return Response.json(
        {
          error: "AI quiz did not match required shape",
          details: validated.error.issues[0]?.message,
        },
        { status: 502 },
      );
    }

    // Validate every question's competency tag matches a real competency name.
    const validNames = new Set(competencies.map((c) => c.name));
    for (const q of validated.data.questions) {
      if (!validNames.has(q.competency)) {
        return Response.json(
          {
            error: `AI tagged a question with unknown competency: "${q.competency}"`,
          },
          { status: 502 },
        );
      }
    }

    const quiz = {
      title: validated.data.title,
      pillarId: pillar.id,
      pillarSlug: pillar.slug,
      questions: validated.data.questions as QuizQuestion[],
    };

    return Response.json(quiz);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const isOllamaDown = detail.includes("ECONNREFUSED") || detail.includes("fetch failed");
    return Response.json(
      {
        error: isOllamaDown
          ? "Ollama isn't running. Start it with `ollama serve` and try again."
          : `Quiz generation failed: ${detail}`,
      },
      { status: 500 },
    );
  }
});
