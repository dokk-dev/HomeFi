import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateCompletion, parseJSONLoose } from "@/lib/ai/generate";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pillarSlug } = (await req.json()) as { pillarSlug: string };
  if (!pillarSlug) return Response.json({ error: "Missing pillarSlug" }, { status: 400 });

  // Fetch pillar label + user's active tasks for context
  const supabase = getSupabaseAdminClient();
  const { data: pillar } = await supabase
    .from("pillars")
    .select("id, label")
    .eq("user_id", session.user.id)
    .eq("slug", pillarSlug)
    .single();

  if (!pillar) return Response.json({ error: "Pillar not found" }, { status: 404 });

  const { data: tasks } = await supabase
    .from("tasks")
    .select("title")
    .eq("pillar_id", pillar.id)
    .eq("user_id", session.user.id)
    .eq("is_complete", false)
    .order("position")
    .limit(8);

  const taskContext = tasks && tasks.length > 0
    ? `\n\nThe student's current tasks in this subject: ${tasks.map((t) => t.title).join(", ")}. Tailor at least 1–2 questions to these topics.`
    : "";

  const systemPrompt = `You generate knowledge tests for serious learners.${taskContext}

Return ONLY valid JSON — no markdown, no code fences, no explanation.

Required format:
{"title":"Short quiz title","questions":[{"q":"Question text","options":["Option A","Option B","Option C","Option D"],"correct":0}]}

Rules:
- Exactly 5 questions, each with exactly 4 options
- "correct" is the 0-based index of the correct option
- Vary difficulty: 2 easy, 2 medium, 1 challenging
- Make wrong answers plausible, not obviously wrong
- No trick questions`;

  const userPrompt = `Generate a 5-question multiple choice quiz for a student studying "${pillar.label}".`;

  try {
    const { text } = await generateCompletion({
      systemPrompt,
      userPrompt,
      responseFormat: "json",
    });

    const quiz = parseJSONLoose<{ title: string; questions: { q: string; options: string[]; correct: number }[] }>(text);

    if (!quiz.title || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      throw new Error("Invalid quiz structure returned by AI");
    }

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
}
