import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

let cached: ReturnType<typeof createSupabaseClient<Database>> | null = null;

/**
 * Service-role client. Bypasses RLS — only use server-side, in trusted code.
 * Required for the flatten pipeline: it needs to read original screenshots
 * (whose anon read access will be revoked) and write to the flattened bucket.
 */
export function createAdminClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars'
    );
  }

  cached = createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
