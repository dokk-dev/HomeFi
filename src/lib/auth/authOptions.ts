import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const PILLAR_SEED = [
  { slug: "cs-ai",      label: "CS / AI Coursework",     description: "Algorithms, ML, systems, and research.",         color: "#6366f1", icon_key: "cs",      position: 0 },
  { slug: "music-tech", label: "Music Tech / Audio Dev",  description: "DAW scripting, audio DSP, Max/MSP, Ableton.",    color: "#ec4899", icon_key: "music",   position: 1 },
  { slug: "russian",    label: "Russian Studies",          description: "Grammar, vocabulary, reading, listening.",        color: "#f59e0b", icon_key: "russian", position: 2 },
  { slug: "hebrew",     label: "Hebrew Studies",           description: "Aleph-bet, vocabulary, scripture reading.",       color: "#10b981", icon_key: "hebrew",  position: 3 },
  { slug: "career",     label: "Career / Applications",   description: "Job apps, resume, networking, portfolio.",        color: "#3b82f6", icon_key: "career",  position: 4 },
];

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 365 * 24 * 60 * 60, // 1 year — persists until manual sign-out
    updateAge: 24 * 60 * 60,    // refresh token once per day
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Only runs on sign-in (account is present)
      if (account && user) {
        const supabase = getSupabaseAdminClient();
        const email = user.email!;

        // Check if profile already exists
        const { data: existing, error: lookupError } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .single();

        if (lookupError && lookupError.code !== "PGRST116") {
          // PGRST116 = no rows found (expected for new users)
          console.error("[AUTH] Profile lookup failed:", lookupError);
        }

        if (existing) {
          await supabase
            .from("profiles")
            .update({
              display_name: user.name ?? email.split("@")[0],
              avatar_url: user.image ?? null,
            })
            .eq("id", existing.id);

          token.supabaseUserId = existing.id;
        } else {
          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              email,
              display_name: user.name ?? email.split("@")[0],
              avatar_url: user.image ?? null,
            })
            .select("id")
            .single();

          if (insertError) {
            console.error("[AUTH] Profile insert failed:", insertError);
          }

          if (newProfile) {
            token.supabaseUserId = newProfile.id;

            const { error: pillarError } = await supabase.from("pillars").insert(
              PILLAR_SEED.map((p) => ({ ...p, user_id: newProfile.id }))
            );
            if (pillarError) {
              console.error("[AUTH] Pillar seed failed:", pillarError);
            }
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.supabaseUserId) {
        session.user.id = token.supabaseUserId as string;
      }
      return session;
    },
  },
};

// Extend next-auth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    supabaseUserId?: string;
  }
}
