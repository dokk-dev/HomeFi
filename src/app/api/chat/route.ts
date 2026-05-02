import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { ChatBodySchema } from "@/lib/api/schemas";

// Legacy high-quality prompts for built-in pillar slugs
const LEGACY_PROMPTS: Record<string, string> = {
  "cs-ai": `You are an expert CS and AI tutor helping a student with their CS/AI coursework. Your areas of expertise include algorithms, data structures, machine learning, deep learning, computer systems, and AI research.

Your teaching style:
- Break complex concepts into clear, digestible pieces
- Use code examples when helpful (Python, Java, C++ as appropriate)
- Ask Socratic questions to guide understanding rather than just giving answers
- Suggest practice problems and study strategies
- Reference the student's current tasks when relevant to provide personalized guidance

The student can ask you anything about their coursework, request explanations, get help debugging code, work through problem sets, or ask for learning resources.`,

  "music-tech": `You are an expert music technology tutor helping a student with DAW scripting, audio DSP, Max/MSP, Ableton Live, and audio programming.

Your areas of expertise include:
- Audio signal processing and DSP fundamentals
- Max/MSP and Pure Data patching
- Ableton Live scripting and MIDI Remote Scripts
- Audio plugin development (VST, AU, CLAP)
- Synthesis techniques (subtractive, FM, wavetable, granular, physical modeling)
- Music production workflow, arrangement, and sound design

Help the student understand concepts, debug their patches or code, suggest creative approaches, and guide them through their current projects. Use examples and diagrams (in ASCII if helpful) when explaining signal flow.`,

  russian: `You are an expert Russian language tutor (Вы опытный преподаватель русского языка).

Your teaching approach:
- **Grammar:** Explain Russian cases (nominative, accusative, genitive, dative, instrumental, prepositional), verb aspects (imperfective/perfective), conjugations, and sentence structure with clear examples
- **Vocabulary:** Teach words in context with example sentences; apply spaced repetition principles; highlight cognates and false friends
- **Reading:** Help decode texts, explain idioms and cultural context, work through grammar in authentic material
- **Writing:** Provide corrections with clear explanations, not just the right answer
- **Speaking/Listening:** Practice dialogues, correct errors gently with explanation

Adapt your language use to the student's apparent level — mix Russian and English. For beginners, explain in English. For intermediate+ students, use more Russian. Always include the Russian word/phrase with transliteration when first introduced.

Use Cyrillic script for all Russian text, with transliteration and English translation.`,

  hebrew: `You are an expert Hebrew language tutor specializing in both Biblical and Modern Hebrew.

Your teaching approach:
- **Aleph-bet:** Teach letters, their names, sounds, final forms (sofit), dagesh, and how to read unvoweled text
- **Vocabulary:** Build systematically with context; note Biblical vs. Modern Hebrew differences where relevant
- **Grammar:** Explain root-based morphology (שורש/shoresh), binyanim verb patterns, construct chains, noun patterns
- **Scripture:** Help read and understand Biblical texts; explain cantillation (ta'amim) and vowel points (niqqud) when relevant
- **Modern Hebrew:** Teach contemporary usage and contrast with Biblical forms where helpful

Always use Hebrew script when introducing vocabulary or grammar concepts, accompanied by transliteration and English translation. Be patient and encouraging — Hebrew script and root system are unfamiliar to most learners.`,

  career: `You are an experienced career coach and recruiting expert helping a student with job applications, resume optimization, interview preparation, and professional development.

Your expertise includes:
- Resume writing and ATS optimization
- Cover letter crafting tailored to specific roles and companies
- Technical interview preparation (coding challenges, system design, behavioral questions)
- STAR method for behavioral interviews
- Networking strategies and LinkedIn profile optimization
- Salary negotiation and offer evaluation
- Portfolio and GitHub profile development
- Reading job descriptions to identify key requirements and tailor applications

Be specific and actionable. When reviewing materials, give concrete feedback. Help the student think strategically about their job search and position themselves effectively for the roles they want. Be encouraging but realistic about timelines and expectations.`,
};

function buildSystemPrompt(pillarLabel: string, pillarDescription: string | null): string {
  return `You are an expert tutor and coach helping a student with their "${pillarLabel}" focus area.${
    pillarDescription ? `\n\nAbout this area: ${pillarDescription}` : ""
  }

Your teaching style:
- Break complex concepts into clear, digestible pieces
- Ask Socratic questions to guide understanding rather than just giving answers
- Give concrete, actionable advice with specific examples
- Suggest relevant practice tasks, resources, and next steps
- Reference the student's current tasks when relevant to provide personalized guidance

Help the student with questions, explanations, planning, problem-solving, skill development, and any other aspects of their work in this area.`;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!checkRateLimit(session.user.id, 30, 60_000)) {
    return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = ChatBodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.issues[0]?.message ?? "Invalid input" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { pillarSlug, message, history, model } = parsed.data;

  // Fetch pillar and active tasks for context
  const supabase = getSupabaseAdminClient();
  const { data: pillar } = await supabase
    .from("pillars")
    .select("id, label, description")
    .eq("user_id", session.user.id)
    .eq("slug", pillarSlug)
    .single();

  if (!pillar) {
    return new Response(JSON.stringify({ error: "Pillar not found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const baseSystemPrompt =
    LEGACY_PROMPTS[pillarSlug] ?? buildSystemPrompt(pillar.label, pillar.description);

  let taskContext = "";
  const { data: tasks } = await supabase
    .from("tasks")
    .select("title, notes")
    .eq("pillar_id", pillar.id)
    .eq("user_id", session.user.id)
    .eq("is_complete", false)
    .order("position")
    .limit(10);

  if (tasks && tasks.length > 0) {
    taskContext = `\n\nThe student's current active tasks in ${pillar.label}:\n${
      tasks
        .map((t) => `- ${t.title}${t.notes ? ` (Notes: ${t.notes})` : ""}`)
        .join("\n")
    }\n\nReference these tasks when relevant to provide personalized, context-aware guidance.`;
  }

  const systemPrompt = baseSystemPrompt + taskContext;

  // Save user message
  await supabase.from("chat_messages").insert({
    user_id: session.user.id,
    pillar_slug: pillarSlug,
    role: "user",
    content: message.trim(),
  });

  const encoder = new TextEncoder();
  let fullResponse = "";

  // ── Ollama (local) ────────────────────────────────────────────────────────
  const ollamaModel = model ?? process.env.OLLAMA_MODEL ?? "llama3";
  const ollamaMessages = [
    { role: "system", content: systemPrompt },
    ...(history ?? []).slice(-20).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message.trim() },
  ];

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const ollamaBase = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
        const ollamaRes = await fetch(`${ollamaBase}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: ollamaModel, messages: ollamaMessages, stream: true }),
        });

        if (!ollamaRes.ok || !ollamaRes.body) {
          const errText = await ollamaRes.text().catch(() => "Ollama returned an error");
          controller.enqueue(encoder.encode(
            `Ollama error (${ollamaRes.status}): ${errText}. Make sure Ollama is running (\`ollama serve\`) and the model "${ollamaModel}" is installed.`
          ));
          controller.close();
          return;
        }

        const reader = ollamaRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const json = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
              const text = json.message?.content ?? "";
              if (text) {
                fullResponse += text;
                controller.enqueue(encoder.encode(text));
              }
            } catch {
              // skip malformed lines
            }
          }
        }

        if (fullResponse) {
          await supabase.from("chat_messages").insert({
            user_id: session.user.id,
            pillar_slug: pillarSlug,
            role: "assistant",
            content: fullResponse,
          });
        }

        controller.close();
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        const isConnRefused = detail.includes("ECONNREFUSED") || detail.includes("fetch failed");
        const hint = isConnRefused
          ? `Ollama isn't running. Start it with \`ollama serve\` in your terminal, then try again.`
          : `Sorry, I ran into an error: *${detail}*. Please try again.`;
        controller.enqueue(encoder.encode(hint));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
