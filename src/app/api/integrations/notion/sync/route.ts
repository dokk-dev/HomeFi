import { withSession } from "@/lib/api/withSession";
import { syncUser } from "@/lib/integrations/notion/sync";

export const POST = withSession(async (_req, userId) => {
  const result = await syncUser(userId);
  return Response.json(result, { status: result.ok ? 200 : 500 });
});
