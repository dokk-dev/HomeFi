"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Check, Circle, Send, RefreshCw, ChevronRight, Trophy, AlertCircle } from "lucide-react";
import type { Quiz, QuizQuestion, Answer, QuizGradeResult } from "@/lib/quiz/types";

type Phase = "loading" | "active" | "submitting" | "complete" | "error";

interface Props {
  pillarId: string;
  pillarLabel: string;
  pillarColor: string;
  onClose: () => void;
  onMasteryChanged?: (newMastery: number) => void;
}

interface GradeResponse extends QuizGradeResult {
  newMastery: number;
}

export function QuizFlow({ pillarId, pillarLabel, pillarColor, onClose, onMasteryChanged }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [grade, setGrade] = useState<GradeResponse | null>(null);

  useEffect(() => {
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/quizzes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pillar_id: pillarId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate quiz");
      const q = data as Quiz;
      setQuiz(q);
      setAnswers(new Array(q.questions.length).fill(null));
      setCurrentIdx(0);
      setPhase("active");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  function setAnswer(value: Answer) {
    setAnswers((prev) => prev.map((a, i) => (i === currentIdx ? value : a)));
  }

  function next() {
    if (!quiz) return;
    if (currentIdx < quiz.questions.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      void submit();
    }
  }

  function prev() {
    setCurrentIdx((i) => Math.max(0, i - 1));
  }

  async function submit() {
    if (!quiz) return;
    setPhase("submitting");
    setError(null);
    try {
      const res = await fetch("/api/quizzes/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pillar_id: pillarId,
          questions: quiz.questions.map((q, i) => ({
            ...q,
            answer: answers[i],
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to submit");
      setGrade(data as GradeResponse);
      setPhase("complete");
      onMasteryChanged?.(data.newMastery);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container rounded-2xl border border-outline-variant/20 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-outline-variant/10">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: pillarColor }}
              />
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: pillarColor }}
              >
                Mastery Test
              </span>
            </div>
            <h2 className="text-lg font-headline font-bold text-on-surface">
              {pillarLabel}
            </h2>
            {quiz && phase === "active" && (
              <p className="text-xs text-outline mt-0.5">
                Question {currentIdx + 1} of {quiz.questions.length} · {quiz.questions[currentIdx].type === "mcq" ? "Multiple choice" : "Scenario"} · {quiz.questions[currentIdx].competency}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {phase === "loading" && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={32} className="animate-spin" style={{ color: pillarColor }} />
              <p className="text-sm text-on-surface-variant">
                Building your test for <span className="font-bold">{pillarLabel}</span>…
              </p>
              <p className="text-xs text-outline">7 multiple choice + 3 scenario questions</p>
            </div>
          )}

          {phase === "submitting" && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={32} className="animate-spin" style={{ color: pillarColor }} />
              <p className="text-sm text-on-surface-variant">Grading your answers…</p>
              <p className="text-xs text-outline">Scenario questions take a few seconds each.</p>
            </div>
          )}

          {phase === "error" && error && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <AlertCircle size={32} className="text-red-400" />
              <p className="text-sm text-on-surface">{error}</p>
              <button
                onClick={generate}
                className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-on-primary"
                style={{ backgroundColor: pillarColor }}
              >
                <RefreshCw size={12} />
                Try again
              </button>
            </div>
          )}

          {phase === "active" && quiz && (
            <QuestionView
              question={quiz.questions[currentIdx]}
              answer={answers[currentIdx]}
              onChange={setAnswer}
              pillarColor={pillarColor}
            />
          )}

          {phase === "complete" && grade && quiz && (
            <CompleteView grade={grade} quiz={quiz} pillarColor={pillarColor} />
          )}
        </div>

        {/* Footer */}
        {phase === "active" && quiz && (
          <div className="flex items-center justify-between p-4 border-t border-outline-variant/10">
            <button
              onClick={prev}
              disabled={currentIdx === 0}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-outline hover:text-on-surface hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <ProgressDots
              count={quiz.questions.length}
              currentIdx={currentIdx}
              answers={answers}
              pillarColor={pillarColor}
            />
            <button
              onClick={next}
              disabled={answers[currentIdx] === null || answers[currentIdx] === ""}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-on-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ backgroundColor: pillarColor }}
            >
              {currentIdx === quiz.questions.length - 1 ? (
                <>
                  <Send size={12} />
                  Submit
                </>
              ) : (
                <>
                  Next
                  <ChevronRight size={12} />
                </>
              )}
            </button>
          </div>
        )}

        {phase === "complete" && (
          <div className="flex items-center justify-end gap-2 p-4 border-t border-outline-variant/10">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Close
            </button>
            <button
              onClick={generate}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-on-primary"
              style={{ backgroundColor: pillarColor }}
            >
              <RefreshCw size={12} />
              Take another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressDots({
  count,
  currentIdx,
  answers,
  pillarColor,
}: {
  count: number;
  currentIdx: number;
  answers: Answer[];
  pillarColor: string;
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: count }).map((_, i) => {
        const answered = answers[i] !== null && answers[i] !== "";
        const current = i === currentIdx;
        return (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-colors"
            style={{
              backgroundColor: current
                ? pillarColor
                : answered
                ? `${pillarColor}80`
                : "rgba(255,255,255,0.15)",
            }}
          />
        );
      })}
    </div>
  );
}

function QuestionView({
  question,
  answer,
  onChange,
  pillarColor,
}: {
  question: QuizQuestion;
  answer: Answer;
  onChange: (a: Answer) => void;
  pillarColor: string;
}) {
  if (question.type === "mcq") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-on-surface leading-relaxed font-medium">{question.q}</p>
        <div className="space-y-2">
          {question.options.map((opt, i) => {
            const selected = answer === i;
            return (
              <button
                key={i}
                onClick={() => onChange(i)}
                className="w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-all"
                style={{
                  backgroundColor: selected ? `${pillarColor}15` : "transparent",
                  borderColor: selected ? `${pillarColor}50` : "rgba(255,255,255,0.08)",
                }}
              >
                {selected ? (
                  <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: pillarColor }} />
                ) : (
                  <Circle size={14} className="mt-0.5 flex-shrink-0 text-outline" />
                )}
                <span className="text-xs text-on-surface leading-relaxed">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Scenario
  return (
    <div className="space-y-4">
      <div className="bg-surface-container-low rounded-lg p-4 border-l-2" style={{ borderColor: pillarColor }}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Scenario</p>
        <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{question.prompt}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">Your response</p>
        <textarea
          value={typeof answer === "string" ? answer : ""}
          onChange={(e) => onChange(e.target.value)}
          rows={8}
          placeholder="Write a complete answer that demonstrates how you'd handle this in practice."
          className="w-full bg-surface-container rounded-lg px-3 py-2 text-sm text-on-surface border border-outline-variant/20 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-y"
        />
        <p className="text-[10px] text-outline mt-1.5">Graded against rubric criteria — be specific and concrete.</p>
      </div>
    </div>
  );
}

function CompleteView({
  grade,
  quiz,
  pillarColor,
}: {
  grade: GradeResponse;
  quiz: Quiz;
  pillarColor: string;
}) {
  const overallPct = Math.round(grade.overall_score * 100);
  return (
    <div className="space-y-5">
      {/* Score badge */}
      <div className="text-center py-4">
        <div className="inline-flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <Trophy size={20} style={{ color: pillarColor }} />
            <span className="text-3xl font-headline font-bold" style={{ color: pillarColor }}>
              {overallPct}%
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
            Overall · Mastery now {grade.newMastery}%
          </span>
        </div>
      </div>

      {/* Per-competency breakdown */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
          Per Competency
        </p>
        <div className="space-y-1.5">
          {grade.per_competency.map((c) => {
            const pct = Math.round(c.score * 100);
            return (
              <div key={c.name} className="flex items-center gap-3 text-xs">
                <span className="flex-1 text-on-surface truncate">{c.name}</span>
                <span className="text-outline">{c.count} q</span>
                <div className="w-20 h-1 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: pillarColor }}
                  />
                </div>
                <span className="w-8 text-right font-bold text-on-surface">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-question review */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
          Question Review
        </p>
        <div className="space-y-2">
          {quiz.questions.map((q, i) => {
            const g = grade.per_question[i];
            const isMCQ = q.type === "mcq";
            const correct = g.correct ?? false;
            const score = Math.round(g.score * 100);
            return (
              <div
                key={i}
                className="bg-surface-container-low rounded-lg p-3 text-xs"
                style={{
                  borderLeft: `2px solid ${
                    g.score >= 0.66 ? pillarColor : g.score >= 0.33 ? "#f59e0b" : "#ef4444"
                  }`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-outline">
                    Q{i + 1} · {isMCQ ? "MCQ" : "Scenario"} · {q.competency}
                  </span>
                  <span className="font-bold text-on-surface">
                    {isMCQ ? (correct ? "✓" : "✗") : `${score}%`}
                  </span>
                </div>
                <p className="text-on-surface mb-1 line-clamp-2">
                  {isMCQ ? q.q : q.prompt}
                </p>
                {isMCQ && !correct && g.expected !== undefined && (
                  <p className="text-outline">
                    Correct answer: <span className="text-on-surface">{q.options[g.expected]}</span>
                  </p>
                )}
                {!isMCQ && g.feedback && (
                  <p className="text-on-surface-variant italic">{g.feedback}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
