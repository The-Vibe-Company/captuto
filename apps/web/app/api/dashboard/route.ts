import { createClient } from '@/lib/supabase/server';
import { dashboardQuery, DASHBOARD_PAGE_SIZE } from '@/lib/dashboard/query';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = dashboardQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return Response.json({ error: 'Invalid dashboard filters' }, { status: 400 });
  const { page, search, tab, sort } = parsed.data;
  const { data, error } = await supabase.rpc('get_dashboard_page', {
    p_limit: DASHBOARD_PAGE_SIZE, p_offset: (page - 1) * DASHBOARD_PAGE_SIZE,
    p_search: search, p_sort: sort, p_tab: tab,
  });
  if (error || !data) return Response.json({ error: 'Could not load your guides. Try again.' }, { status: 500 });
  return Response.json({ ...(data as Record<string, unknown>), page, pageSize: DASHBOARD_PAGE_SIZE }, { headers: { 'Cache-Control': 'private, no-store' } });
}
