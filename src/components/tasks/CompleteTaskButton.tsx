"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";

interface Props {
  taskId: string;
  color: string;
}

export function CompleteTaskButton({ taskId, color }: Props) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleComplete() {
    if (loading || done) return;
    setLoading(true);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_complete: true }),
      });
      setDone(true);
      // Brief pause so the user sees the success state, then refresh
      setTimeout(() => router.refresh(), 600);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleComplete}
      disabled={loading || done}
      className="mt-4 inline-flex items-center gap-2 px-6 py-2 text-white text-xs font-headline font-bold rounded-full transition-all hover:opacity-90 disabled:cursor-default"
      style={{
        backgroundColor: done ? "#22c55e" : color,
        boxShadow: `0 0 20px ${done ? "#22c55e" : color}40`,
      }}
    >
      {done ? (
        <>
          <CheckCircle size={14} />
          Done!
        </>
      ) : loading ? (
        "Saving…"
      ) : (
        "Complete Task"
      )}
    </button>
  );
}
