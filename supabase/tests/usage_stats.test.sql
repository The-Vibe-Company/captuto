BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();
-- Isolate aggregates from any local seed users; everything rolls back.
DELETE FROM auth.users;
SELECT is(public.get_usage_stats(), '{"total_users":0,"new_users_1d":0,"new_users_7d":0,"active_users_1d":0,"active_users_7d":0}'::jsonb, 'empty database returns exactly five numeric zeros');
INSERT INTO auth.users (id, created_at, last_sign_in_at) VALUES
 ('10000000-0000-4000-8000-000000000001', now() - interval '24 hours', now() - interval '24 hours'),
 ('10000000-0000-4000-8000-000000000002', now() - interval '168 hours', now() - interval '168 hours'),
 ('10000000-0000-4000-8000-000000000003', now() - interval '200 hours', NULL),
 ('10000000-0000-4000-8000-000000000004', now() - interval '24 hours 1 second', now() - interval '168 hours 1 second'),
 ('10000000-0000-4000-8000-000000000005', now() - interval '168 hours 1 second', NULL);
INSERT INTO public.api_tokens (user_id, token, last_used_at) VALUES
 ('10000000-0000-4000-8000-000000000003', 'stats-db-test-a', now() - interval '1 hour'),
 ('10000000-0000-4000-8000-000000000003', 'stats-db-test-b', now() - interval '2 hours'),
 ('10000000-0000-4000-8000-000000000001', 'stats-db-test-c', now() - interval '1 hour');
SET LOCAL timezone = 'Pacific/Honolulu';
SET LOCAL ROLE service_role;
SELECT is(public.get_usage_stats(), '{"total_users":5,"new_users_1d":1,"new_users_7d":3,"active_users_1d":2,"active_users_7d":3}'::jsonb, 'inclusive rolling UTC windows count distinct users across sign-ins and multiple tokens');
RESET ROLE;
SELECT ok(NOT has_function_privilege('anon', 'public.get_usage_stats()', 'EXECUTE'), 'anon cannot read aggregates');
SELECT ok(NOT has_function_privilege('authenticated', 'public.get_usage_stats()', 'EXECUTE'), 'authenticated cannot read aggregates');
SELECT ok(has_function_privilege('service_role', 'public.get_usage_stats()', 'EXECUTE'), 'service_role can read aggregates');
SELECT * FROM finish();
ROLLBACK;
