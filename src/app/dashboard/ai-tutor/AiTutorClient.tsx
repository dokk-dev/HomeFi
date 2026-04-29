"use client";

import { useState, useEffect, useRef, useCallback, FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Bot, Send, Square, Sparkles } from "lucide-react";
import { resolveIcon } from "@/lib/icons/pillarIcons";
import { MessageContent, LoadingDots } from "./ChatHelpers";
import { KnowledgeContextPanel } from "./KnowledgeContextPanel";
import type { Message, Pillar, Quiz, TestState } from "./types";

interface Props {
  pillars: Pillar[];
  displayName: string;
}

export function AiTutorClient({ pillars, displayName }: Props) {
  const router = useRouter();
  const [activeSlug, setActiveSlug] = useState<string>(pillars[0]?.slug ?? "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Test state
  const [testState, setTestState] = useState<TestState>("idle");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [testScore, setTestScore] = useState<{ correct: number; total: number; newMastery: number } | null>(null);
  const [localMastery, setLocalMastery] = useState<Record<string, number>>({});

  const activePillar = pillars.find((p) => p.slug === activeSlug);

  useEffect(() => {
    setMessages([]);
    setInput("");
    setTestState("idle");
    setQuiz(null);
    setAnswers([]);
    setCurrentQ(0);
    setTestScore(null);
    if (activeSlug) loadHistory(activeSlug);
  }, [activeSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isStreaming]);

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
      const errMsg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: `Sorry, I ran into an error: ${errMsg}. Please try again.` };
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

  async function startTest() {
    setTestState("loading");
    setQuiz(null);
    try {
      const res = await fetch("/api/chat/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pillarSlug: activeSlug }),
      });
      if (!res.ok) throw new Error("Failed to generate quiz");
      const data = await res.json() as Quiz;
      setQuiz(data);
      setAnswers(new Array(data.questions.length).fill(null));
      setCurrentQ(0);
      setTestState("active");
    } catch {
      setTestState("idle");
    }
  }

  function selectAnswer(idx: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQ] = idx;
      return next;
    });
  }

  function handleNextQuestion() {
    if (!quiz || answers[currentQ] === null) return;
    if (currentQ < quiz.questions.length - 1) {
      setCurrentQ((q) => q + 1);
    } else {
      finishTest();
    }
  }

  async function finishTest() {
    if (!quiz || !activePillar) return;
    const correct = answers.filter((a, i) => a === quiz.questions[i].correct).length;
    const newScore = Math.round((correct / quiz.questions.length) * 100);
    const oldMastery = localMastery[activeSlug] ?? activePillar.mastery ?? 0;
    const newMastery = Math.round(oldMastery * 0.5 + newScore * 0.5);

    setTestScore({ correct, total: quiz.questions.length, newMastery });
    setLocalMastery((prev) => ({ ...prev, [activeSlug]: newMastery }));
    setTestState("complete");

    fetch(`/api/pillars/${activePillar.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mastery: newMastery }),
    }).then(() => router.refresh());
  }

  function resetTest() {
    setTestState("idle");
    setQuiz(null);
    setTestScore(null);
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
        <div className="flex gap-2 px-4 md:px-8 pt-4 md:pt-6 pb-4 flex-wrap border-b border-outline-variant/10">
          {pillars.map((pillar) => {
            const isActive = pillar.slug === activeSlug;
            const Icon = resolveIcon(pillar.slug, pillar.icon_key);
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
                <Icon
                  size={14}
                  style={isActive ? { color: pillar.color } : undefined}
                  className={!isActive ? "text-outline" : ""}
                />
                <span className={isActive ? "" : "text-on-surface-variant"}>
                  {pillar.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Messages / empty state */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8 pb-32">
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
            <div className="px-4 md:px-8 py-6 space-y-6 pb-36">
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

        {/* Input - frosted glass overlay */}
        <div className="absolute bottom-0 left-0 right-0 backdrop-blur-xl bg-surface/80 border-t border-outline-variant/5 px-4 md:px-8 pb-4 md:pb-6 pt-3">
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

          <div className="flex items-center gap-4 mt-3 justify-center">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-outline">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activePillar?.color ?? "#6366f1" }} />
              Focus: {activePillar?.label ?? "—"}
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-outline">
              <span className="w-1.5 h-1.5 rounded-full bg-outline/40" />
              Model: Claude
            </span>
          </div>
        </div>
      </div>

      {/* ── Right: Knowledge Context ─────────────────────────────────────── */}
      <KnowledgeContextPanel
        activePillar={activePillar}
        activeSlug={activeSlug}
        testState={testState}
        quiz={quiz}
        answers={answers}
        currentQ={currentQ}
        testScore={testScore}
        localMastery={localMastery}
        onStartTest={startTest}
        onSelectAnswer={selectAnswer}
        onNextQuestion={handleNextQuestion}
        onResetTest={resetTest}
        onSuggestedAction={handleSubmit}
      />
    </div>
  );
}
