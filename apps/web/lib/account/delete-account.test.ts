import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/stripe/server', () => ({ getStripe: vi.fn() }));
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe/server';
import { deleteAccount, removeOwnerFiles } from './delete-account';

function setup(customer: string | null = null) {
  const events: string[] = [];
  const list = vi.fn().mockResolvedValue({ data: [], error: null });
  const remove = vi.fn().mockResolvedValue({ error: null });
  const deleteUser = vi.fn(async () => { events.push('auth'); return { error: null }; });
  const admin = {
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    auth: { admin: { updateUserById: vi.fn(async () => { events.push('freeze'); return { error: null }; }), deleteUser } },
    from: vi.fn((table: string) => ({
      update: () => ({ eq: async () => { events.push('private'); return { error: null }; } }),
      delete: () => ({ eq: async () => { events.push('tokens'); return { error: null }; } }),
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: customer ? { stripe_customer_id: customer } : null, error: null }) }) }),
    })),
    storage: { from: vi.fn((bucket: string) => { events.push(bucket); return { list, remove }; }) },
  };
  vi.mocked(createAdminClient).mockReturnValue(admin as never);
  const stripe = {
    checkout: { sessions: { list: vi.fn(async function* () { yield { id: 'checkout-open' }; }), expire: vi.fn().mockResolvedValue({}) } },
    subscriptions: { list: vi.fn(async function* () { yield { id: 'active', status: 'active' }; yield { id: 'unpaid', status: 'unpaid' }; yield { id: 'old', status: 'canceled' }; }), cancel: vi.fn(async () => { events.push('cancel'); return {}; }) },
  };
  vi.mocked(getStripe).mockReturnValue(stripe as never);
  return { admin, stripe, list, remove, events, deleteUser };
}

beforeEach(() => vi.clearAllMocks());
describe('deleteAccount', () => {
  it('requires the database guard before mutating an account', async () => {
    const { admin } = setup(); admin.rpc.mockResolvedValue({ data: false, error: { message: 'missing' } } as never);
    await expect(deleteAccount('owner')).rejects.toThrow();
    expect(admin.auth.admin.updateUserById).not.toHaveBeenCalled();
  });
  it('freezes writes, cancels subscriptions and cleans all buckets before deleting auth', async () => {
    const { admin, stripe, events, deleteUser } = setup('customer');
    await deleteAccount('owner');
    expect(events[0]).toBe('freeze');
    expect(stripe.checkout.sessions.expire).toHaveBeenCalledWith('checkout-open');
    expect(stripe.subscriptions.cancel).toHaveBeenCalledTimes(2);
    expect(events.indexOf('cancel')).toBeLessThan(events.indexOf('screenshots'));
    expect(admin.storage.from.mock.calls.map(call => call[0])).toEqual(['screenshots', 'recordings', 'screenshots-flattened']);
    expect(events.at(-1)).toBe('auth'); expect(deleteUser).toHaveBeenCalledWith('owner');
  });
  it('does not delete auth or files if subscription cancellation fails', async () => {
    const { stripe, admin, deleteUser } = setup('customer');
    stripe.subscriptions.cancel.mockRejectedValue(new Error('Stripe unavailable'));
    await expect(deleteAccount('owner')).rejects.toThrow();
    expect(admin.storage.from).not.toHaveBeenCalled(); expect(deleteUser).not.toHaveBeenCalled();
  });
  it('retains auth for retry when storage removal fails', async () => {
    const { list, remove, deleteUser } = setup();
    list.mockResolvedValue({ data: [{ id: 'file', name: 'capture.jpg' }], error: null });
    remove.mockResolvedValue({ error: { message: 'offline' } } as never);
    await expect(deleteAccount('owner')).rejects.toThrow(); expect(deleteUser).not.toHaveBeenCalled();
  });
  it('walks nested folders and relists offset zero after deleting each page', async () => {
    const { admin, list, remove } = setup();
    list.mockResolvedValueOnce({ data: [{ id: null, name: 'guide' }], error: null })
      .mockResolvedValueOnce({ data: [{ id: 'one', name: 'one.jpg' }], error: null })
      .mockResolvedValueOnce({ data: [{ id: 'two', name: 'two.jpg' }], error: null })
      .mockResolvedValue({ data: [], error: null });
    await removeOwnerFiles(admin as never, 'screenshots', 'owner');
    expect(remove.mock.calls).toEqual([[['owner/guide/one.jpg']], [['owner/guide/two.jpg']]]);
    expect(list.mock.calls.every(call => call[1].offset === 0)).toBe(true);
  });
});
