import { withSession } from "@/lib/api/withSession";
import { exchangeNotionCode } from "@/lib/integrations/notion/client";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export const GET = withSession(async (req, userId) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const cookieStore = cookies();
  const expectedState = cookieStore.get("notion_oauth_state")?.value;
  cookieStore.delete("notion_oauth_state");

  const settingsUrl = new URL("/dashboard/settings", url.origin);
  settingsUrl.searchParams.set("tab", "integrations");

  if (error) {
    settingsUrl.searchParams.set("notion_error", error);
    return Response.redirect(settingsUrl, 302);
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    settingsUrl.searchParams.set("notion_error", "invalid_state");
    return Response.redirect(settingsUrl, 302);
  }

  try {
    const token = await exchangeNotionCode(code);
    const supabase = getSupabaseAdminClient();
    await supabase
      .from("profiles")
      .update({
        notion_access_token: token.access_token,
        notion_workspace_id: token.workspace_id,
        notion_workspace_name: token.workspace_name,
        notion_bot_id: token.bot_id,
        // notion_root_page_id is created lazily on first sync
      })
      .eq("id", userId);
    settingsUrl.searchParams.set("notion_connected", "1");
  } catch (err) {
    settingsUrl.searchParams.set(
      "notion_error",
      err instanceof Error ? err.message : "exchange_failed",
    );
  }

  return Response.redirect(settingsUrl, 302);
});
