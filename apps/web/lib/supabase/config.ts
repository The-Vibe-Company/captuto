export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
};

// Validate config
if (!supabaseConfig.url || !supabaseConfig.anonKey) {
  console.error('[v0] Supabase config missing:', {
    hasUrl: !!supabaseConfig.url,
    hasKey: !!supabaseConfig.anonKey,
  });
}
