import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const supabase = getSupabaseAdminClient();
  const { data: pillars } = await supabase
    .from("pillars")
    .select("id, slug, label, color, icon_key")
    .eq("user_id", session.user.id)
    .order("position");

  return (
    <SettingsClient
      name={session.user.name ?? ""}
      email={session.user.email ?? ""}
      avatarUrl={session.user.image ?? null}
      pillars={pillars ?? []}
    />
  );
}
