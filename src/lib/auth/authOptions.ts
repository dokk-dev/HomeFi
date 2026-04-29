import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const PILLAR_SEED = [
  { slug: "learning",  label: "Learning",  description: "Study notes, courses, and knowledge building.", color: "#6366f1", icon_key: "BookOpen",  position: 0 },
  { slug: "projects",  label: "Projects",  description: "Personal projects and side work.",              color: "#ec4899", icon_key: "Rocket",    position: 1 },
  { slug: "career",    label: "Career",    description: "Job search, resume, and professional growth.",  color: "#3b82f6", icon_key: "Briefcase", position: 2 },
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
    async jwt({ token, user, account, trigger }) {
      // Refresh profile data when client calls update() (e.g. after avatar/name change)
      if (trigger === "update" && token.supabaseUserId) {
        const supabase = getSupabaseAdminClient();
        const { data } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("id", token.supabaseUserId as string)
          .single();
        if (data?.display_name) token.name = data.display_name;
        if (data?.avatar_url) token.picture = data.avatar_url;
        return token;
      }

      // Only runs on sign-in (account is present)
      if (account && user) {
        const supabase = getSupabaseAdminClient();
        const email = user.email!;

        // Check if profile already exists
        const { data: existing, error: lookupError } = await supabase
          .from("profiles")
          .select("id, avatar_url")
          .eq("email", email)
          .single();

        if (lookupError && lookupError.code !== "PGRST116") {
          console.error("[AUTH] Profile lookup failed:", lookupError);
        }

        if (existing) {
          // Don't overwrite a custom avatar the user has uploaded
          const hasCustomAvatar = existing.avatar_url && existing.avatar_url !== user.image;
          await supabase
            .from("profiles")
            .update({
              display_name: user.name ?? email.split("@")[0],
              ...(hasCustomAvatar ? {} : { avatar_url: user.image ?? null }),
            })
            .eq("id", existing.id);

          token.supabaseUserId = existing.id;
          if (hasCustomAvatar) token.picture = existing.avatar_url;
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
      if (token.supabaseUserId) session.user.id = token.supabaseUserId as string;
      if (token.name) session.user.name = token.name as string;
      if (token.picture) session.user.image = token.picture as string;
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
