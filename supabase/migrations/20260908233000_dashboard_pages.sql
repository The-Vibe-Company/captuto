-- Page metadata before counting steps; dashboard never needs original screenshots.
-- Additive RPC. Old clients retain get_user_dashboard_tutorials unchanged.
CREATE OR REPLACE FUNCTION public.get_dashboard_page(
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT '',
  p_sort text DEFAULT 'recent',
  p_tab text DEFAULT 'all'
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  WITH matching AS MATERIALIZED (
    SELECT t.*,
      CASE WHEN t.visibility IN ('link_only', 'public') THEN 'shared'
           WHEN t.status = 'processing' THEN 'processing' ELSE 'draft' END AS bucket
    FROM tutorials t
    WHERE t.user_id = auth.uid()
      AND (p_search = '' OR strpos(lower(coalesce(t.title, '')), lower(p_search)) > 0)
  ), filtered AS (
    SELECT * FROM matching WHERE p_tab = 'all' OR bucket = p_tab
  ), page AS (
    SELECT * FROM filtered
    ORDER BY
      CASE WHEN p_sort = 'title' THEN lower(title) END ASC,
      CASE WHEN p_sort = 'oldest' THEN created_at END ASC,
      CASE WHEN p_sort NOT IN ('title','oldest') THEN created_at END DESC,
      id ASC
    LIMIT least(greatest(p_limit, 1), 100) OFFSET greatest(p_offset, 0)
  ), numbered AS (
    SELECT p.*, (SELECT count(*) FROM steps s WHERE s.tutorial_id = p.id) AS steps_count
    FROM page p
  )
  SELECT jsonb_build_object(
    'tutorials', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'title', title, 'slug', slug, 'status', status,
      'visibility', coalesce(visibility, 'private'), 'createdAt', created_at,
      'stepsCount', steps_count
    ) ORDER BY
      CASE WHEN p_sort = 'title' THEN lower(title) END ASC,
      CASE WHEN p_sort = 'oldest' THEN created_at END ASC,
      CASE WHEN p_sort NOT IN ('title','oldest') THEN created_at END DESC,
      id ASC) FROM numbered), '[]'::jsonb),
    'total', (SELECT count(*) FROM filtered),
    'counts', (SELECT jsonb_build_object(
      'all', count(*), 'shared', count(*) FILTER (WHERE bucket = 'shared'),
      'draft', count(*) FILTER (WHERE bucket = 'draft'),
      'processing', count(*) FILTER (WHERE bucket = 'processing')
    ) FROM matching)
  );
$$;
REVOKE ALL ON FUNCTION public.get_dashboard_page(integer,integer,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_page(integer,integer,text,text,text) TO authenticated;
