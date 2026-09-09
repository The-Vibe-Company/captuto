import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/stripe/server', () => ({ getStripe: vi.fn(), getStripeWebhookSecret: () => 'test-secret' }));
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe/server';
import { POST } from './route';
const getUserById = vi.fn();
const upsert = vi.fn();
const cancel = vi.fn();
const subscription = { id: 'sub-test', customer: 'cus-test', status: 'active', metadata: { supabase_user_id: 'owner' }, items: { data: [] } };
beforeEach(() => {
  vi.clearAllMocks();
  getUserById.mockResolvedValue({ data: { user: { id: 'owner', app_metadata: {} } }, error: null });
  upsert.mockResolvedValue({ error: null }); cancel.mockResolvedValue({});
  vi.mocked(createAdminClient).mockReturnValue({ auth: { admin: { getUserById } }, from: () => ({ upsert }) } as never);
  vi.mocked(getStripe).mockReturnValue({ webhooks: { constructEvent: () => ({ type: 'customer.subscription.created', data: { object: subscription } }) }, subscriptions: { cancel } } as never);
});
const request = () => new Request('https://captuto.test/api/billing/webhook', { method: 'POST', headers: { 'stripe-signature': 'test' }, body: '{}' });
it('cancels a late checkout for an account being deleted', async () => {
  getUserById.mockResolvedValue({ data: { user: { app_metadata: { account_deletion_pending: true } } }, error: null });
  expect((await POST(request())).status).toBe(200);
  expect(cancel).toHaveBeenCalledWith('sub-test', { invoice_now: false, prorate: false }); expect(upsert).not.toHaveBeenCalled();
});
it('does not recreate a billing mapping after auth deletion', async () => {
  getUserById.mockResolvedValue({ data: { user: null }, error: { status: 404 } });
  expect((await POST(request())).status).toBe(200); expect(cancel).toHaveBeenCalled(); expect(upsert).not.toHaveBeenCalled();
});
it('retries on an auth outage rather than cancelling a valid subscription', async () => {
  getUserById.mockResolvedValue({ data: { user: null }, error: { status: 503 } });
  expect((await POST(request())).status).toBe(500); expect(cancel).not.toHaveBeenCalled();
});
it('keeps normal billing updates for active accounts', async () => {
  expect((await POST(request())).status).toBe(200); expect(upsert).toHaveBeenCalled(); expect(cancel).not.toHaveBeenCalled();
});
