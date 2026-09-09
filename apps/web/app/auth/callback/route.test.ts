import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
import { createClient } from '@/lib/supabase/server';
import { GET } from './route';
const exchange = vi.fn();
beforeEach(() => {
  vi.clearAllMocks(); exchange.mockResolvedValue({ error: null });
  vi.mocked(createClient).mockResolvedValue({ auth: { exchangeCodeForSession: exchange } } as never);
});
it('sends recovery sessions to the new password form', async () => {
  const result = await GET(new Request('https://captuto.test/auth/callback?code=test-code&next=/reset-password'));
  expect(result.headers.get('location')).toBe('https://captuto.test/reset-password');
  expect(exchange).toHaveBeenCalledWith('test-code');
});
it('provides a recovery action for expired reset links', async () => {
  exchange.mockResolvedValue({ error: { message: 'expired' } });
  const result = await GET(new Request('https://captuto.test/auth/callback?code=expired&next=/reset-password'));
  expect(result.headers.get('location')).toBe('https://captuto.test/reset-password?error=invalid_link');
});
it('does not redirect an auth callback outside the app', async () => {
  const result = await GET(new Request('https://captuto.test/auth/callback?code=test&next=https://other.test'));
  expect(result.headers.get('location')).toBe('https://captuto.test/dashboard');
});
