// Non-streaming JSON/text completion helper. Routes to local Ollama.
// Used for one-shot AI tasks (competency generation, quiz building,
// scenario grading) — distinct from the streaming chat route.

export type AIProvider = "ollama";

export interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  responseFormat?: "json" | "text";
}

export interface GenerateResult {
  text: string;
  provider: AIProvider;
}

export async function generateCompletion(opts: GenerateOptions): Promise<GenerateResult> {
  return { text: await generateWithOllama(opts), provider: "ollama" };
}

async function generateWithOllama(opts: GenerateOptions): Promise<string> {
  const ollamaBase = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const ollamaModel = process.env.OLLAMA_MODEL ?? "llama3";

  const res = await fetch(`${ollamaBase}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ollamaModel,
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userPrompt },
      ],
      stream: false,
      format: opts.responseFormat === "json" ? "json" : undefined,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Ollama error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

// Models occasionally wrap JSON in markdown fences despite format=json.
// Strip them defensively before parsing.
export function parseJSONLoose<T = unknown>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const cleaned = raw
      .replace(/^\s*```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    return JSON.parse(cleaned) as T;
  }
}
