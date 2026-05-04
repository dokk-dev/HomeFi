import { withSession } from "@/lib/api/withSession";
import { notionAuthorizeUrl, isNotionConfigured } from "@/lib/integrations/notion/client";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const GET = withSession(async () => {
  if (!isNotionConfigured()) {
    return Response.json(
      { error: "Notion OAuth is not configured. Re-run setup to add Notion credentials." },
      { status: 400 },
    );
  }

  const state = randomBytes(24).toString("hex");
  cookies().set("notion_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return Response.redirect(notionAuthorizeUrl(state), 302);
});
