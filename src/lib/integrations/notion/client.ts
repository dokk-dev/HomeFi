/**
 * Notion OAuth + SDK helpers.
 * Server-side only — never import from client components.
 */
import { Client } from "@notionhq/client";

export function getNotionClient(token: string): Client {
  return new Client({ auth: token });
}

export function notionAuthorizeUrl(state: string): string {
  const clientId = process.env.NOTION_CLIENT_ID;
  const redirect = process.env.NOTION_REDIRECT_URI;
  if (!clientId || !redirect) {
    throw new Error(
      "Notion OAuth is not configured. Set NOTION_CLIENT_ID and NOTION_REDIRECT_URI in .env.local.",
    );
  }
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    owner: "user",
    redirect_uri: redirect,
    state,
  });
  return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
}

export interface NotionTokenResponse {
  access_token: string;
  token_type: "bearer";
  bot_id: string;
  workspace_id: string;
  workspace_name: string | null;
  workspace_icon: string | null;
  owner: { type: string; user?: { id: string } };
  duplicated_template_id?: string | null;
}

export async function exchangeNotionCode(code: string): Promise<NotionTokenResponse> {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirect = process.env.NOTION_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirect) {
    throw new Error("Notion OAuth env vars are missing.");
  }
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirect,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion token exchange failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<NotionTokenResponse>;
}

export function isNotionConfigured(): boolean {
  return Boolean(
    process.env.NOTION_CLIENT_ID &&
    process.env.NOTION_CLIENT_SECRET &&
    process.env.NOTION_REDIRECT_URI,
  );
}
