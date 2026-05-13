import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
const originalEnv = process.env;

describe('POST /api/billing/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PRICE_ID;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('requires authentication', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Unauthorized' },
        }),
      },
    });

    const response = await POST();

    expect(response.status).toBe(401);
  });

  it('returns 503 when Stripe is not configured', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'user@example.com' } },
          error: null,
        }),
      },
    });

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toContain('Stripe');
  });
});
