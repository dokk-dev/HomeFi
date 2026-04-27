"use client";

import { BookOpen, FlaskConical, Sparkles, Tag, Zap, CheckCircle2, XCircle } from "lucide-react";
import { LoadingDots } from "./ChatHelpers";
import type { Pillar, TestState, Quiz } from "./types";
import { getMasteryLabel } from "./types";

// ── Knowledge context data ────────────────────────────────────────────────

const DEFAULT_CONTEXT = {
  concept: {
    title: "Core Fundamentals",
    description:
      "Build a strong foundation by mastering the essential principles of this subject before advancing to complex topics.",
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

const KNOWLEDGE_CONTEXT: Record<
  string,
  {
    concept: { title: string; description: string; tags: string[] };
    source: { title: string; author: string };
    masteryLabel: string;
    nextActions: string[];
  }
> = {
  "cs-ai": {
    concept: {
      title: "Backpropagation",
      description:
        "The fundamental algorithm for training neural networks by calculating gradients of the loss function.",
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
      description:
        "Sound design technique that starts with a harmonically rich waveform and removes frequencies using filters.",
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
      description:
        "Russian verbs come in imperfective/perfective pairs that indicate whether an action is ongoing or completed.",
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
      description:
        "The seven verb patterns (binyanim) that define the meaning and voice of Hebrew verbs.",
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
      description:
        "Structured interviews using past behavior to predict future performance. STAR method is the standard framework.",
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

// ── Component ──────────────────────────────────────────────────────────────

interface Props {
  activePillar: Pillar | undefined;
  activeSlug: string;
  testState: TestState;
  quiz: Quiz | null;
  answers: (number | null)[];
  currentQ: number;
  testScore: { correct: number; total: number; newMastery: number } | null;
  localMastery: Record<string, number>;
  onStartTest: () => void;
  onSelectAnswer: (idx: number) => void;
  onNextQuestion: () => void;
  onResetTest: () => void;
  onSuggestedAction: (action: string) => void;
}

export function KnowledgeContextPanel({
  activePillar,
  activeSlug,
  testState,
  quiz,
  answers,
  currentQ,
  testScore,
  localMastery,
  onStartTest,
  onSelectAnswer,
  onNextQuestion,
  onResetTest,
  onSuggestedAction,
}: Props) {
  const ctx = KNOWLEDGE_CONTEXT[activeSlug] ?? DEFAULT_CONTEXT;
  const pillarColor = activePillar?.color ?? "#6366f1";
  const mastery = localMastery[activeSlug] ?? activePillar?.mastery ?? 0;

  return (
    <aside className="hidden md:flex w-80 border-l border-outline-variant/10 flex-col overflow-y-auto">
      <div className="px-6 py-5 flex items-center justify-between border-b border-outline-variant/10">
        <h2 className="text-sm font-headline font-semibold text-on-surface">Knowledge Context</h2>
        <Sparkles size={16} className="text-outline" />
      </div>

      <div className="flex-1 px-5 py-5 space-y-4">
        {/* Core concept */}
        <div
          className="bg-surface-container rounded-xl p-4 border-t-2"
          style={{ borderTopColor: pillarColor }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Tag size={11} className="text-outline" />
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: pillarColor }}
            >
              Core Concept
            </span>
          </div>
          <h3 className="text-base font-headline font-bold text-on-surface mb-2">
            {ctx.concept.title}
          </h3>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
            {ctx.concept.description}
          </p>
          <div className="flex gap-2 flex-wrap">
            {ctx.concept.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2.5 py-1 rounded-full bg-surface-container-high text-outline font-bold tracking-wider"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Related source */}
        <div className="bg-surface-container rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <BookOpen size={11} className="text-outline" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
              Related Source
            </span>
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

        {/* Mastery / Knowledge Test */}
        <div className="bg-surface-container rounded-xl p-4">
          {testState === "idle" && (
            <>
              <div className="flex items-center gap-1.5 mb-3">
                <FlaskConical size={11} className="text-outline" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                  Mastery Level
                </span>
              </div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-xl font-headline font-bold text-on-surface">
                  {getMasteryLabel(mastery)}
                </span>
                <span className="text-lg font-bold" style={{ color: pillarColor }}>
                  {mastery}%
                </span>
              </div>
              <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden mb-4">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${mastery}%`, backgroundColor: pillarColor }}
                />
              </div>
              <button
                onClick={onStartTest}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors hover:opacity-80"
                style={{ backgroundColor: `${pillarColor}20`, color: pillarColor }}
              >
                <FlaskConical size={13} />
                Take a Knowledge Test
              </button>
            </>
          )}

          {testState === "loading" && (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <LoadingDots />
              <span className="text-xs text-outline">Generating quiz…</span>
            </div>
          )}

          {testState === "active" && quiz && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                  Question {currentQ + 1} of {quiz.questions.length}
                </span>
                <div className="flex gap-1">
                  {quiz.questions.map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full transition-colors"
                      style={{
                        backgroundColor:
                          i === currentQ
                            ? pillarColor
                            : i < currentQ
                            ? `${pillarColor}50`
                            : "var(--color-outline-variant)",
                      }}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm font-medium text-on-surface mb-4 leading-relaxed">
                {quiz.questions[currentQ].q}
              </p>
              <div className="space-y-2 mb-4">
                {quiz.questions[currentQ].options.map((opt, i) => {
                  const selected = answers[currentQ] === i;
                  return (
                    <button
                      key={i}
                      onClick={() => onSelectAnswer(i)}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all"
                      style={{
                        backgroundColor: selected
                          ? `${pillarColor}18`
                          : "var(--color-surface-container-high)",
                        border: `1.5px solid ${selected ? pillarColor + "60" : "transparent"}`,
                        color: selected ? pillarColor : "var(--color-on-surface-variant)",
                      }}
                    >
                      <span className="font-bold mr-2 text-xs opacity-50">
                        {String.fromCharCode(65 + i)}.
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={onNextQuestion}
                disabled={answers[currentQ] === null}
                className="w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-30"
                style={{ backgroundColor: pillarColor, color: "white" }}
              >
                {currentQ < quiz.questions.length - 1 ? "Next →" : "Submit"}
              </button>
            </>
          )}

          {testState === "complete" && testScore && (
            <>
              <div className="flex items-center gap-1.5 mb-4">
                {testScore.correct >= Math.ceil(testScore.total * 0.6) ? (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                ) : (
                  <XCircle size={14} className="text-red-400" />
                )}
                <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                  Test Complete
                </span>
              </div>
              <div className="text-center py-2 mb-4">
                <div
                  className="text-4xl font-headline font-extrabold mb-1"
                  style={{ color: pillarColor }}
                >
                  {testScore.correct}/{testScore.total}
                </div>
                <div className="text-sm text-on-surface-variant">
                  {Math.round((testScore.correct / testScore.total) * 100)}% correct
                </div>
              </div>
              <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${testScore.newMastery}%`, backgroundColor: pillarColor }}
                />
              </div>
              <div className="text-xs text-outline text-center mb-4">
                Mastery updated to{" "}
                <span className="font-bold" style={{ color: pillarColor }}>
                  {testScore.newMastery}%
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onResetTest}
                  className="flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-outline border border-outline-variant/20 hover:border-outline-variant/40 transition-colors"
                >
                  Done
                </button>
                <button
                  onClick={onStartTest}
                  className="flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors hover:opacity-80"
                  style={{ backgroundColor: `${pillarColor}20`, color: pillarColor }}
                >
                  Retake
                </button>
              </div>
            </>
          )}
        </div>

        {/* Suggested actions */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <Zap size={11} className="text-outline" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
              Suggested Actions
            </span>
          </div>
          <div className="space-y-2">
            {ctx.nextActions.map((action, i) => (
              <button
                key={i}
                onClick={() => onSuggestedAction(action)}
                className="w-full text-left flex items-start gap-3 p-3 bg-surface-container rounded-lg hover:bg-surface-container-high transition-colors group"
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${pillarColor}20`, color: pillarColor }}
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
      </div>
    </aside>
  );
}
