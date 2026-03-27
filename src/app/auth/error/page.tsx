"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "There is a problem with the server configuration. Please contact support.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The sign-in link is no longer valid. It may have already been used.",
  Default: "An error occurred during sign in. Please try again.",
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") ?? "Default";
  const message = ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default;

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">Authentication Error</h1>
          <p className="mt-2 text-sm text-zinc-500">{message}</p>
        </div>
        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  );
}
