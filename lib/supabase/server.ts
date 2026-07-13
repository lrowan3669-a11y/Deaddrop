import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Used by API routes that act on behalf of the signed-in caller (e.g.
// starting a Stripe Checkout/Portal session). Configured with the anon key
// but forwards the caller's own access token, so every query still runs
// under their identity and is bound by the same RLS policies as the browser
// client - no elevated privileges here.
export function createUserScopedClient(accessToken: string): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set.");
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let adminClient: SupabaseClient | null = null;

// Used only by the Stripe webhook, which is called directly by Stripe with
// no Supabase user session at all - it needs to update an arbitrary user's
// profile by Stripe customer/subscription id, which requires bypassing RLS.
// Never expose this client or the service role key to anything client-side.
export function createAdminClient(): SupabaseClient {
  if (adminClient) return adminClient;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set.");
  }
  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}
