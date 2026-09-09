'use client';
import { createClient } from '@/lib/supabase/client';
import { AccountSettings } from '@/components/settings-account';
import { AgentConnection } from '@/components/settings-agent';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Key,
  Loader2,
  Monitor,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface BillingStatus {
  configured: boolean;
  hasCustomer: boolean;
  isActive: boolean;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

function BillingSection() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/status');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load billing status');
      }
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const openBillingUrl = async (endpoint: '/api/billing/checkout' | '/api/billing/portal') => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to open Stripe');
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open Stripe');
      setActionLoading(false);
    }
  };

  const billingResult = searchParams.get('billing');
  const activeLabel = status?.subscriptionStatus
    ? status.subscriptionStatus.replace(/_/g, ' ')
    : 'No active subscription';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
            <CreditCard className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <CardTitle className="text-base">Billing</CardTitle>
            <CardDescription>
              Manage your Captuto subscription with Stripe
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {billingResult === 'success' && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Checkout completed. Stripe will update your subscription status shortly.
          </div>
        )}

        {billingResult === 'cancelled' && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Checkout was cancelled. No changes were made.
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-stone-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading billing status...
          </div>
        ) : status?.configured === false ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">
              Subscriptions are currently unavailable.
            </p>
            <p className="mt-1 text-sm text-amber-700">
              Please try again later or contact support if you need help with billing.
            </p>
          </div>
        ) : status ? (
          <>
            <div className="rounded-lg border bg-stone-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium capitalize text-stone-900">
                    {activeLabel}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {status?.isActive
                      ? status.cancelAtPeriodEnd
                        ? 'Your subscription remains active until the end of the billing period.'
                        : 'Your subscription is active.'
                      : 'Start a subscription to enable paid features.'}
                  </p>
                </div>
                {status?.isActive && (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Active
                  </span>
                )}
              </div>
              {status?.currentPeriodEnd && (
                <p className="mt-3 text-xs text-stone-500">
                  Current period ends{' '}
                  {new Date(status.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>

            <Button
              onClick={() =>
                openBillingUrl(status?.isActive ? '/api/billing/portal' : '/api/billing/checkout')
              }
              disabled={actionLoading}
              className="w-full gap-2"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              {status?.isActive ? 'Manage billing' : 'Start subscription'}
            </Button>
          </>
        ) : <Button variant="outline" onClick={fetchStatus}>Retry billing status</Button>}
      </CardContent>
    </Card>
  );
}

interface ApiToken {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

function ApiTokensSection() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      setTokenError('');
      const res = await fetch('/api/tokens');
      if (!res.ok) throw new Error('Could not load connections. Please try again.');
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens || []);
      }
    } catch {
      setTokenError('Could not load connections. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const generateToken = async () => {
    setGenerating(true);
    setTokenError('');
    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Agent connection' }),
      });
      if (!res.ok) throw new Error('Could not create a token. Please try again.');
      if (res.ok) {
        const data = await res.json();
        setNewToken(data.token);
        fetchTokens();
      }
    } catch {
      setTokenError('Could not create a token. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const revokeToken = async (id: string) => {
    setRevoking(id);
    setTokenError('');
    try {
      const res = await fetch(`/api/tokens?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not revoke this connection.');
      if (res.ok) {
        setTokens(tokens.filter((t) => t.id !== id));
      }
    } catch {
      setTokenError('Could not revoke this connection. It is still active.');
    } finally { setRevoking(null); }
  };

  const copyToken = async () => {
    if (newToken) {
      try { await navigator.clipboard.writeText(newToken); } catch { setTokenError('Could not copy. Select the token and copy it manually.'); return; }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
            <Key className="h-5 w-5 text-brand-600" />
          </div>
          <div>
            <CardTitle className="text-base">API Tokens</CardTitle>
            <CardDescription>
              Manage recorder and optional AI-agent connections
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {tokenError && <p role="alert" className="text-sm text-destructive">{tokenError} <Button variant="link" onClick={fetchTokens}>Reload connections</Button></p>}
        {/* New token display */}
        {newToken && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="mb-2 text-sm font-medium text-green-800">
              Token created! Copy it now — you won&apos;t see it again.
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded bg-white px-3 py-2 font-mono text-xs text-green-900 border">
                {newToken}
              </code>
              <Button
                variant="outline"
                size="sm"
                aria-label="Copy API token"
                onClick={copyToken}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-green-600">
              For an AI agent, set this token as CAPTUTO_API_TOKEN in its environment. Keep it private.
            </p>
          </div>
        )}

        {/* Existing tokens */}
        {loading ? (
          <p className="text-sm text-stone-400">Loading tokens...</p>
        ) : tokens.length > 0 ? (
          <div className="space-y-2">
            {tokens.map((token) => (
              <div
                key={token.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Monitor className="h-4 w-4 text-stone-400" />
                  <div>
                    <p className="text-sm font-medium text-stone-700">
                      {token.name}
                    </p>
                    <p className="text-xs text-stone-400">
                      Created{' '}
                      {new Date(token.created_at).toLocaleDateString()}
                      {token.last_used_at && (
                        <>
                          {' · '}Last used{' '}
                          {new Date(token.last_used_at).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Revoke ${token.name}`}
                  disabled={revoking !== null}
                  onClick={() => revokeToken(token.id)}
                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-400">
            No connections yet. The Mac app connects through your browser; create a token only if you want to connect an AI agent.
          </p>
        )}

        {/* Generate button */}
        <Button
          onClick={generateToken}
          disabled={generating}
          variant="outline"
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          {generating ? 'Generating...' : 'Generate New Token'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const [deletionPending, setDeletionPending] = useState<boolean | null>(null);
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setDeletionPending(data.user?.app_metadata.account_deletion_pending === true);
    }).catch(() => setDeletionPending(false));
  }, []);
  return (
    <div>
      {/* Back link */}
      {deletionPending === false && <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center text-sm text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to dashboard
      </Link>}

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
        <p className="mt-1 text-sm text-stone-500">
          Manage your preferences and account settings
        </p>
      </div>

      {deletionPending === null && <p role="status">Loading account settings…</p>}
      {deletionPending === false && <><AgentConnection />
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <BillingSection />
        <ApiTokensSection />
      </div>
      </>}
      <AccountSettings pending={deletionPending === true} onPendingChange={setDeletionPending} />
    </div>
  );
}
