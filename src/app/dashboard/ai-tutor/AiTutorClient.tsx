"use client";

import { useState, useEffect, useRef, useCallback, FormEvent, KeyboardEvent } from "react";
import { Bot, Send, Square, Sparkles, Tag, BookOpen, Zap } from "lucide-react";
import { PILLAR_ICONS } from "@/lib/icons/pillarIcons";
import type { PillarMeta } from "@/lib/constants/pillars";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Pillar {
  id: string;
  slug: string;
  label: string;
  color: string;
  mastery: number;
  meta: PillarMeta | undefined;
}

interface Props {
  pillars: Pillar[];
  displayName: string;
}

// ── Default context fallback for any pillar not explicitly mapped ──────────
const DEFAULT_CONTEXT = {
  concept: {
    title: "Core Fundamentals",
    description: "Build a strong foundation by mastering the essential principles of this subject before advancing to complex topics.",
    tags: ["FUNDAMENTALS", "PRACTICE"],
  },
  source: { title: "Recommended Resources", author: "Ask your AI tutor for suggestions" },
  masteryLabel: "In Progress",
  nextActions: [
    "Review the foundational concepts",
    "Practice with real examples",
    "Set a specific learning goal for this week",
  ],
};

// ── Knowledge context data per pillar ─────────────────────────────────────
const KNOWLEDGE_CONTEXT: Record<string, {
  concept: { title: string; description: string; tags: string[] };
  source: { title: string; author: string };
  masteryLabel: string;
  nextActions: string[];
}> = {
  "cs-ai": {
    concept: {
      title: "Backpropagation",
      description: "The fundamental algorithm for training neural networks by calculating gradients of the loss function.",
      tags: ["CHAIN RULE", "OPTIMIZATION"],
    },
    source: { title: "Deep Learning Book", author: "Ian Goodfellow, ch. 6.5" },
    masteryLabel: "Intermediate",
    nextActions: [
      "Implement gradient descent from scratch",
      "Review chain rule derivations",
      "Practice on a classification dataset",
    ],
  },
  "music-tech": {
    concept: {
      title: "Subtractive Synthesis",
      description: "Sound design technique that starts with a harmonically rich waveform and removes frequencies using filters.",
      tags: ["FILTERS", "OSCILLATORS"],
    },
    source: { title: "The Sound on Sound Guide", author: "Gordon Reid, Synthesis ch. 3" },
    masteryLabel: "Beginner",
    nextActions: [
      "Build a basic synth patch in your DAW",
      "Experiment with filter cutoff and resonance",
      "Study LFO modulation routing",
    ],
  },
  russian: {
    concept: {
      title: "Aspect Pairs",
      description: "Russian verbs come in imperfective/perfective pairs that indicate whether an action is ongoing or completed.",
      tags: ["IMPERFECTIVE", "PERFECTIVE"],
    },
    source: { title: "A Comprehensive Russian Grammar", author: "Terence Wade, ch. 12" },
    masteryLabel: "Beginner",
    nextActions: [
      "Memorize 10 common aspect pairs",
      "Practice conjugating perfective verbs",
      "Read a short text and identify aspects",
    ],
  },
  hebrew: {
    concept: {
      title: "Binyanim",
      description: "The seven verb patterns (binyanim) that define the meaning and voice of Hebrew verbs.",
      tags: ["PA'AL", "HIFIL", "NIFAL"],
    },
    source: { title: "Hebrew from Scratch", author: "Litmanovitz, Part 2, ch. 4" },
    masteryLabel: "Beginner",
    nextActions: [
      "Learn Pa'al pattern conjugations",
      "Practice reading niqqud text",
      "Study 20 high-frequency root words",
    ],
  },
  career: {
    concept: {
      title: "Behavioral Interviews",
      description: "Structured interviews using past behavior to predict future performance. STAR method is the standard framework.",
      tags: ["STAR METHOD", "STORYTELLING"],
    },
    source: { title: "Cracking the PM Interview", author: "McDowell & Bavaro, ch. 8" },
    masteryLabel: "Intermediate",
    nextActions: [
      "Write 5 STAR stories from past experience",
      "Practice answering leadership questions",
      "Research your target company's values",
    ],
  },
};

// ── Simple markdown renderer ───────────────────────────────────────────────
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
              {lang && <div className="bg-black/40 px-3 py-1 text-xs text-outline font-mono border-b border-outline-variant/10">{lang}</div>}
              <pre className="bg-black/40 px-3 py-3 text-on-surface-variant font-mono text-xs overflow-x-auto whitespace-pre">{code}</pre>
            </div>
          );
        }
        return (
          <div key={i} className="whitespace-pre-wrap">
            {part.split(/(`[^`]+`)/).map((seg, j) => {
              if (seg.startsWith("`") && seg.endsWith("`")) {
                return <code key={j} className="bg-surface-container-highest text-on-surface-variant px-1 py-0.5 rounded text-xs font-mono">{seg.slice(1, -1)}</code>;
              }
              return seg.split(/(\*\*[^*]+\*\*)/g).map((bp, k) => {
                if (bp.startsWith("**") && bp.endsWith("**")) {
                  return <strong key={k} className="font-semibold text-on-surface">{bp.slice(2, -2)}</strong>;
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

function LoadingDots() {
  return (
    <span className="inline-flex gap-1 items-center h-4">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-outline animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export function AiTutorClient({ pillars, displayName }: Props) {
  const [activeSlug, setActiveSlug] = useState<string>(pillars[0]?.slug ?? "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activePillar = pillars.find((p) => p.slug === activeSlug);
  const ctx = KNOWLEDGE_CONTEXT[activeSlug] ?? DEFAULT_CONTEXT;

  // Reset chat when switching pillars
  useEffect(() => {
    setMessages([]);
    setInput("");
    if (activeSlug) loadHistory(activeSlug);
  }, [activeSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  async function loadHistory(slug: string) {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/chat/history?pillarSlug=${slug}`);
      if (res.ok) {
        const data = await res.json() as { messages: Message[] };
        setMessages(data.messages);
      }
    } finally {
      setIsLoading(false);
    }
  }

  const handleSubmit = useCallback(async (text?: string, e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = (text ?? input).trim();
    if (!trimmed || isStreaming || !activeSlug) return;

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
        body: JSON.stringify({ pillarSlug: activeSlug, message: trimmed, history }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" })) as { error: string };
        throw new Error(err.error);
      }

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: `Sorry, I ran into an error: ${message}. Please try again.` };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      textareaRef.current?.focus();
    }
  }, [input, isStreaming, messages, activeSlug]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  if (pillars.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <div className="bg-surface-container-low rounded-xl p-8 flex items-center gap-6 max-w-md">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Bot size={32} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-headline font-bold text-on-surface mb-1">No pillars yet</h2>
            <p className="text-on-surface-variant text-sm">Set up your study pillars to start chatting with your AI tutor.</p>
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = messages.length === 0 && !isLoading;
  const firstName = displayName.split(" ")[0];

  return (
    <div className="flex flex-1 min-h-0">
      {/* ── Left: Chat ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* Pillar tabs */}
        <div className="flex gap-2 px-8 pt-6 pb-4 flex-wrap border-b border-outline-variant/10">
          {pillars.map((pillar) => {
            const isActive = pillar.slug === activeSlug;
            const Icon = PILLAR_ICONS[pillar.slug];
            return (
              <button
                key={pillar.slug}
                onClick={() => setActiveSlug(pillar.slug)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-headline font-semibold transition-all"
                style={
                  isActive
                    ? { backgroundColor: `${pillar.color}20`, color: pillar.color, outline: `1px solid ${pillar.color}40` }
                    : undefined
                }
              >
                {Icon && <Icon size={14} style={isActive ? { color: pillar.color } : undefined} className={!isActive ? "text-outline" : ""} />}
                <span className={isActive ? "" : "text-on-surface-variant"}>{pillar.meta?.shortLabel ?? pillar.label}</span>
              </button>
            );
          })}
        </div>

        {/* Messages / empty state */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            // ── Welcome screen ──
            <div className="flex flex-col items-center justify-center h-full text-center px-8 pb-24">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                style={{ backgroundColor: activePillar ? `${activePillar.color}20` : "#6366f120" }}
              >
                <Bot size={36} style={{ color: activePillar?.color ?? "#6366f1" }} />
              </div>
              <h1 className="text-3xl font-extrabold font-headline text-on-surface mb-3 tracking-tight">
                Systems online, {firstName}.
              </h1>
              {activePillar && (
                <p className="text-on-surface-variant text-base max-w-md">
                  Our current focus is{" "}
                  <span className="font-semibold" style={{ color: activePillar.color }}>
                    {activePillar.label}
                  </span>
                  . Where shall we direct our attention?
                </p>
              )}

              {isLoading && (
                <div className="mt-6 flex items-center gap-2 text-outline text-sm">
                  <LoadingDots />
                  Loading conversation…
                </div>
              )}
            </div>
          ) : (
            // ── Messages ──
            <div className="px-8 py-6 space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div
                      className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5"
                      style={{ backgroundColor: activePillar ? `${activePillar.color}20` : "#6366f120" }}
                    >
                      <Bot size={18} style={{ color: activePillar?.color ?? "#6366f1" }} />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-5 py-4 ${
                      msg.role === "user"
                        ? "rounded-tr-sm bg-surface-container-high"
                        : "rounded-tl-sm bg-surface-container"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      msg.content ? <MessageContent content={msg.content} /> : <LoadingDots />
                    ) : (
                      <p className="text-sm text-on-surface whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-8 pb-6 pt-3 border-t border-outline-variant/10">
          <form
            onSubmit={(e) => handleSubmit(undefined, e)}
            className="flex items-end gap-3 bg-surface-container rounded-2xl px-4 py-3 border border-outline-variant/10"
          >
            <Sparkles size={18} className="text-outline flex-shrink-0 mb-1" />
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Direct your intent here..."
              rows={1}
              disabled={isStreaming}
              className="flex-1 resize-none bg-transparent text-on-surface placeholder-outline text-sm focus:outline-none disabled:opacity-50 min-h-[24px] max-h-[120px]"
            />
            <span className="text-[11px] text-outline whitespace-nowrap mb-1 hidden sm:block">ENTER</span>
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 hover:scale-105"
              style={{ backgroundColor: activePillar?.color ?? "#6366f1" }}
            >
              {isStreaming ? <Square size={13} color="white" fill="white" /> : <Send size={13} color="white" />}
            </button>
          </form>

          {/* Status bar */}
          <div className="flex items-center gap-4 mt-3 justify-center">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-outline">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activePillar?.color ?? "#6366f1" }} />
              Focus: {activePillar?.meta?.shortLabel ?? activePillar?.label ?? "—"}
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-outline">
              <span className="w-1.5 h-1.5 rounded-full bg-outline/40" />
              Model: Claude
            </span>
          </div>
        </div>
      </div>

      {/* ── Right: Knowledge Context ─────────────────────────────────────── */}
      <aside className="w-80 border-l border-outline-variant/10 flex flex-col overflow-y-auto">
        <div className="px-6 py-5 flex items-center justify-between border-b border-outline-variant/10">
          <h2 className="text-sm font-headline font-semibold text-on-surface">Knowledge Context</h2>
          <Sparkles size={16} className="text-outline" />
        </div>

        <div className="flex-1 px-5 py-5 space-y-4">
          <>
              {/* Core concept */}
              <div className="bg-surface-container rounded-xl p-4 border-t-2" style={{ borderTopColor: activePillar?.color ?? "#6366f1" }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Tag size={11} className="text-outline" />
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: activePillar?.color ?? "#6366f1" }}
                  >
                    Core Concept
                  </span>
                </div>
                <h3 className="text-base font-headline font-bold text-on-surface mb-2">{ctx.concept.title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed mb-3">{ctx.concept.description}</p>
                <div className="flex gap-2 flex-wrap">
                  {ctx.concept.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2.5 py-1 rounded-full bg-surface-container-high text-outline font-bold tracking-wider">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Related source */}
              <div className="bg-surface-container rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <BookOpen size={11} className="text-outline" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Related Source</span>
                </div>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center flex-shrink-0">
                    <BookOpen size={16} className="text-on-surface-variant" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{ctx.source.title}</p>
                    <p className="text-xs text-outline mt-0.5">{ctx.source.author}</p>
                  </div>
                </div>
                <button className="w-full text-sm font-medium text-on-surface-variant bg-surface-container-high hover:bg-surface-container-highest rounded-lg py-2 transition-colors">
                  View Highlights
                </button>
              </div>

              {/* Mastery level */}
              <div className="bg-surface-container rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Mastery Level</span>
                </div>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-xl font-headline font-bold text-on-surface">{ctx.masteryLabel}</span>
                  <span className="text-lg font-bold" style={{ color: activePillar?.color ?? "#6366f1" }}>
                    {activePillar?.mastery ?? 0}%
                  </span>
                </div>
                <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${activePillar?.mastery ?? 0}%`, backgroundColor: activePillar?.color ?? "#6366f1" }}
                  />
                </div>
              </div>

              {/* Next suggested actions */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Zap size={11} className="text-outline" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Suggested Actions</span>
                </div>
                <div className="space-y-2">
                  {ctx.nextActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => handleSubmit(action)}
                      className="w-full text-left flex items-start gap-3 p-3 bg-surface-container rounded-lg hover:bg-surface-container-high transition-colors group"
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${activePillar?.color ?? "#6366f1"}20`, color: activePillar?.color ?? "#6366f1" }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors leading-snug">
                        {action}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
        </div>
      </aside>
    </div>
  );
}
