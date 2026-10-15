'use client';

import { useEffect } from 'react';
import { identifyUser, initPostHog, resetUser } from '@/lib/analytics/posthog';
import { createClient } from '@/lib/supabase/client';

/** Starts PostHog and keeps the PostHog person in sync with the Supabase session. */
export function PostHogAnalytics() {
  useEffect(() => {
    if (!initPostHog()) return;
    const { data: { subscription } } = createClient().auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') resetUser();
      else if (session?.user && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED')) identifyUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  return null;
}
