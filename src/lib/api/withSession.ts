import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";

type RouteHandler = (req: Request, userId: string) => Promise<Response>;

/**
 * Wraps an API route handler with session authentication.
 * Returns 401 if no valid session exists.
 */
export function withSession(handler: RouteHandler) {
  return async (req: Request): Promise<Response> => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(req, session.user.id);
  };
}

/**
 * Variant for dynamic route handlers that receive context params.
 */
type RouteHandlerWithParams<T> = (
  req: Request,
  context: { params: T },
  userId: string
) => Promise<Response>;

export function withSessionAndParams<T>(handler: RouteHandlerWithParams<T>) {
  return async (req: Request, context: { params: T }): Promise<Response> => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(req, context, session.user.id);
  };
}
