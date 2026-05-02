"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2, RefreshCw, Sparkles, Save, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import type { CompetencyArea } from "@/lib/types";

interface Props {
  pillarId: string;
  pillarLabel: string;
  pillarColor: string;
  initial: CompetencyArea[];
  onClose: () => void;
  onSaved: (competencies: CompetencyArea[]) => void;
}

export function CompetencyEditor({
  pillarId,
  pillarLabel,
  pillarColor,
  initial,
  onClose,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const [competencies, setCompetencies] = useState<CompetencyArea[]>(initial);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate on open if pillar has no rubric yet
  useEffect(() => {
    if (initial.length === 0) {
      void generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/pillars/${pillarId}/competencies`, { method: "POST" });
      const data = (await res.json()) as { competencies?: CompetencyArea[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to generate rubric");
      setCompetencies(data.competencies ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  }

  function updateAt(index: number, patch: Partial<CompetencyArea>) {
    setCompetencies((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    );
  }

  function removeAt(index: number) {
    setCompetencies((prev) => prev.filter((_, i) => i !== index));
  }

  function addBlank() {
    if (competencies.length >= 7) {
      toast("Max 7 competencies");
      return;
    }
    setCompetencies((prev) => [
      ...prev,
      { name: "", description: "", weight: 5, target_skills: [""] },
    ]);
  }

  async function handleSave() {
    // Validate each competency
    for (let i = 0; i < competencies.length; i++) {
      const c = competencies[i];
      if (!c.name.trim()) return setError(`Competency ${i + 1}: name required`);
      if (!c.description.trim()) return setError(`Competency ${i + 1}: description required`);
      if (c.target_skills.filter((s) => s.trim()).length === 0)
        return setError(`Competency ${i + 1}: at least one target skill required`);
    }
    if (competencies.length < 3) return setError("At least 3 competencies required");

    setSaving(true);
    setError(null);
    try {
      // Strip empty skills before save
      const cleaned = competencies.map((c) => ({
        ...c,
        name: c.name.trim(),
        description: c.description.trim(),
        target_skills: c.target_skills.map((s) => s.trim()).filter(Boolean),
      }));

      const res = await fetch(`/api/pillars/${pillarId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competency_areas: cleaned }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Failed to save");
      }
      onSaved(cleaned);
      toast("Rubric saved");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-container rounded-2xl border border-outline-variant/20 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-outline-variant/10">
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
                Mastery Rubric
              </span>
            </div>
            <h2 className="text-xl font-headline font-bold text-on-surface">
              {pillarLabel}
            </h2>
            <p className="text-xs text-outline mt-1">
              Define what mastery looks like for this pillar. Tests are generated against these competencies.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">
              {error}
            </div>
          )}

          {generating && competencies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={32} className="animate-spin" style={{ color: pillarColor }} />
              <p className="text-sm text-on-surface-variant">
                Generating rubric for <span className="font-bold">{pillarLabel}</span>…
              </p>
              <p className="text-xs text-outline">This takes a few seconds.</p>
            </div>
          ) : (
            <>
              {competencies.map((c, i) => (
                <div
                  key={i}
                  className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/10 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => updateAt(i, { name: e.target.value })}
                      placeholder="Competency name"
                      className="flex-1 bg-surface-container rounded-lg px-3 py-2 text-sm font-bold text-on-surface border border-outline-variant/20 focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                    <button
                      onClick={() => removeAt(i)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-outline hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                      title="Remove competency"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <textarea
                    value={c.description}
                    onChange={(e) => updateAt(i, { description: e.target.value })}
                    placeholder="What does mastery of this competency look like in practice?"
                    rows={2}
                    className="w-full bg-surface-container rounded-lg px-3 py-2 text-xs text-on-surface border border-outline-variant/20 focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
                  />

                  {/* Weight slider */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-outline w-16">
                      Weight
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={c.weight}
                      onChange={(e) => updateAt(i, { weight: parseInt(e.target.value, 10) })}
                      className="flex-1 accent-current"
                      style={{ color: pillarColor }}
                    />
                    <span
                      className="text-xs font-bold w-6 text-right"
                      style={{ color: pillarColor }}
                    >
                      {c.weight}
                    </span>
                  </div>

                  {/* Target skills */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-outline mb-1.5">
                      Target Skills
                    </p>
                    <div className="space-y-1.5">
                      {c.target_skills.map((skill, si) => (
                        <div key={si} className="flex gap-1.5">
                          <input
                            type="text"
                            value={skill}
                            onChange={(e) => {
                              const next = [...c.target_skills];
                              next[si] = e.target.value;
                              updateAt(i, { target_skills: next });
                            }}
                            placeholder="e.g. Diagnose a stack overflow in production"
                            className="flex-1 bg-surface-container rounded-lg px-3 py-1.5 text-xs text-on-surface border border-outline-variant/20 focus:outline-none focus:ring-1 focus:ring-primary/40"
                          />
                          <button
                            onClick={() => {
                              const next = c.target_skills.filter((_, j) => j !== si);
                              updateAt(i, { target_skills: next.length ? next : [""] });
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-outline hover:text-red-400 transition-colors flex-shrink-0"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {c.target_skills.length < 8 && (
                        <button
                          onClick={() =>
                            updateAt(i, { target_skills: [...c.target_skills, ""] })
                          }
                          className="text-[10px] font-bold uppercase tracking-widest text-outline hover:text-on-surface flex items-center gap-1 transition-colors"
                        >
                          <Plus size={10} />
                          Add skill
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Add competency */}
              {competencies.length < 7 && !generating && (
                <button
                  onClick={addBlank}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-outline-variant/20 text-outline hover:text-on-surface hover:border-outline-variant/40 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Plus size={14} />
                  Add competency
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-outline-variant/10">
          <button
            onClick={generate}
            disabled={generating || saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-outline hover:text-on-surface hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {generating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : competencies.length > 0 ? (
              <RefreshCw size={12} />
            ) : (
              <Sparkles size={12} />
            )}
            {competencies.length > 0 ? "Regenerate with AI" : "Generate with AI"}
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || generating || competencies.length < 3}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-on-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ backgroundColor: pillarColor }}
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {saving ? "Saving…" : "Save rubric"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
