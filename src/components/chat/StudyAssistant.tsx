"use client";

import { useState, useEffect, useRef, useCallback, FormEvent, KeyboardEvent } from "react";
import { Bot, Send, Square, X, Sparkles, ChevronDown } from "lucide-react";

type Provider = "ollama" | "gemini";

const OLLAMA_MODELS = ["llama3", "llava", "mistral", "codellama", "phi3", "gemma2"];

const PROVIDER_STORAGE_KEY = "meridian-ai-provider";
const MODEL_STORAGE_KEY = "meridian-ollama-model";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  pillarSlug: string;
  pillarLabel: string;
  pillarColor: string;
  // Panel mode (used on pillar detail page as fixed right panel)
  asPanel?: boolean;
  onClose?: () => void;
  taskCount?: number;
}

// Very simple markdown-ish renderer
function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const lines = part.slice(3).split("\n");
          const lang = lines[0].trim();
          const code = lines.slice(1).join("\n").replace(/```$/, "").trimEnd();
          return (
            <div key={i} className="rounded-lg overflow-hidden">
              {lang && (
                <div className="bg-zinc-900 px-3 py-1 text-xs text-zinc-500 font-mono border-b border-zinc-700">
                  {lang}
                </div>
              )}
              <pre className="bg-zinc-900 px-3 py-3 text-zinc-300 font-mono text-xs overflow-x-auto whitespace-pre">
                {code}
              </pre>
            </div>
          );
        }
        return (
          <div key={i} className="whitespace-pre-wrap">
            {part.split(/(`[^`]+`)/).map((segment, j) => {
              if (segment.startsWith("`") && segment.endsWith("`")) {
                return (
                  <code key={j} className="bg-zinc-700 text-zinc-200 px-1 py-0.5 rounded text-xs font-mono">
                    {segment.slice(1, -1)}
                  </code>
                );
              }
              const boldParts = segment.split(/(\*\*[^*]+\*\*)/g);
              return boldParts.map((bp, k) => {
                if (bp.startsWith("**") && bp.endsWith("**")) {
                  return <strong key={k} className="font-semibold text-white">{bp.slice(2, -2)}</strong>;
                }
                return <span key={k}>{bp}</span>;
              });
            })}
          </div>
        );
      })}
    </div>
  );
}

export function StudyAssistant({
  pillarSlug,
  pillarLabel,
  pillarColor,
  asPanel = false,
  onClose,
  taskCount = 0,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [provider, setProvider] = useState<Provider>("gemini");
  const [ollamaModel, setOllamaModel] = useState("llama3");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load provider preference from localStorage
  useEffect(() => {
    try {
      const savedProvider = localStorage.getItem(PROVIDER_STORAGE_KEY) as Provider | null;
      if (savedProvider === "ollama" || savedProvider === "gemini") setProvider(savedProvider);
      const savedModel = localStorage.getItem(MODEL_STORAGE_KEY);
      if (savedModel) setOllamaModel(savedModel);
    } catch {}
  }, []);

  function switchProvider(p: Provider) {
    setProvider(p);
    try { localStorage.setItem(PROVIDER_STORAGE_KEY, p); } catch {}
  }

  function switchModel(m: string) {
    setOllamaModel(m);
    setModelMenuOpen(false);
    try { localStorage.setItem(MODEL_STORAGE_KEY, m); } catch {}
  }

  const hasMessages = messages.length > 0;

  useEffect(() => {
    const shouldLoad = asPanel ? !hasMessages : (isOpen && !hasMessages);
    if (shouldLoad) loadHistory();
  }, [isOpen, hasMessages, asPanel]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isStreaming]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  async function loadHistory() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/chat/history?pillarSlug=${pillarSlug}`);
      if (res.ok) {
        const data = await res.json() as { messages: Message[] };
        setMessages(data.messages);
      }
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = useCallback(async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setInput("");
    setIsStreaming(true);

    const userMsg: Message = { role: "user", content: trimmed };
    const assistantMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    try {
      const history = messages.slice(-20);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pillarSlug,
          message: trimmed,
          history,
          provider,
          model: provider === "ollama" ? ollamaModel : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" })) as { error: string };
        throw new Error(err.error);
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
      }
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: buffer };
        return updated;
      });
    } catch (err) {
      // Only fires for true network failures (server unreachable, etc.)
      const message = err instanceof Error ? err.message : "Could not reach the server";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `Connection error: ${message}. Check that the dev server is running and try again.`,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      textareaRef.current?.focus();
    }
  }, [input, isStreaming, messages, pillarSlug, provider, ollamaModel]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const quickChips = STARTER_PROMPTS[pillarSlug] ?? [];
  const isEmpty = messages.length === 0 && !isLoading;

  // ── Panel mode (right-side panel on pillar page) ────────────────────────
  if (asPanel) {
    return (
      <>
        {/* Panel header */}
        <div className="px-5 py-4 border-b border-outline-variant/10 flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0"
                style={{
                  backgroundColor: `${pillarColor}15`,
                  borderColor: `${pillarColor}30`,
                }}
              >
                <Bot size={16} style={{ color: pillarColor }} />
              </div>
              <div>
                <h3 className="text-sm font-headline font-semibold text-on-surface">
                  AI Tutor
                </h3>
                <span className="text-[10px] text-emerald-400 font-medium">
                  Context: {taskCount} task{taskCount !== 1 ? "s" : ""} loaded
                </span>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-outline hover:text-on-surface transition-colors"
                aria-label="Close AI Tutor"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Provider toggle */}
          <div className="flex items-center gap-2">
            <div className="flex bg-surface-container rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => switchProvider("ollama")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                  provider === "ollama"
                    ? "bg-surface-container-high text-on-surface shadow-sm"
                    : "text-outline hover:text-on-surface-variant"
                }`}
              >
                <span>🦙</span>
                <span>Local</span>
              </button>
              <button
                onClick={() => switchProvider("gemini")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                  provider === "gemini"
                    ? "bg-surface-container-high text-on-surface shadow-sm"
                    : "text-outline hover:text-on-surface-variant"
                }`}
              >
                <span>✦</span>
                <span>Gemini</span>
              </button>
            </div>

            {/* Ollama model picker */}
            {provider === "ollama" && (
              <div className="relative">
                <button
                  onClick={() => setModelMenuOpen((o) => !o)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container text-[11px] text-on-surface-variant border border-outline-variant/20 hover:border-outline-variant/40 transition-colors"
                >
                  <span className="font-mono">{ollamaModel}</span>
                  <ChevronDown size={10} />
                </button>
                {modelMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-surface-container-high border border-outline-variant/20 rounded-lg shadow-lg overflow-hidden min-w-[110px]">
                    {OLLAMA_MODELS.map((m) => (
                      <button
                        key={m}
                        onClick={() => switchModel(m)}
                        className={`w-full text-left px-3 py-2 text-[11px] font-mono hover:bg-surface-container transition-colors ${
                          m === ollamaModel ? "text-on-surface font-semibold" : "text-on-surface-variant"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Messages + input wrapper */}
        <div className="flex-1 relative overflow-hidden">
          {/* Scrollable messages */}
          <div className="absolute inset-0 overflow-y-auto p-4 pb-28 space-y-4">
            {isLoading && (
              <div className="flex items-center gap-2 text-outline text-sm">
                <LoadingDots />
                Loading conversation…
              </div>
            )}

            {isEmpty && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-8">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${pillarColor}15` }}
                >
                  <Sparkles size={24} style={{ color: pillarColor }} />
                </div>
                <div>
                  <p className="text-on-surface-variant font-medium text-sm">
                    Your {pillarLabel} tutor
                  </p>
                  <p className="text-outline text-xs mt-1 max-w-[220px]">
                    Ask me to explain a concept, help with a problem, or suggest what to study next.
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <span className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1">
                  {msg.role === "assistant" ? "ASSISTANT" : "YOU"}
                </span>
                {msg.role === "assistant" ? (
                  <div className="bg-surface-container-high rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%]">
                    {msg.content ? (
                      <MessageContent content={msg.content} />
                    ) : (
                      <LoadingDots />
                    )}
                  </div>
                ) : (
                  <div
                    className="rounded-2xl rounded-tr-sm px-4 py-3 max-w-[90%] border"
                    style={{
                      backgroundColor: `${pillarColor}1a`,
                      borderColor: `${pillarColor}30`,
                    }}
                  >
                    <p className="text-sm text-on-surface whitespace-pre-wrap">{msg.content}</p>
                  </div>
                )}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Frosted glass input bar */}
          <div className="absolute bottom-0 left-0 right-0 backdrop-blur-xl bg-surface/80 border-t border-outline-variant/10 p-4">
            {/* Quick chips (only when empty) */}
            {isEmpty && quickChips.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-3">
                {quickChips.slice(0, 3).map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setInput(prompt);
                      textareaRef.current?.focus();
                    }}
                    className="text-[11px] px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/20 hover:border-primary/40 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything…"
                rows={1}
                disabled={isStreaming}
                className="flex-1 resize-none bg-surface-container-high border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder-outline focus:outline-none focus:border-primary/40 disabled:opacity-50 min-h-[40px] max-h-[120px]"
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40"
                style={{
                  backgroundColor: input.trim() && !isStreaming ? pillarColor : "#3f3f46",
                }}
              >
                {isStreaming ? (
                  <Square size={14} color="white" fill="white" />
                ) : (
                  <Send size={14} color="white" />
                )}
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  // ── Collapsible mode (legacy / ai-tutor page) ───────────────────────────
  return (
    <div className="mt-6">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 rounded-xl border border-outline-variant/20 bg-surface-container-low hover:bg-surface-container transition-colors group"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${pillarColor}20`, border: `1px solid ${pillarColor}40` }}
        >
          <Sparkles size={16} style={{ color: pillarColor }} />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-on-surface">Study Assistant</div>
          <div className="text-xs text-outline">Ask me anything about {pillarLabel}</div>
        </div>
        <span
          className="text-outline text-xs transition-transform"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}
        >
          ▾
        </span>
      </button>

      {isOpen && (
        <div className="mt-2 rounded-xl border border-outline-variant/20 bg-surface-container-low overflow-hidden flex flex-col">
          <div className="h-96 overflow-y-auto p-4 space-y-4 scroll-smooth">
            {isLoading && (
              <div className="flex items-center gap-2 text-outline text-sm">
                <LoadingDots />
                Loading conversation…
              </div>
            )}

            {isEmpty && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${pillarColor}20` }}
                >
                  <Sparkles size={24} style={{ color: pillarColor }} />
                </div>
                <div>
                  <p className="text-on-surface-variant font-medium text-sm">Your {pillarLabel} tutor</p>
                  <p className="text-outline text-xs mt-1 max-w-xs">
                    Ask me to explain a concept, help with a problem, quiz you, or suggest what to study next.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {quickChips.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                      className="text-xs px-3 py-1.5 rounded-full border border-outline-variant/20 text-outline hover:border-outline hover:text-on-surface-variant transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div
                    className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: `${pillarColor}20` }}
                  >
                    <Sparkles size={14} style={{ color: pillarColor }} />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-tr-sm"
                      : "bg-surface-container-high text-on-surface-variant rounded-tl-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    msg.content ? <MessageContent content={msg.content} /> : <LoadingDots />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-outline-variant/10 p-3">
            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
                rows={1}
                disabled={isStreaming}
                className="flex-1 resize-none bg-surface-container-high text-on-surface placeholder-outline rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50 min-h-[40px]"
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40"
                style={{ backgroundColor: input.trim() && !isStreaming ? pillarColor : "#3f3f46" }}
              >
                {isStreaming ? (
                  <Square size={14} color="white" fill="white" />
                ) : (
                  <Send size={14} color="white" />
                )}
              </button>
            </form>
            <p className="text-xs text-outline mt-1.5 px-1">
              {provider === "ollama" ? `🦙 ${ollamaModel} (local)` : "✦ Gemini"} · Responses may not always be accurate
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const STARTER_PROMPTS: Record<string, string[]> = {
  "cs-ai": [
    "Help me understand my current tasks",
    "Quiz me on a topic",
    "Explain Big O notation",
    "How do neural networks learn?",
  ],
  "music-tech": [
    "Help me with my current project",
    "Explain audio DSP basics",
    "How do I set up Max/MSP?",
    "Describe subtractive synthesis",
  ],
  russian: [
    "Quiz me on vocabulary",
    "Explain the genitive case",
    "Help me read this sentence",
    "Teach me a grammar rule",
  ],
  hebrew: [
    "Help me learn the aleph-bet",
    "Quiz me on vocabulary",
    "Explain the binyanim",
    "Help me read a verse",
  ],
  career: [
    "Review my job search strategy",
    "Help me prepare for interviews",
    "How do I optimize my resume?",
    "Practice a behavioral question",
  ],
};

function LoadingDots() {
  return (
    <span className="inline-flex gap-1 items-center h-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-outline animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
