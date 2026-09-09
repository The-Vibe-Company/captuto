import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe/server';

const BUCKETS = ['screenshots', 'recordings', 'screenshots-flattened'] as const;
type Admin = ReturnType<typeof createAdminClient>;

/** Delete one owner prefix in bounded pages; do not skip entries as the list shrinks. */
export async function removeOwnerFiles(admin: Admin, bucket: string, prefix: string, budget = { pages: 0 }): Promise<void> {
  const storage = admin.storage.from(bucket);
  for (;;) {
    if (++budget.pages > 10000) throw new Error('Cleanup needs another attempt.');
    const { data, error } = await storage.list(prefix, { limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } });
    if (error || !data) throw new Error('Could not list stored files.');
    if (!data.length) return;
    const files: string[] = [];
    for (const item of data) {
      if (!item.name || item.name === '.' || item.name === '..' || item.name.includes('/')) throw new Error('Unexpected storage path.');
      const path = `${prefix}/${item.name}`;
      if (item.id) files.push(path);
      else await removeOwnerFiles(admin, bucket, path, budget);
    }
    if (files.length) {
      const { error } = await storage.remove(files);
      if (error) throw new Error('Could not remove stored files.');
    }
  }
}

/** Account remains authenticated for retry until the final auth deletion succeeds. */
export async function deleteAccount(userId: string) {
  const admin = createAdminClient();
  // Require the write guard migration before making any irreversible changes.
  const { error: guardError } = await admin.rpc('account_deletion_guard_ready' as never);
  if (guardError) throw new Error('Account deletion is temporarily unavailable. Please contact support.');

  // Keep durable state in trusted app metadata; users cannot clear it themselves.
  const { error: markError } = await admin.auth.admin.updateUserById(userId, { app_metadata: { account_deletion_pending: true } });
  if (markError) throw new Error('Could not start account deletion.');

  const { error: visibilityError } = await admin.from('tutorials').update({ visibility: 'private', is_public: false }).eq('user_id', userId);
  if (visibilityError) throw new Error('Could not disable shared guides.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: tokenError } = await (admin as any).from('api_tokens').delete().eq('user_id', userId);
  if (tokenError) throw new Error('Could not disconnect recorders and agents.');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: billing, error: billingError } = await (admin as any).from('billing_customers').select('stripe_customer_id').eq('user_id', userId).maybeSingle();
  if (billingError) throw new Error('Could not check subscriptions.');
  if (billing?.stripe_customer_id) {
    const stripe = getStripe();
    // Include past_due, unpaid, paused and trial subscriptions, and scheduled checkouts.
    for await (const checkout of stripe.checkout.sessions.list({ customer: billing.stripe_customer_id, status: 'open', limit: 100 })) {
      await stripe.checkout.sessions.expire(checkout.id);
    }
    for await (const subscription of stripe.subscriptions.list({ customer: billing.stripe_customer_id, status: 'all', limit: 100 })) {
      if (!['canceled', 'incomplete_expired'].includes(subscription.status)) {
        await stripe.subscriptions.cancel(subscription.id, { invoice_now: false, prorate: false });
      }
    }
    // Financial records are retained in Stripe; do not delete invoices or promise a refund.
  }

  for (const bucket of BUCKETS) await removeOwnerFiles(admin, bucket, userId);
  // FK cascades remove tutorials, sources, steps, API tokens, pairing and billing mapping.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error('Could not finish account deletion.');
}
