import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('posthog-js', () => ({
  default: { init: vi.fn(), identify: vi.fn(), reset: vi.fn(), capture: vi.fn() },
}));

async function load() {
  vi.resetModules();
  const posthog = (await import('posthog-js')).default;
  const analytics = await import('./posthog');
  return { posthog, ...analytics };
}

const user = { id: 'user-1', email: 'a@b.co', user_metadata: {}, identities: [{ id: 'identity-1' }] } as never;

describe('posthog analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('only falls back to the public key in production builds', async () => {
    const { resolvePostHogKey } = await load();
    expect(resolvePostHogKey({ nodeEnv: 'development' })).toBeUndefined();
    expect(resolvePostHogKey({ nodeEnv: 'test' })).toBeUndefined();
    expect(resolvePostHogKey({ nodeEnv: 'production' })).toMatch(/^phc_/);
    expect(resolvePostHogKey({ key: 'phc_custom', nodeEnv: 'development' })).toBe('phc_custom');
  });

  it('stays disabled without an explicit key outside production', async () => {
    vi.stubGlobal('window', {});
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
    const { posthog, initPostHog, identifyUser, resetUser, captureSignedUp } = await load();
    expect(initPostHog()).toBe(false);
    identifyUser(user); resetUser(); captureSignedUp(user);
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.identify).not.toHaveBeenCalled();
    expect(posthog.reset).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('initialises once with history pageviews and the /ingest proxy', async () => {
    vi.stubGlobal('window', {});
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', '');
    const { posthog, initPostHog } = await load();
    expect(initPostHog()).toBe(true);
    expect(initPostHog()).toBe(true);
    expect(posthog.init).toHaveBeenCalledTimes(1);
    expect(posthog.init).toHaveBeenCalledWith('phc_test', expect.objectContaining({
      api_host: '/ingest', ui_host: 'https://us.posthog.com', capture_pageview: 'history_change',
    }));
  });

  it('identifies users, resets on logout, and captures new sign-ups only', async () => {
    vi.stubGlobal('window', {});
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    const { posthog, initPostHog, identifyUser, resetUser, captureSignedUp } = await load();
    initPostHog();

    identifyUser({ id: 'user-2', email: 'c@d.co', user_metadata: { full_name: 'Ada' } } as never);
    expect(posthog.identify).toHaveBeenCalledWith('user-2', { email: 'c@d.co', name: 'Ada' });

    resetUser();
    expect(posthog.reset).toHaveBeenCalledTimes(1);

    captureSignedUp({ ...(user as object), identities: [] } as never);
    expect(posthog.capture).not.toHaveBeenCalled();

    captureSignedUp(user);
    expect(posthog.identify).toHaveBeenLastCalledWith('user-1', { email: 'a@b.co' });
    expect(posthog.capture).toHaveBeenCalledWith('signed_up');
  });
});
