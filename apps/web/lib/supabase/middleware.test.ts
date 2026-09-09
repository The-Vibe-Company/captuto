import { expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } })),
}));

import { updateSession } from './middleware';

it('returns an anonymous editor visitor to their recording after login', async () => {
  const response = await updateSession(new NextRequest('https://captuto.test/editor/recording-id?source=desktop'));
  const destination = new URL(response.headers.get('location')!);
  expect(destination.pathname).toBe('/login');
  expect(destination.searchParams.get('next')).toBe('/editor/recording-id?source=desktop');
});

it('keeps deletion retries accessible while blocking editing and API mutations', async () => {
  const { createServerClient } = await import('@supabase/ssr');
  vi.mocked(createServerClient).mockReturnValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'deleting@example.test', app_metadata: { account_deletion_pending: true } } } }) } } as never);
  const editor = await updateSession(new NextRequest('https://captuto.test/editor/guide'));
  expect(editor.headers.get('location')).toBe('https://captuto.test/settings#account');
  const upload = await updateSession(new NextRequest('https://captuto.test/api/upload', { method: 'POST' }));
  expect(upload.status).toBe(403);
  const retry = await updateSession(new NextRequest('https://captuto.test/api/account', { method: 'DELETE' }));
  expect(retry.status).toBe(200);
  const settings = await updateSession(new NextRequest('https://captuto.test/settings'));
  expect(settings.status).toBe(200);
});
