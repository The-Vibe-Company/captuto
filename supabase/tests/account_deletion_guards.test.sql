BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT no_plan();

INSERT INTO auth.users (id, email, raw_app_meta_data) VALUES
  ('10000000-0000-4000-8000-000000000001', 'deletion-owner@example.test', '{}'),
  ('10000000-0000-4000-8000-000000000002', 'deletion-neighbor@example.test', '{}');
SET LOCAL ROLE service_role;
SELECT lives_ok($$
  INSERT INTO public.tutorials (id, user_id, title, visibility, is_public) VALUES
    ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Original', 'public', true),
    ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Neighbor', 'private', false)
$$, 'active service-role owners can create guides');
INSERT INTO public.tutorials (id, user_id, title, revision_of) VALUES
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Revision', '20000000-0000-4000-8000-000000000001');
INSERT INTO public.sources (id, tutorial_id, order_index) VALUES
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 0);
INSERT INTO public.steps (id, tutorial_id, source_id, order_index) VALUES
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 0);
RESET ROLE;
-- Simulate deletion while an agent request already holds a service-role client.
UPDATE auth.users SET raw_app_meta_data = '{"account_deletion_pending":true}'
  WHERE id = '10000000-0000-4000-8000-000000000001';
SET LOCAL ROLE service_role;
SELECT lives_ok($$
  UPDATE public.tutorials SET visibility = 'private', is_public = false
  WHERE user_id = '10000000-0000-4000-8000-000000000001'
$$, 'cleanup can privatize originals and private revisions');
SELECT throws_ok($$
  UPDATE public.tutorials SET visibility = 'public', is_public = true
  WHERE id = '20000000-0000-4000-8000-000000000001'
$$, '42501', 'Account is unavailable for content changes', 'already-authorized sharing cannot republish a pending owner');
SELECT is((SELECT visibility FROM public.tutorials WHERE id = '20000000-0000-4000-8000-000000000001'), 'private', 'guide remains private after rejected share');
SELECT throws_ok($$
  INSERT INTO public.tutorials (user_id,title) VALUES ('10000000-0000-4000-8000-000000000001','Late guide')
$$, '42501', 'Account is unavailable for content changes', 'pending owner cannot create guides');
SELECT throws_ok($$
  UPDATE public.sources SET screenshot_url = 'late.png' WHERE id = '30000000-0000-4000-8000-000000000001'
$$, '42501', 'Account is unavailable for content changes', 'pending owner cannot change captures');
SELECT throws_ok($$
  UPDATE public.steps SET text_content = 'Late edit' WHERE id = '40000000-0000-4000-8000-000000000001'
$$, '42501', 'Account is unavailable for content changes', 'pending owner cannot edit steps');
SELECT throws_ok($$
  INSERT INTO public.api_tokens (user_id,token) VALUES ('10000000-0000-4000-8000-000000000001','local-test-placeholder')
$$, '42501', 'Account is unavailable for content changes', 'pending owner cannot reconnect an agent');
SELECT throws_ok($$
  INSERT INTO storage.objects (bucket_id,name) VALUES ('screenshots','10000000-0000-4000-8000-000000000001/late.jpg')
$$, '42501', 'Account is unavailable for uploads', 'late service-role uploads cannot recreate files');
SELECT lives_ok($$
  UPDATE public.tutorials SET title = 'Neighbor remains editable' WHERE id = '20000000-0000-4000-8000-000000000002'
$$, 'another owner remains editable');
RESET ROLE;
DELETE FROM auth.users WHERE id = '10000000-0000-4000-8000-000000000001';
SELECT is((SELECT count(*) FROM public.tutorials WHERE user_id = '10000000-0000-4000-8000-000000000001'), 0::bigint, 'original and revision cascade on deletion');
SELECT is((SELECT count(*) FROM public.steps WHERE id = '40000000-0000-4000-8000-000000000001'), 0::bigint, 'steps cascade on deletion');
SELECT is((SELECT count(*) FROM public.sources WHERE id = '30000000-0000-4000-8000-000000000001'), 0::bigint, 'sources cascade on deletion');
SET LOCAL ROLE service_role;
SELECT throws_ok($$
  INSERT INTO public.tutorials (user_id,title) VALUES ('10000000-0000-4000-8000-000000000001','Deleted owner')
$$, '42501', 'Account is unavailable for content changes', 'deleted owner cannot recreate content');
SELECT * FROM finish();
ROLLBACK;
