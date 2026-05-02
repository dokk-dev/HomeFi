import { z } from "zod";
import { withSessionAndParams } from "@/lib/api/withSession";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateCompletion, parseJSONLoose } from "@/lib/ai/generate";

type Params = { id: string };

const CompetencySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(500),
  weight: z.number().int().min(1).max(10),
  target_skills: z.array(z.string().trim().min(1).max(200)).min(1).max(8),
});

const ResponseSchema = z.object({
  competencies: z.array(CompetencySchema).min(3).max(7),
});

const SYSTEM_PROMPT = `You are a curriculum architect designing a rigorous competency rubric for a serious learner.

You will be given a learning pillar (a focus area: a subject, skill, or domain) with a label and optional description. Your job is to generate 4-7 competency areas a learner needs to master to truly own this subject.

REQUIREMENTS — strictly enforce these:
1. Competencies must span MULTIPLE LEVELS — foundational, applied, and advanced. Mix concrete fundamentals with synthesis-level skills.
2. NO EASY WINS. Each competency must require real-world, performable skill — not memorization or trivia.
3. target_skills must be CONCRETE and OBSERVABLE. Forbidden verbs: "understand", "know", "learn about", "be familiar with". Required verbs: "build", "diagnose", "implement", "critique", "translate", "perform", "design", "defend", "compose", "debug", "compare and choose between".
4. weight (integer 1-10): foundational/critical competencies get 8-10. Important-but-narrower areas 5-7. Advanced/specialized areas 3-5. Higher weight = more impact on overall mastery.
5. description: ONE sentence describing what mastering this competency means in practice — not what the topic is, but what the learner can DO.
6. Tailor specifically to the subject. Generic rubrics will be rejected. If the subject is "Spanish for travel", do NOT include "Watch Spanish movies" — include "Negotiate a hotel rate in spoken Spanish".
7. Cover the full breadth of the subject. Don't focus on only one aspect.

Return ONLY a JSON object with this exact shape (no markdown, no commentary):
{
  "competencies": [
    {
      "name": "<2-4 word title>",
      "description": "<one observable-skill sentence>",
      "weight": <1-10>,
      "target_skills": ["<concrete observable skill>", "<another>"]
    }
  ]
}`;

export const POST = withSessionAndParams<Params>(async (_req, { params }, userId) => {
  const supabase = getSupabaseAdminClient();

  const { data: pillar } = await supabase
    .from("pillars")
    .select("id, label, description")
    .eq("id", params.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!pillar) {
    return Response.json({ error: "Pillar not found" }, { status: 404 });
  }

  const userPrompt = `Pillar label: ${pillar.label}
Pillar description: ${pillar.description ?? "(no description provided — infer scope from the label)"}

Generate the competency rubric for this pillar.`;

  try {
    const { text, provider } = await generateCompletion({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      responseFormat: "json",
    });

    let parsed: unknown;
    try {
      parsed = parseJSONLoose(text);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return Response.json(
        { error: `AI returned malformed JSON: ${detail}`, raw: text.slice(0, 500) },
        { status: 502 },
      );
    }

    const validated = ResponseSchema.safeParse(parsed);
    if (!validated.success) {
      return Response.json(
        {
          error: "AI response did not match required shape",
          details: validated.error.issues[0]?.message,
          raw: parsed,
        },
        { status: 502 },
      );
    }

    return Response.json({ ...validated.data, provider });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const isOllamaDown = detail.includes("ECONNREFUSED") || detail.includes("fetch failed");
    return Response.json(
      {
        error: isOllamaDown
          ? "Ollama isn't running. Start it with `ollama serve` or set GEMINI_API_KEY."
          : `AI generation failed: ${detail}`,
      },
      { status: 500 },
    );
  }
});
