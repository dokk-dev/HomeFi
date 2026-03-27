import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const SYSTEM_PROMPTS: Record<string, string> = {
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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await req.json() as {
    pillarSlug: string;
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
  };

  const { pillarSlug, message, history } = body;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured on the server" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const anthropic = new Anthropic({ apiKey });

  if (!pillarSlug || !message?.trim()) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const baseSystemPrompt = SYSTEM_PROMPTS[pillarSlug];
  if (!baseSystemPrompt) {
    return new Response(JSON.stringify({ error: "Invalid pillar" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch active tasks for context
  const supabase = getSupabaseAdminClient();
  const { data: pillar } = await supabase
    .from("pillars")
    .select("id, label")
    .eq("user_id", session.user.id)
    .eq("slug", pillarSlug)
    .single();

  let taskContext = "";
  if (pillar) {
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
  }

  const systemPrompt = baseSystemPrompt + taskContext;

  // Build message history for Claude (last 20 turns for context window)
  const messages: Anthropic.MessageParam[] = [
    ...(history ?? []).slice(-20),
    { role: "user", content: message.trim() },
  ];

  // Save user message
  await supabase.from("chat_messages").insert({
    user_id: session.user.id,
    pillar_slug: pillarSlug,
    role: "user",
    content: message.trim(),
  });

  // Stream Claude's response
  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          system: systemPrompt,
          messages,
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            fullResponse += text;
            controller.enqueue(encoder.encode(text));
          }
        }

        // Save assistant response after stream completes
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
        // Surface the real error as readable text instead of aborting the stream,
        // which would cause a cryptic "Failed to fetch" on the client.
        const detail = err instanceof Error ? err.message : String(err);
        console.error("[CHAT] Stream error:", detail);
        const errText = `Sorry, I ran into an error reaching the AI service: *${detail}*. Please try again.`;
        controller.enqueue(encoder.encode(errText));
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
