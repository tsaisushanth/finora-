import "server-only";

import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { getPublicEnv, getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

let adminClient: ReturnType<typeof createSupabaseAdmin<Database>> | null = null;

/**
 * Service-role Supabase client. Server-only — never import from client code.
 * Used for storage / admin tasks that need to bypass RLS deliberately.
 */
export function getAdminClient() {
  if (!adminClient) {
    const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
    const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is missing. Add it to the server-side environment (.env.local).",
      );
    }
    adminClient = createSupabaseAdmin<Database>(
      NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }
  return adminClient;
}