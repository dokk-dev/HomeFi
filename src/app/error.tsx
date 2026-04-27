"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Root error]", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-[#0f0f10] text-white min-h-screen flex items-center justify-center p-10">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            {error.message || "An unexpected error occurred."}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-500 hover:opacity-90 transition-opacity"
            >
              Try again
            </button>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-400 border border-zinc-700 hover:text-white transition-colors"
            >
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
