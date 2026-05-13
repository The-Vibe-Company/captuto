import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAppUrl, getStripe, getStripePriceId, isStripeConfigured } from '@/lib/stripe/server';

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  const priceId = getStripePriceId();
  const appUrl = getAppUrl();
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: billingRow, error: billingError } = await (admin as any)
    .from('billing_customers')
    .select('stripe_customer_id, stripe_subscription_status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (billingError) {
    console.error('Failed to fetch billing customer:', billingError);
    return NextResponse.json(
      { error: 'Failed to prepare checkout' },
      { status: 500 }
    );
  }

  if (
    billingRow?.stripe_customer_id &&
    ACTIVE_STATUSES.has(billingRow.stripe_subscription_status)
  ) {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: billingRow.stripe_customer_id,
      return_url: `${appUrl}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  }

  let stripeCustomerId = billingRow?.stripe_customer_id as string | undefined;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: {
        supabase_user_id: user.id,
      },
    });
    stripeCustomerId = customer.id;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (admin as any)
      .from('billing_customers')
      .upsert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
      });

    if (upsertError) {
      console.error('Failed to save Stripe customer:', upsertError);
      return NextResponse.json(
        { error: 'Failed to prepare checkout' },
        { status: 500 }
      );
    }
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    client_reference_id: user.id,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    success_url: `${appUrl}/settings?billing=success`,
    cancel_url: `${appUrl}/settings?billing=cancelled`,
    metadata: {
      supabase_user_id: user.id,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
      },
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
