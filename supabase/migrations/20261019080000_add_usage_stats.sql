-- Each auth.users row is one user; account deletion hard-deletes this row.
-- Sign-ins and successful API-token usage are the available activity signals.
-- Existing browser sessions without a fresh sign-in are not tracked here.
CREATE OR REPLACE FUNCTION public.get_usage_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH activity AS (
    SELECT user_id, max(last_used_at) AS last_used_at
    FROM public.api_tokens GROUP BY user_id
  ), users_with_activity AS (
    SELECT u.created_at, greatest(u.last_sign_in_at, a.last_used_at) AS last_active_at
    FROM auth.users u LEFT JOIN activity a ON a.user_id = u.id
  )
  SELECT jsonb_build_object(
    'total_users', count(*),
    'new_users_1d', count(*) FILTER (WHERE created_at >= now() - interval '24 hours' AND created_at <= now()),
    'new_users_7d', count(*) FILTER (WHERE created_at >= now() - interval '168 hours' AND created_at <= now()),
    'active_users_1d', count(*) FILTER (WHERE last_active_at >= now() - interval '24 hours' AND last_active_at <= now()),
    'active_users_7d', count(*) FILTER (WHERE last_active_at >= now() - interval '168 hours' AND last_active_at <= now())
  ) FROM users_with_activity;
$$;
REVOKE ALL ON FUNCTION public.get_usage_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_usage_stats() TO service_role;
