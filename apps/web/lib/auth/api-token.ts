import { createClient } from "@supabase/supabase-js";

/**
 * Validate an API token from the Authorization header.
 * Returns the user_id if the token is valid, null otherwise.
 * Uses the validate_api_token RPC function (SECURITY DEFINER)
 * so we don't need the service role key.
 */
export async function validateApiToken(
  request: Request
): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  if (!token || token.length < 32) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error("[api-token] Missing Supabase env vars");
    return null;
  }

  const supabase = createClient(supabaseUrl, anonKey);

  const { data, error } = await supabase.rpc("validate_api_token", {
    token_value: token,
  });

  if (error || !data) {
    return null;
  }

  return data as string;
}

/**
 * Generate a cryptographically random API token (64-char hex).
 */
export function generateApiToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
