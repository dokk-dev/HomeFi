"use client";

import { useState, useEffect } from "react";
import { X, BookOpen, Brain, Clock, BarChart2, Zap } from "lucide-react";

const STORAGE_KEY = "meridian-onboarded-v1";

const steps = [
  {
    icon: Brain,
    title: "Your Study Pillars",
    body: "Your learning is organized into focus areas called pillars — Learning, Projects, and Career to start. Add, rename, or delete pillars anytime from Settings. Each pillar has its own task list and mastery progress.",
  },
  {
    icon: BookOpen,
    title: "Add Tasks & Track Progress",
    body: "Add tasks to any pillar from the pillar page or the quick-add button (⚡) in the top bar. Mark tasks complete to build mastery and keep your streak alive.",
  },
  {
    icon: Clock,
    title: "Focus Sessions",
    body: "Use New Focus Session from the sidebar to start a timed study sprint. The AI Tutor on each pillar page is ready to answer questions, quiz you, or explain concepts.",
  },
  {
    icon: BarChart2,
    title: "Track Your Momentum",
    body: "The Stats page shows your weekly and 4-week completion trends, per-pillar mastery, and upcoming due dates. Streaks are tracked per pillar so you can see where you're consistent.",
  },
  {
    icon: Zap,
    title: "You're ready!",
    body: "Start by opening a pillar and adding a few tasks for the week. Set due dates, add time hints, and let Meridian keep you on track.",
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" onClick={dismiss} />
      <div
        className="fixed z-[101] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface-container rounded-2xl border border-outline-variant/20 shadow-2xl p-8"
        style={{ animation: "bloomIn 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}
      >
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-outline hover:text-on-surface transition-colors"
        >
          <X size={16} />
        </button>

        {/* Step indicator */}
        <div className="flex gap-1.5 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                flex: i === step ? 2 : 1,
                backgroundColor:
                  i <= step
                    ? "rgb(var(--color-primary))"
                    : "rgba(255,255,255,0.08)",
              }}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
          <Icon size={26} className="text-primary" />
        </div>

        {/* Content */}
        <h2 className="text-xl font-headline font-bold text-on-surface mb-3">
          {current.title}
        </h2>
        <p className="text-sm text-on-surface-variant leading-relaxed mb-8">
          {current.body}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={dismiss}
            className="text-xs text-outline hover:text-on-surface transition-colors font-label font-medium"
          >
            Skip tour
          </button>
          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2 rounded-lg text-sm font-label font-semibold text-on-surface-variant hover:text-on-surface border border-outline-variant/30 hover:border-outline-variant/60 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={isLast ? dismiss : () => setStep((s) => s + 1)}
              className="px-5 py-2 rounded-lg text-sm font-headline font-bold text-white bg-primary hover:opacity-90 transition-opacity active:scale-95"
            >
              {isLast ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
