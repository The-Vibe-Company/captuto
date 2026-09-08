-- Local integration check; rolls back every fixture. Requires the dashboard RPC.
BEGIN;
CREATE TEMP TABLE dashboard_check_owner AS SELECT gen_random_uuid() AS id;
INSERT INTO auth.users(id,email) SELECT id,id::text || '@example.invalid' FROM dashboard_check_owner;
INSERT INTO public.tutorials(user_id,title,status,visibility)
SELECT o.id,'Guide ' || lpad(i::text,3,'0'),
 CASE WHEN i % 3 = 0 THEN 'processing' ELSE 'draft' END,
 CASE WHEN i % 4 = 0 THEN 'link_only' ELSE 'private' END
FROM dashboard_check_owner o CROSS JOIN generate_series(1,60) i;
SELECT set_config('request.jwt.claims',json_build_object('sub',(SELECT id FROM dashboard_check_owner))::text,true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE first_page jsonb; second_page jsonb; searched jsonb;
BEGIN
 first_page := public.get_dashboard_page(25,0,'','title','all');
 second_page := public.get_dashboard_page(25,25,'','title','all');
 ASSERT (first_page->>'total')::int=60,'Owner must see exactly its 60 guides';
 ASSERT jsonb_array_length(first_page->'tutorials')=25,'First page must be bounded';
 ASSERT jsonb_array_length(second_page->'tutorials')=25,'Second page must be bounded';
 ASSERT first_page->'tutorials'->0->>'title'='Guide 001','Sort must apply before paging';
 ASSERT second_page->'tutorials'->0->>'title'='Guide 026','Pages must not repeat';
 ASSERT (first_page->'counts'->>'shared')::int=15,'Shared counts take precedence over processing';
 ASSERT (first_page->'counts'->>'processing')::int=15,'Shared processing guides must not double-count';
 ASSERT (first_page->'counts'->>'draft')::int=30,'Draft count must be nonnegative and exclusive';
 searched := public.get_dashboard_page(25,0,'060','recent','all');
 ASSERT (searched->>'total')::int=1,'Search must find titles beyond the first page';
 ASSERT (public.get_dashboard_page(25,0,'%','recent','all')->>'total')::int=0,'Search treats wildcards literally';
 ASSERT jsonb_array_length(public.get_dashboard_page(25,0,'','recent','shared')->'tutorials')=15,'Filter must match its counter';
 PERFORM set_config('request.jwt.claims',json_build_object('sub',gen_random_uuid())::text,true);
 ASSERT (public.get_dashboard_page()->>'total')::int=0,'A different identity must not see owner data';
END $$;
ROLLBACK;
