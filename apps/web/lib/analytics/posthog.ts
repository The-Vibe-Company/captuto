import posthog from 'posthog-js';
import type { User } from '@supabase/supabase-js';

// Public project key ("Captuto", US cloud). Safe to ship in client code.
const DEFAULT_POSTHOG_KEY = 'phc_ncQSq3PBKjL6NtRCRVRetXogP45JRd5QKsRu4RQUuNts';

let initialized = false;

/** Local dev and tests stay silent unless NEXT_PUBLIC_POSTHOG_KEY is set explicitly. */
export function resolvePostHogKey(env: { key?: string; nodeEnv?: string } = {
  key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  nodeEnv: process.env.NODE_ENV,
}): string | undefined {
  if (env.key) return env.key;
  return env.nodeEnv === 'production' ? DEFAULT_POSTHOG_KEY : undefined;
}

export function initPostHog(): boolean {
  if (initialized || typeof window === 'undefined') return initialized;
  const key = resolvePostHogKey();
  if (!key) return false;
  posthog.init(key, {
    // Same-origin proxy (see next.config.mjs rewrites) so ad blockers don't drop events.
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || '/ingest',
    ui_host: 'https://us.posthog.com',
    // App Router navigations are pushState calls; capture them as pageviews too.
    capture_pageview: 'history_change',
  });
  initialized = true;
  return true;
}

export function identifyUser(user: Pick<User, 'id' | 'email' | 'user_metadata'>) {
  if (!initialized) return;
  const name = user.user_metadata?.full_name ?? user.user_metadata?.name;
  posthog.identify(user.id, {
    ...(user.email ? { email: user.email } : {}),
    ...(typeof name === 'string' && name ? { name } : {}),
  });
}

export function resetUser() {
  if (initialized) posthog.reset();
}

/** Supabase returns a user with no identities when the email is already registered. */
export function captureSignedUp(user: Pick<User, 'id' | 'email' | 'user_metadata' | 'identities'>) {
  if (!initialized || !user.identities?.length) return;
  identifyUser(user);
  posthog.capture('signed_up');
}
