import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Brain, Target, Bot, Clock } from "lucide-react";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-surface flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-5 border-b border-outline-variant/10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Brain size={14} color="white" />
          </div>
          <span className="text-base font-headline font-bold text-on-surface tracking-tight">
            Meridian
          </span>
        </div>
        <Link
          href="/auth/signin"
          className="text-sm font-headline font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
        >
          Sign in →
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 md:py-32">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold uppercase tracking-widest mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Personal Learning OS
        </div>

        <h1 className="text-4xl md:text-7xl font-extrabold font-headline tracking-tighter text-on-surface max-w-3xl mb-6 leading-[0.95]">
          Master everything.
          <br />
          <span className="text-primary">Track what matters.</span>
        </h1>

        <p className="text-on-surface-variant text-lg md:text-xl max-w-xl mb-10 leading-relaxed">
          Organize your learning into pillars, get AI coaching, run focus sessions,
          and build momentum — all in one place.
        </p>

        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-headline font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-lg"
          style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}
        >
          Get started
          <span className="opacity-70">→</span>
        </Link>

        <p className="text-[11px] text-outline mt-4">
          Sign in with GitHub or Google · Free
        </p>
      </section>

      {/* Feature cards */}
      <section className="px-6 md:px-12 pb-24 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Target,
              title: "Study Pillars",
              desc: "Organize learning into focused domains. Set tasks, track progress, and keep streaks alive.",
            },
            {
              icon: Bot,
              title: "AI Tutor",
              desc: "Get personalized coaching, take knowledge tests, and watch mastery grow over time.",
            },
            {
              icon: Clock,
              title: "Focus Sessions",
              desc: "Run timed study sprints with built-in focus music and weekly momentum tracking.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-6"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <Icon size={18} className="text-primary" />
              </div>
              <h3 className="text-sm font-headline font-bold text-on-surface mb-2">{title}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-outline-variant/10 px-6 py-5 flex items-center justify-center">
        <span className="text-[11px] text-outline font-label">
          Built with Next.js + Supabase
        </span>
      </footer>
    </main>
  );
}
