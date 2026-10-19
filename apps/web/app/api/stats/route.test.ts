import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
import { createAdminClient } from '@/lib/supabase/admin';
import { GET } from './route';

const rpc = vi.fn();
const stats = { total_users: 12, new_users_1d: 1, new_users_7d: 4, active_users_1d: 3, active_users_7d: 8 };
const request = (authorization?: string) => new Request('http://localhost/api/stats', {
  headers: authorization ? { authorization } : {},
});
beforeEach(() => {
  vi.stubEnv('STATS_TOKEN', 'stats-test-placeholder');
  vi.mocked(createAdminClient).mockReset();
  vi.mocked(createAdminClient).mockReturnValue({ rpc } as never);
  rpc.mockReset().mockResolvedValue({ data: stats, error: null });
});
afterEach(() => vi.unstubAllEnvs());

it.each([undefined, 'Bearer wrong', 'Bearer stats-test-placeholdeX', 'Basic stats-test-placeholder', 'Bearer ééé'])('rejects invalid authorization %s before querying the database', async (authorization) => {
  const response = await GET(request(authorization));
  expect(response.status).toBe(401);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ error: 'Unauthorized' });
  expect(createAdminClient).not.toHaveBeenCalled();
});
it.each([undefined, ''])('fails closed when STATS_TOKEN is unconfigured (%s)', async (token) => {
  vi.stubEnv('STATS_TOKEN', token);
  const response = await GET(request('Bearer stats-test-placeholder'));
  expect(response.status).toBe(401);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(createAdminClient).not.toHaveBeenCalled();
});
it('returns exactly the five numeric metrics when authorized', async () => {
  const response = await GET(request('Bearer stats-test-placeholder'));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual(stats);
  expect(rpc).toHaveBeenCalledExactlyOnceWith('get_usage_stats');
});
it.each([
  { data: null, error: { message: 'database detail' } },
  { data: null, error: null },
  { data: { ...stats, total_users: '12' }, error: null },
  { data: { ...stats, extra: 1 }, error: null },
  { data: { ...stats, total_users: -1 }, error: null },
])('fails without exposing database errors or malformed counts', async (result) => {
  rpc.mockResolvedValue(result);
  const response = await GET(request('Bearer stats-test-placeholder'));
  expect(response.status).toBe(503);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ error: 'Stats unavailable' });
});
it('handles unexpected database/client failures without exposing details', async () => {
  vi.mocked(createAdminClient).mockImplementation(() => { throw new Error('private configuration'); });
  const response = await GET(request('Bearer stats-test-placeholder'));
  expect(response.status).toBe(503);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ error: 'Stats unavailable' });
});
