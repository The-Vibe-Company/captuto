import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/account/delete-account', () => ({ deleteAccount: vi.fn() }));
import { createClient } from '@/lib/supabase/server';
import { createClient as createVerifier } from '@supabase/supabase-js';
import { deleteAccount } from '@/lib/account/delete-account';
import { DELETE } from './route';
const user = { id: 'owner', email: 'owner@example.test', app_metadata: {} };
const signIn = vi.fn();
const getUser = vi.fn();
const signOut = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user }, error: null });
  signIn.mockResolvedValue({ data: { user }, error: null });
  signOut.mockResolvedValue({ error: null });
  vi.mocked(createClient).mockResolvedValue({ auth: { getUser, signOut } } as never);
  vi.mocked(createVerifier).mockReturnValue({ auth: { signInWithPassword: signIn, signOut } } as never);
  vi.mocked(deleteAccount).mockResolvedValue(undefined);
});
const request = (body: unknown = { confirmation: 'DELETE', password: 'test-pass' }, origin = 'https://captuto.test') => new Request('https://captuto.test/api/account', { method: 'DELETE', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
it('rejects cross-origin deletion', async () => {
  expect((await DELETE(request(undefined, 'https://other.test'))).status).toBe(403);
  expect(deleteAccount).not.toHaveBeenCalled();
});
it('requires a signed-in owner', async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  expect((await DELETE(request())).status).toBe(401); expect(deleteAccount).not.toHaveBeenCalled();
});
it('requires explicit confirmation and a password', async () => {
  expect((await DELETE(request({ confirmation: 'yes', password: '' }))).status).toBe(400);
  expect(signIn).not.toHaveBeenCalled();
});
it('does not accept a password verification for a different identity', async () => {
  signIn.mockResolvedValue({ data: { user: { id: 'other' } }, error: null });
  expect((await DELETE(request())).status).toBe(403); expect(deleteAccount).not.toHaveBeenCalled();
});
it('derives the deleted identity from the session, never the body', async () => {
  const response = await DELETE(request({ confirmation: 'DELETE', password: 'test-pass', userId: 'victim' }));
  expect(response.status).toBe(200); expect(deleteAccount).toHaveBeenCalledWith('owner');
});
it('reports partial failure instead of claiming success', async () => {
  vi.mocked(deleteAccount).mockRejectedValue(new Error('Storage failed'));
  expect((await DELETE(request())).status).toBe(503);
});
