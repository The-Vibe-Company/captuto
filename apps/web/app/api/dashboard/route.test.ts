import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
import { createClient } from '@/lib/supabase/server';
import { GET } from './route';
const rpc = vi.fn();
beforeEach(() => {
  rpc.mockReset();
  vi.mocked(createClient).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) }, rpc } as never);
});
it('requires the authenticated owner session', async () => {
  vi.mocked(createClient).mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) } } as never);
  expect((await GET(new Request('http://localhost/api/dashboard'))).status).toBe(401);
  expect(rpc).not.toHaveBeenCalled();
});
it('bounds pagination and rejects invalid filter input', async () => {
  for (const query of ['page=-1', 'page=1.2', 'sort=sql', 'search='+'x'.repeat(201)]) {
    expect((await GET(new Request('http://localhost/api/dashboard?'+query))).status).toBe(400);
  }
  expect(rpc).not.toHaveBeenCalled();
});
it('queries only the requested page without signing or loading screenshot objects', async () => {
  rpc.mockResolvedValue({ data: { tutorials: [], counts: { all: 60, shared: 0, draft: 60, processing: 0 }, total: 60 }, error: null });
  const r = await GET(new Request('http://localhost/api/dashboard?page=2&search=Companion&sort=title&tab=draft'));
  expect(r.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith('get_dashboard_page', { p_limit: 25, p_offset: 25, p_search: 'Companion', p_sort: 'title', p_tab: 'draft' });
  expect(await r.json()).toMatchObject({ page: 2, pageSize: 25, total: 60 });
  expect(r.headers.get('cache-control')).toContain('no-store');
});
it('reports query failure without hiding it as an empty library', async () => {
  rpc.mockResolvedValue({ data: null, error: { message: 'offline' } });
  expect((await GET(new Request('http://localhost/api/dashboard'))).status).toBe(500);
});
