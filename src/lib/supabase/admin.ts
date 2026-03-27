/**
 * Service-role Supabase client.
 * ONLY used for seeding/migrations — never in API routes or components.
 * This bypasses RLS. Keep SUPABASE_SERVICE_ROLE_KEY out of NEXT_PUBLIC_.
 */
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("Admin client must only be used server-side");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
