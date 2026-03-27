import { SignInButtons } from "./SignInButtons";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            My<span className="text-indigo-400">Fi</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Your personal productivity OS
          </p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-white">Sign in or create account</h2>
            <p className="text-xs text-zinc-500 mt-1">New users get an account created automatically.</p>
          </div>
          <SignInButtons />
        </div>

        <p className="text-center text-xs text-zinc-700">
          Only you can see your data — secured with session checks and row-level policies.
        </p>
      </div>
    </main>
  );
}
