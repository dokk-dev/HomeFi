import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { AiTutorClient } from "./AiTutorClient";

export default async function AiTutorPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const supabase = getSupabaseAdminClient();

  const { data: pillars } = await supabase
    .from("pillars")
    .select("id, slug, label, color, icon_key, mastery")
    .eq("user_id", session.user.id)
    .order("position");

  const enrichedPillars = (pillars ?? []).map((p) => ({
    ...p,
    mastery: p.mastery ?? 0,
  }));

  const displayName = session.user.name ?? "Architect";

  return (
    <div className="flex flex-1 min-h-0">
      <AiTutorClient pillars={enrichedPillars} displayName={displayName} />
    </div>
  );
}
