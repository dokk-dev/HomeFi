import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isNotionConfigured } from "@/lib/integrations/notion/client";
import { DEFAULT_SYNC_SETTINGS } from "@/lib/integrations/notion/sync";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth/signin");

  const supabase = getSupabaseAdminClient();

  const [{ data: pillars }, { data: profile }] = await Promise.all([
    supabase
      .from("pillars")
      .select("id, slug, label, color, icon_key, competency_areas")
      .eq("user_id", session.user.id)
      .order("position"),
    supabase
      .from("profiles")
      .select(
        "notion_workspace_name, notion_last_synced_at, notion_sync_settings, notion_access_token",
      )
      .eq("id", session.user.id)
      .single(),
  ]);

  const notion = {
    configured: isNotionConfigured(),
    connected: Boolean(profile?.notion_access_token),
    workspaceName: profile?.notion_workspace_name ?? null,
    lastSyncedAt: profile?.notion_last_synced_at ?? null,
    settings: {
      ...DEFAULT_SYNC_SETTINGS,
      ...((profile?.notion_sync_settings as Record<string, boolean> | null) ?? {}),
    },
  };

  return (
    <SettingsClient
      name={session.user.name ?? ""}
      email={session.user.email ?? ""}
      avatarUrl={session.user.image ?? null}
      pillars={pillars ?? []}
      notion={notion}
    />
  );
}
