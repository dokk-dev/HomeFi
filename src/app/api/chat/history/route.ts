import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { searchParams } = new URL(req.url);
  const pillarSlug = searchParams.get("pillarSlug");

  if (!pillarSlug) {
    return new Response(JSON.stringify({ error: "Missing pillarSlug" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = getSupabaseAdminClient();
  const { data: messages, error } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("user_id", session.user.id)
    .eq("pillar_slug", pillarSlug)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[CHAT HISTORY]", error);
    return new Response(JSON.stringify({ error: "Failed to load history" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ messages: messages ?? [] }), {
    headers: { "Content-Type": "application/json" },
  });
}
