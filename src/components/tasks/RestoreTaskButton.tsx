"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

export function RestoreTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRestore() {
    if (loading) return;
    setLoading(true);
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_complete: false }),
    });
    router.refresh();
  }

  return (
    <button
      onClick={handleRestore}
      disabled={loading}
      title="Restore task"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-outline hover:text-on-surface hover:bg-surface-container border border-outline-variant/20 hover:border-outline-variant/40 transition-all disabled:opacity-40"
    >
      <RotateCcw size={12} />
      {loading ? "Restoring…" : "Restore"}
    </button>
  );
}
