# Password recovery and account deletion

Implemented on 2026-09-09. These flows use the existing Supabase email/password
accounts and the existing shadcn components.

## Password recovery

`/login` and Settings link to `/forgot-password`. Supabase sends a recovery email
whose redirect is `/auth/callback?next=/reset-password`. The callback exchanges the
PKCE code and the reset page accepts a matching password of at least eight
characters. Success signs out refresh sessions and returns the user to sign-in.
Invalid or expired links offer a new request; the email request does not disclose
whether an account exists. Open the email in the browser that requested it.

Before production rollout, verify Supabase Auth's redirect allowlist includes
`https://captuto.com/auth/callback?next=/reset-password`, and that the recovery
email template uses `{{ .ConfirmationURL }}` with working SMTP delivery. Local
redirects are included in `supabase/config.toml`. No production settings or SMTP
configuration were changed as part of this implementation.

Reference: [Supabase password recovery](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail).

## Account deletion

Settings → Account requires the current password and the exact word `DELETE`.
`DELETE /api/account` accepts same-origin authenticated requests and derives the
owner exclusively from the session. An independent auth client verifies identity.

Apply `20260909130000_account_deletion_guards.sql` before enabling deletion. The
endpoint checks its readiness RPC and fails without deleting anything if absent.
The normal migration pipeline applies it; no manual production deployment occurred.

The service marks the account as pending in trusted app metadata, disables shared
guides and API tokens, expires open Stripe checkouts and cancels live subscriptions,
then removes the owner's entire prefix in screenshots, recordings and flattened
screenshots. Auth deletion happens last; database foreign keys cascade dependent
rows. Financial records remain in Stripe, and this operation does not issue refunds.
Local downloads and recorder files on the user's devices are outside its scope.

Failure leaves a durable pending state and authenticated access to Settings for a
retry. Uploading and editing remain blocked. Restrictive RLS checks current auth
state, including for old JWTs; content and storage triggers also reject in-flight service-role writes for missing
or pending owners. Row locks serialize writes with the account freeze; cleanup may
only privatize existing guides. A late Stripe webhook cancels a subscription
for a pending/deleted owner instead of recreating billing data. Auth outages return
a retryable webhook error rather than being mistaken for a deleted user.

Reference: [Supabase user deletion constraints](https://supabase.com/docs/guides/auth/managing-user-data),
[Stripe subscription cancellation](https://docs.stripe.com/billing/subscriptions/cancel).

## Validation

Automated tests cover identity verification, missing migration, cleanup ordering,
paginated/nested files, partial failure and retry access, recovery callbacks and
late billing webhooks. Browser tests use agent-browser and an isolated Supabase
backend with Mailpit, not live email or customer data. Recovery succeeded through
a real local email link, password mismatch was rejected and the new password
worked at sign-in. Deleting a disposable account removed its auth record, guides,
tokens and nested files in all three buckets while preserving another user's data.
A preexisting JWT was rejected after marking its owner pending. Storage rejected
a service-role upload after owner deletion.

Production email delivery and live Stripe cancellation still require validation
in their configured environments. Company identity, privacy contacts, retention
policy and commercial terms are needed before publishing legal documents.

The retry flow was also exercised in the browser after simulating the durable
pending state: login led to Settings, unrelated settings were hidden, and retry
completed deletion. A stale JWT remained unable to insert guides after deletion.
All three disposable test accounts were removed afterward.

Database regression: `supabase test db` exercises 14 assertions covering privileged
late writes, isolation between owners and cascades for original guides, revisions,
sources and linked steps. CI runs these tests after applying migrations.
