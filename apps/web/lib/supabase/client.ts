import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { supabaseConfig } from "./config";

export function createClient() {
  return createBrowserClient<Database>(
    supabaseConfig.url,
    supabaseConfig.anonKey
  );
}
